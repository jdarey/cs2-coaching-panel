import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    await prisma.$transaction(async (tx) => {
      if (role === 'COACH') {
        // Unlink students (CoachStudent relation uses Restrict by default)
        await tx.user.updateMany({
          where: { coachId: userId },
          data: { coachId: null },
        })
        // Delete the coach's videos and tags first (both use Restrict)
        await tx.video.deleteMany({ where: { coachId: userId } })
        await tx.tag.deleteMany({ where: { coachId: userId } })
      }

      // Sessions, notes, progress and coach settings cascade from here
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania konta' }, { status: 500 })
  }
}
