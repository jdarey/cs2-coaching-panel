import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncStudentMatches } from '@/lib/matches'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role

    let studentId = userId
    if (role === 'COACH') {
      const body = await request.json().catch(() => ({}))
      if (!body.studentId) {
        return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
      }
      const student = await prisma.user.findFirst({
        where: { id: body.studentId, coachId: userId },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      studentId = body.studentId
    }

    const result = await syncStudentMatches(studentId)

    if (!result.ok) {
      // Configuration problems (Steam link, Faceit key/nickname) are the user's
      // fault and deserve a 400; a 404 means the data simply wasn't found.
      const isConfigError = /Steam|klucz|Klucz|nick|Nick|API/.test(result.error || '')
      return NextResponse.json({ error: result.error }, { status: isConfigError ? 400 : 404 })
    }

    return NextResponse.json({
      created: result.createdMatches ?? [],
      skipped: result.skipped,
      purged: result.purged,
      summary: result.verdicts ?? [],
      profile: result.profile ?? null,
      source: result.source ?? null,
      faceitKeyConfigured: result.faceitKeyConfigured ?? null,
    })
  } catch (error) {
    console.error('Faceit sync error:', error)
    return NextResponse.json({ error: 'Błąd synchronizacji Faceit' }, { status: 500 })
  }
}
