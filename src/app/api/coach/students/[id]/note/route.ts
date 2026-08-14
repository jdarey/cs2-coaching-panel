import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const noteSchema = z.object({
  content: z.string().max(5000),
})

async function getCoachAndStudent(studentId: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') return null
  const student = await prisma.user.findFirst({
    where: { id: studentId, role: 'STUDENT', coachId: user.id },
    select: { id: true, email: true, name: true },
  })
  if (!student) return null
  return { coachId: user.id, student }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCoachAndStudent(params.id)
  if (!ctx) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }
  const note = await prisma.coachStudentNote.findFirst({
    where: { coachId: ctx.coachId, studentId: ctx.student.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, content: true, updatedAt: true },
  })
  return NextResponse.json({ note })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCoachAndStudent(params.id)
  if (!ctx) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = noteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Nieprawidłowa treść notatki' }, { status: 400 })
  }

  const content = parsed.data.content.trim()
  if (!content) {
    // Empty note = remove the note entirely.
    await prisma.coachStudentNote.deleteMany({
      where: { coachId: ctx.coachId, studentId: ctx.student.id },
    })
    return NextResponse.json({ note: null })
  }

  const existing = await prisma.coachStudentNote.findFirst({
    where: { coachId: ctx.coachId, studentId: ctx.student.id },
    select: { id: true },
  })

  const note = existing
    ? await prisma.coachStudentNote.update({
        where: { id: existing.id },
        data: { content },
        select: { id: true, content: true, updatedAt: true },
      })
    : await prisma.coachStudentNote.create({
        data: { coachId: ctx.coachId, studentId: ctx.student.id, content },
        select: { id: true, content: true, updatedAt: true },
      })

  return NextResponse.json({ note })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCoachAndStudent(params.id)
  if (!ctx) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }
  await prisma.coachStudentNote.deleteMany({
    where: { coachId: ctx.coachId, studentId: ctx.student.id },
  })
  return NextResponse.json({ ok: true })
}
