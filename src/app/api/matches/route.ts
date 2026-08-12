import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Attach links to the original match: Faceit matches get their Faceit match
// URL (platformMatchId is the Faceit match id, which Faceit accepts as the
// room id); every synced match also gets its Leetify match page.
function withFaceitUrl(match: any) {
  const leetifyUrl = match.externalId
    ? `https://leetify.com/app/match-details/${encodeURIComponent(match.externalId)}`
    : null
  if (match.source === 'FACEIT' && match.platformMatchId) {
    return {
      ...match,
      faceitUrl: `https://www.faceit.com/en/cs2/room/${encodeURIComponent(match.platformMatchId)}`,
      leetifyUrl,
    }
  }
  return { ...match, faceitUrl: null, leetifyUrl }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)

    if (role === 'COACH') {
      // Coach: all students' matches, optionally filtered by student
      const studentId = searchParams.get('studentId')
      const myStudents = await prisma.user.findMany({
        where: { coachId: userId },
        select: { id: true },
      })
      const ids = myStudents.map((s) => s.id)
      const where: any = { studentId: { in: ids } }
      if (studentId) {
        if (!ids.includes(studentId)) {
          return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
        }
        where.studentId = studentId
      }
      const matches = await prisma.matchLog.findMany({
        where,
        include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json(matches.map(withFaceitUrl))
    }

    // Student: own matches
    const matches = await prisma.matchLog.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(matches.map(withFaceitUrl))
  } catch (error) {
    console.error('Matches GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania meczów' }, { status: 500 })
  }
}


