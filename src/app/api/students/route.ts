import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { isCoachRole } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Tylko trener może zarządzać uczniami' }, { status: 403 })
    }

    const userId = (session.user as any).id

    const students = await prisma.user.findMany({
      where: { coachId: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { sessionsAsStudent: true, videoProgress: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Add stats for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const progress = await prisma.videoProgress.findMany({
          where: { userId: student.id },
          select: { status: true },
        })

        const stats = {
          total: progress.length,
          pending: progress.filter((p) => p.status === 'PENDING').length,
          watching: progress.filter((p) => p.status === 'WATCHING').length,
          watched: progress.filter((p) => p.status === 'WATCHED').length,
          implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
        }

        return { ...student, progressStats: stats }
      })
    )

    return NextResponse.json(studentsWithStats)
  } catch (error) {
    console.error('Students GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania uczniów' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Tylko trener może dodawać uczniów' }, { status: 403 })
    }

    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : null
    const password = String(body?.password || '')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Podaj poprawny email' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Hasło musi mieć min. 8 znaków' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Check if user exists
    let student = await prisma.user.findUnique({ where: { email } })

    if (student) {
      // Istniejące konto — NIGDY nie przejmuj po cichu (trasowałoby cudze
      // konto, a nawet rolę). Właściciel konta dopina się sam przez zaproszenie.
      if (student.coachId === userId) {
        return NextResponse.json({ error: 'Uczeń już jest przypisany' }, { status: 400 })
      }
      if (student.coachId && student.coachId !== userId) {
        return NextResponse.json({ error: 'Uczeń należy do innego trenera' }, { status: 400 })
      }
      return NextResponse.json(
        { error: 'Konto z tym emailem już istnieje — wyślij zaproszenie, uczeń dopnie się sam' },
        { status: 409 },
      )
    } else {
      // Create new student
      const passwordHash = await bcrypt.hash(password, 12)
      student = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'STUDENT',
          coachId: userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { sessionsAsStudent: true, videoProgress: true } },
        },
      }) as any
    }

    // Shape must match GET /api/students — the coach UI renders
    // progressStats.* and _count.* for every row right after creation.
    return NextResponse.json(
      { ...student, progressStats: { total: 0, pending: 0, watching: 0, watched: 0, implemented: 0 } },
      { status: 201 },
    )
  } catch (error) {
    console.error('Students POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania ucznia' }, { status: 500 })
  }
}