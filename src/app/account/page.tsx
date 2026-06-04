// src/app/account/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  // Получаем сессию на сервере
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect('/login')

  // Загружаем данные пользователя из БД
  const [user, orders, favorites] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      include: { authorProfile: true },
    }),
    db.order.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
    }),
    db.favorite.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    }),
  ])

  if (!user) redirect('/login')

  return (
    <AccountClient
      user={{
        id:        user.id,
        name:      user.name,
        email:     user.email,
        image:     user.image,
        role:      user.role,
        createdAt: user.createdAt.toISOString(),
        isAuthor:  !!user.authorProfile,
      }}
      orders={orders.map(o => ({
        id:          o.id,
        status:      o.status,
        totalAmount: o.totalAmount,
        createdAt:   o.createdAt.toISOString(),
        items:       o.items.map(i => ({
          id:    i.id,
          price: i.price,
          product: {
            id:           i.product.id,
            name:         i.product.name,
            previewEmoji: i.product.previewEmoji ?? '📦',
            previewBg:    i.product.previewBg    ?? '#141420',
          },
        })),
      }))}
      favorites={favorites.map(f => ({
        id: f.id,
        product: {
          id:           f.product.id,
          name:         f.product.name,
          price:        f.product.price,
          previewEmoji: f.product.previewEmoji ?? '📦',
          previewBg:    f.product.previewBg    ?? '#141420',
        },
      }))}
    />
  )
}
