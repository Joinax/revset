// src/app/api/maintenance-status/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const setting = await db.setting.findUnique({ where: { key: 'maintenance_mode' } })
  return NextResponse.json({ maintenance: setting?.value === 'true' })
}
