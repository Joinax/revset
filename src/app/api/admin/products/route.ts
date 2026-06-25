import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit-log'
import { generateProductBundle } from '@/lib/generate-product-bundle'

const schema = z.object({
  productId: z.string().min(1).max(50),
  action:    z.enum(['retry_bundle']),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const currentUser = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, isBanned: true },
  })
  if (!currentUser || currentUser.isBanned || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { productId, action } = parsed.data

  const product = await db.product.findUnique({
    where:  { id: productId },
    select: { id: true, moderationStatus: true, name: true },
  })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  if (action === 'retry_bundle') {
    if (product.moderationStatus !== 'BUNDLE_FAILED') {
      return NextResponse.json({ error: 'Повторная генерация возможна только при статусе BUNDLE_FAILED' }, { status: 400 })
    }

    await db.product.update({
      where: { id: productId },
      data:  { moderationStatus: 'BUILDING_BUNDLE' },
    })

    generateProductBundle(productId).catch(err =>
      console.error(`[admin/products] retry bundle failed for ${productId}:`, err)
    )

    await logAdminAction({
      adminId:    session.user.id,
      action:     'product.approve_pending_bundle',
      targetType: 'Product',
      targetId:   productId,
      details:    { retry: true, productName: product.name },
    })

    return NextResponse.json({ ok: true })
  }
}
