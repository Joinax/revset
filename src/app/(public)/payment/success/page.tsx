// src/app/payment/success/page.tsx
import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams

  const session = await auth.api.getSession({ headers: await headers() })

  const order = orderId ? await db.order.findUnique({
    where:   { id: orderId },
    include: { items: { include: { product: true } } },
  }) : null

  // Очищаем корзину от оплаченных товаров
  if (order?.status === 'PAID' && session?.user) {
    const cart = await db.cart.findUnique({ where: { userId: session.user.id } })
    if (cart) {
      await db.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId: { in: order.items.map(i => i.product?.id).filter((id): id is string => id != null) },
        },
      })
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)', padding: '40px 24px',
        textAlign: 'center',
      }}>
        {order?.status === 'PAID' ? (
          <>
            {/* Успех */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(29,158,117,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <i className="ti ti-check" style={{ fontSize: '32px', color: '#1D9E75' }} />
            </div>

            <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Оплата прошла успешно!</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
              Спасибо за покупку. Модели доступны в вашем кабинете.
            </p>

            {order.items.map(item => (
              <div key={item.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '8px', minWidth: '300px',
              }}>
                <span style={{ fontSize: '28px' }}>{item.product?.previewEmoji ?? '📦'}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.product?.name}</div>
                  <div style={{ fontSize: '12px', color: '#1D9E75', fontWeight: 600 }}>Оплачено · {Number(item.price)} ₽</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/account" className="btn-primary">Перейти в кабинет</Link>
              <Link href="/catalog" className="btn-outline">Продолжить покупки</Link>
            </div>
          </>
        ) : (
          <>
            {/* Ожидание или ошибка */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <i className="ti ti-clock" style={{ fontSize: '32px', color: '#F59E0B' }} />
            </div>

            <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>Обрабатываем платёж...</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
              Платёж обрабатывается. Обычно это занимает несколько секунд.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/account" className="btn-primary">Перейти в кабинет</Link>
              <Link href="/catalog" className="btn-outline">В каталог</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
