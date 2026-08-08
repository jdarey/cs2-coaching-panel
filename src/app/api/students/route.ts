import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
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
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może dodawać uczniów' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email i hasło są wymagane' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Check if user exists
    let student = await prisma.user.findUnique({ where: { email } })

    if (student) {
      // User exists - link as student if not already linked
      if (student.coachId === userId) {
        return NextResponse.json({ error: 'Uczeń już jest przypisany' }, { status: 400 })
      }
      if (student.coachId && student.coachId !== userId) {
        return NextResponse.json({ error: 'Uczeń należy do innego trenera' }, { status: 400 })
      }

      student = await prisma.user.update({
        where: { id: student.id },
        data: { coachId: userId, role: 'STUDENT' },
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      }) as any
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
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      }) as any
    }

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Students POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania ucznia' }, { status: 500 })
  }
}