import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/health'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const result = await runHealthChecks()
  return NextResponse.json(result)
}