import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSteamIdentifier, resolveSteamVanity } from '@/lib/gaming'
import { z } from 'zod'

// Avatars are stored as base64 data URIs in the DB (no file storage). The
// limit keeps the DB lean; the value itself never lands in the session cookie
// anymore (auth.ts reads it fresh from the DB), so it cannot break requests.
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
  steamId: z.string().max(64).optional().nullable(),
  steamVanity: z.string().max(128).optional().nullable(),
  faceitNickname: z.string().max(64).optional().nullable(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        steamId: true,
        steamVanity: true,
        faceitNickname: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
    }
    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania profilu' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = profileSchema.parse(body)

    const data: any = { ...validated }

    // Resolve a Steam profile URL / vanity / steam64 to a numeric steam64 ID
    // so match sync + AI analysis can use it directly, no matter how the user
    // pasted it (link, name, or ID).
    if (typeof validated.steamVanity === 'string' && validated.steamVanity.trim()) {
      const raw = validated.steamVanity.trim()
      const parsed = parseSteamIdentifier(raw)
      let steamId: string | null = parsed.type === 'steam64' ? parsed.value : null
      if (!steamId && parsed.type === 'vanity') {
        steamId = await resolveSteamVanity(parsed.value)
      }
      if (steamId) {
        data.steamId = steamId
        data.steamVanity = raw
      } else {
        data.steamId = null
      }
    } else if (validated.steamVanity === null || validated.steamVanity === '') {
      // Explicitly cleared — keep steamId in sync
      data.steamId = null
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        steamId: true,
        steamVanity: true,
        faceitNickname: true,
      },
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