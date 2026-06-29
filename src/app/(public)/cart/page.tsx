// src/app/cart/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import CartClient, { type CartItem } from './CartClient'

export default async function CartPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { addedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true, name: true, price: true, priceOld: true,
              previewEmoji: true, previewBg: true, images: true,
              author: { select: { id: true, name: true } },
              category: { select: { name: true } },
            },
          },
          pack: {
            select: {
              id: true, name: true, price: true,
              images: { orderBy: { position: 'asc' as const }, take: 1 },
              author: { select: { id: true, name: true } },
              _count: { select: { products: true } },
            },
          },
        },
      },
    },
  })

  const items: CartItem[] = (cart?.items ?? []).flatMap((i): CartItem[] => {
    if (i.product) {
      return [{
        kind:      'product' as const,
        id:        i.id,
        productId: i.product.id,
        name:      i.product.name,
        price:     Number(i.product.price),
        priceOld:  i.product.priceOld !== null ? Number(i.product.priceOld) : null,
        emoji:     i.product.previewEmoji ?? '📦',
        previewBg: i.product.previewBg ?? '#141420',
        images:    i.product.images ?? [],
        author:    i.product.author.name ?? 'Автор',
        authorId:  i.product.author.id,
        category:  i.product.category.name,
      }]
    }
    if (i.pack) {
      return [{
        kind:       'pack' as const,
        id:         i.id,
        packId:     i.pack.id,
        name:       i.pack.name,
        price:      Number(i.pack.price),
        coverImage: i.pack.images[0]?.key ?? null,
        author:     i.pack.author.name ?? 'Автор',
        authorId:   i.pack.author.id,
        cardCount:  i.pack._count.products,
      }]
    }
    return []
  })

  return <CartClient items={items} />
}
