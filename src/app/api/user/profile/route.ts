import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Avatar URLs land inside the NextAuth JWT, so they must stay small — a huge
// base64 data URI (e.g. an uncompressed photo) inflates the token past the
// cookie-chunking threshold and breaks the session (401s everywhere).
const avatarSchema = z
  .string()
  .refine(
    (v) => v.length <= 200_000,
    { message: 'Avatar jest za duży — użyj zdjęcia do ~150KB' },
  )
  .refine(
    (v) => {
      if (!v.startsWith('data:')) return true // plain http(s) URL
      return v.startsWith('data:image/') // only image data URIs
    },
    { message: 'Avatar musi być obrazem' },
  )

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.union([avatarSchema, z.literal('')]).optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = profileSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: validated,
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Profile PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji profilu' }, { status: 500 })
  }
}