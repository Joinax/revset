// src/app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/audit-log'

// Простая транслитерация кириллицы — нужна для генерации slug
// из названий категорий вроде "Мебель", "Сантехника" и т.д.
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(name: string): string {
  const transliterated = name
    .toLowerCase()
    .split('')
    .map(ch => CYRILLIC_MAP[ch] ?? ch)
    .join('')

  const slug = transliterated
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Если после очистки ничего не осталось (например, эмодзи или цифры из других систем) —
  // fallback на случайный идентификатор, чтобы не создавать категории с пустым slug
  return slug || `category-${Date.now()}`
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Роль и бан проверяем из БД — сессия может содержать устаревшую роль
  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { name?: string; emoji?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, emoji } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Укажите название категории' }, { status: 400 })
  }

  const slug = slugify(name)

  try {
    const maxOrder = await db.category.aggregate({ _max: { order: true } })

    const category = await db.category.create({
      data: { name: name.trim(), slug, emoji: emoji ?? '📦', order: (maxOrder._max.order ?? 0) + 1 },
    })

    await logAdminAction({
      adminId: session.user.id,
      action: 'category.create',
      targetType: 'Category',
      targetId: category.id,
      details: { name: category.name, slug: category.slug },
    })

    return NextResponse.json(category)
  } catch (err: any) {
    // Уникальное ограничение на slug или name
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Категория с таким названием уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Не удалось создать категорию' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Роль и бан проверяем из БД — сессия может содержать устаревшую роль
  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { id } = body
  if (!id) {
    return NextResponse.json({ error: 'ID категории не указан' }, { status: 400 })
  }

  // Проверяем, есть ли товары в этой категории — удалять такую категорию нельзя,
  // иначе у товаров останется "битый" categoryId
  const productsCount = await db.product.count({ where: { categoryId: id } })
  if (productsCount > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить категорию: в ней ${productsCount} семейств. Сначала перенесите их в другую категорию.` },
      { status: 409 }
    )
  }

  try {
    const category = await db.category.delete({ where: { id } })

    await logAdminAction({
      adminId: session.user.id,
      action: 'category.delete',
      targetType: 'Category',
      targetId: id,
      details: { name: category.name, slug: category.slug },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Не удалось удалить категорию' }, { status: 500 })
  }
}
