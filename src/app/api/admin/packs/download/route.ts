import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { s3, S3_BUCKET } from '@/lib/s3'

// GET /api/admin/packs/download?packId=...&type=assembly|pdf
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const packId = req.nextUrl.searchParams.get('packId')
  const type   = req.nextUrl.searchParams.get('type') // 'assembly' | 'pdf'
  if (!packId || !type) {
    return NextResponse.json({ error: 'packId and type required' }, { status: 400 })
  }

  const pack = await db.pack.findUnique({ where: { id: packId } })
  if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

  const fileKey = type === 'pdf' ? pack.pdfKey : pack.assemblyFileKey
  if (!fileKey) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const safeName = pack.name.replace(/[";\r\n]/g, '_')
  const ext      = type === 'pdf' ? 'pdf' : fileKey.split('.').pop() ?? 'rvt'

  const command = new GetObjectCommand({
    Bucket:                     S3_BUCKET,
    Key:                        fileKey,
    ResponseContentDisposition: `attachment; filename="${safeName}.${ext}"`,
  })

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return NextResponse.json({ downloadUrl })
}
