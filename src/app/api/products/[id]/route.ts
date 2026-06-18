// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

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

    // Проверяем что товар принадлежит этому автору, либо это администратор
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

    // Помимо совпадения authorId, требуем актуальную роль 'author' — если статус
    // автора был отозван администратором, доступ к редактированию своих старых
    // товаров тоже должен закрыться, а не только UI вкладок в /account
    const isOwner = product.authorId === session.user.id && currentRole === 'author'
    const isAdmin = currentRole === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { name, description, price, categorySlug, revitVersions, isPublished, isNew, fileKey, fileName, asAdmin, moderationComment, images } = await req.json()

    // Находим категорию
    const category = await db.category.findUnique({ where: { slug: categorySlug } })
    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 })
    }

    // Запоминаем старое значение публикации — для лога, если меняет админ
    const wasPublished = product.isPublished
    const willBePublished = isPublished ?? true

    // Запрос пришёл из админ-панели и пользователь реально админ — это решение модератора,
    // даже если админ оказался автором этого же товара (тогда isOwner тоже true)
    const adminActing = isAdmin && asAdmin === true

    // Определяем moderationStatus в зависимости от того, кто меняет публикацию
    let moderationStatus = product.moderationStatus
    if (adminActing) {
      // Админ явно решает — одобряет или отклоняет
      moderationStatus = willBePublished ? 'APPROVED' : 'REJECTED'
    } else if (isOwner) {
      if (!willBePublished) {
        // Автор сам снял с публикации — это черновик, не отклонение
        moderationStatus = 'DRAFT'
      } else {
        // Автор пытается опубликовать — смотрим на autoPublish
        const authorProfile = await db.authorProfile.findUnique({
          where: { userId: session.user.id },
          select: { autoPublish: true },
        })
        moderationStatus = authorProfile?.autoPublish ? 'APPROVED' : 'PENDING'
      }
    }

    // Реальная публикация на сайте — только если статус APPROVED
    const actuallyPublished = moderationStatus === 'APPROVED'

    // Комментарий модератора имеет смысл только при отклонении — при любом
    // другом статусе старый комментарий устарел и его нужно убрать
    const nextModerationComment = moderationStatus === 'REJECTED'
      ? (moderationComment ?? product.moderationComment ?? null)
      : null

    // Обновляем товар
    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        description:   description || null,
        price:         price && parseFloat(price) > 0 ? parseFloat(price) : null,
        categoryId:    category.id,
        revitVersions: revitVersions || [],
        ...(images !== undefined && { images }),
        isPublished:   actuallyPublished,
        moderationStatus,
        moderationComment: nextModerationComment,
        ...(isNew !== undefined && { isNew }),
        // Обновляем файл только если загрузили новый
        ...(fileKey && {
          bimParams: JSON.stringify({ fileKey, fileName }),
        }),
      },
    })

    // Логируем действия администратора над товаром через админ-панель
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

      // Уведомляем автора только если решение по статусу реально изменилось
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

    // Инвалидируем кэш страниц, где отображается статус/публикация товара —
    // иначе при навигации (особенно "назад") Next.js Router Cache может
    // показать старые данные ещё до истечения staleTime
    revalidatePath('/admin/families')
    revalidatePath(`/admin/families/${id}`)
    revalidatePath(`/product/${id}`)
    revalidatePath('/catalog')
    revalidatePath('/')

    return NextResponse.json({ productId: updated.id })

  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
