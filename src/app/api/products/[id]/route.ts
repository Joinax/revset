// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'
import { serializeDecimal } from '@/lib/serialize'

const ALLOWED_REVIT_VERSIONS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026']
const MAX_IMAGES = 10
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { id } = await params

    const [product, currentUser] = await Promise.all([
      db.product.findUnique({ where: { id } }),
      db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    ])
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    // Роль берём свежим запросом к БД, а не из session.user.role — у better-auth
    // роль в сессии могла закэшироваться на момент логина и не отражать
    // отзыв статуса автора администратором без повторного входа пользователя
    const currentRole = currentUser?.role ?? session.user.role

    const isOwner = product.authorId === session.user.id && currentRole === 'author'
    const isAdmin = currentRole === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name, description, price, categorySlug, revitVersions,
      isPublished, isNew, fileKey, fileName, asAdmin, moderationComment, images,
    } = body

    // --- Валидация ---

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: `Название не должно превышать ${MAX_NAME_LENGTH} символов` }, { status: 400 })
      }
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json({ error: 'Некорректное описание' }, { status: 400 })
      }
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return NextResponse.json({ error: `Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов` }, { status: 400 })
      }
    }

    if (price !== undefined && price !== null && price !== '') {
      const priceNum = parseFloat(price)
      // Товар либо бесплатный (price не передан), либо минимум 200 ₽.
      // Максимум 350 000 ₽ — разовый лимит банковской карты в ЮKassa.
      if (isNaN(priceNum) || priceNum < 200 || priceNum > 350_000) {
        return NextResponse.json({ error: 'Цена должна быть от 200 до 350 000 ₽' }, { status: 400 })
      }
    }

    if (categorySlug !== undefined) {
      if (!categorySlug || typeof categorySlug !== 'string' || categorySlug.trim().length === 0) {
        return NextResponse.json({ error: 'Категория обязательна' }, { status: 400 })
      }
    }

    if (revitVersions !== undefined) {
      if (!Array.isArray(revitVersions) || revitVersions.length === 0) {
        return NextResponse.json({ error: 'Выберите хотя бы одну версию Revit' }, { status: 400 })
      }
      if (!revitVersions.every((v: unknown) => typeof v === 'string' && ALLOWED_REVIT_VERSIONS.includes(v))) {
        return NextResponse.json({ error: 'Недопустимая версия Revit' }, { status: 400 })
      }
    }

    if (images !== undefined) {
      if (!Array.isArray(images) || images.length > MAX_IMAGES) {
        return NextResponse.json({ error: `Максимум ${MAX_IMAGES} изображений` }, { status: 400 })
      }
      if (!images.every((k: unknown) => typeof k === 'string')) {
        return NextResponse.json({ error: 'Некорректные ключи изображений' }, { status: 400 })
      }
    }

    // asAdmin может выставить только реальный администратор — автор не должен
    // иметь возможности обойти модерацию, передав asAdmin: true
    if (asAdmin === true && !isAdmin) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // moderationComment может устанавливать только администратор
    if (moderationComment !== undefined && !isAdmin) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // --- Конец валидации ---

    const category = categorySlug
      ? await db.category.findUnique({ where: { slug: categorySlug.trim() } })
      : await db.category.findUnique({ where: { id: product.categoryId } })

    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })
    }

    const wasPublished = product.isPublished
    const willBePublished = isPublished ?? product.isPublished

    const adminActing = isAdmin && asAdmin === true

    let moderationStatus = product.moderationStatus
    if (adminActing) {
      moderationStatus = willBePublished ? 'APPROVED' : 'REJECTED'
    } else if (isOwner) {
      if (!willBePublished) {
        moderationStatus = 'DRAFT'
      } else {
        const authorProfile = await db.authorProfile.findUnique({
          where: { userId: session.user.id },
          select: { autoPublish: true },
        })
        moderationStatus = authorProfile?.autoPublish ? 'APPROVED' : 'PENDING'
      }
    }

    const actuallyPublished = moderationStatus === 'APPROVED'

    const nextModerationComment = moderationStatus === 'REJECTED'
      ? (moderationComment ?? product.moderationComment ?? null)
      : null

    const parsedPrice = price !== undefined && price !== null && price !== ''
      ? parseFloat(price)
      : undefined

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(parsedPrice !== undefined && { price: parsedPrice > 0 ? parsedPrice : null }),
        categoryId:    category.id,
        ...(revitVersions !== undefined && { revitVersions }),
        ...(images !== undefined && { images }),
        isPublished:   actuallyPublished,
        moderationStatus,
        moderationComment: nextModerationComment,
        ...(isNew !== undefined && { isNew: Boolean(isNew) }),
        ...(fileKey && {
          bimParams: JSON.stringify({ fileKey: fileKey.trim(), fileName: fileName ?? null, uploadedAt: new Date().toISOString() }),
        }),
      },
    })

    if (adminActing) {
      if (wasPublished !== actuallyPublished) {
        await logAdminAction({
          adminId: session.user.id,
          action: actuallyPublished ? 'product.publish' : 'product.unpublish',
          targetType: 'Product',
          targetId: id,
          details: { productName: product.name, moderationStatus, moderationComment: nextModerationComment },
        })
      } else {
        await logAdminAction({
          adminId: session.user.id,
          action: 'product.update',
          targetType: 'Product',
          targetId: id,
          details: { productName: product.name },
        })
      }

      if (product.moderationStatus !== moderationStatus && (moderationStatus === 'APPROVED' || moderationStatus === 'REJECTED')) {
        await db.notification.create({
          data: {
            userId:  product.authorId,
            type:    moderationStatus === 'APPROVED' ? 'product_approved' : 'product_rejected',
            title:   moderationStatus === 'APPROVED' ? 'Модель опубликована' : 'Модель отклонена модератором',
            message: moderationStatus === 'APPROVED'
              ? `«${product.name}» прошла модерацию и опубликована в каталоге.`
              : nextModerationComment
                ? `«${product.name}» отклонена: ${nextModerationComment}`
                : `«${product.name}» отклонена модератором.`,
            link: '/account?tab=author-products',
          },
        })
      }
    }

    revalidatePath('/admin/families')
    revalidatePath(`/admin/families/${id}`)
    revalidatePath(`/product/${id}`)
    revalidatePath('/catalog')
    revalidatePath('/')

    return NextResponse.json(serializeDecimal({ productId: updated.id }))

  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
