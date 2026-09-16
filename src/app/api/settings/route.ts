import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coachSettingsSchema } from '@/lib/validations'
import { isCoachRole } from '@/lib/roles'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = (session.user as any).id

    let settings = await prisma.coachSettings.findUnique({ where: { coachId: userId } })

    if (!settings) {
      settings = await prisma.coachSettings.create({
        data: { coachId: userId },
      })
    }

    // Klucze odszyfrowane do wyświetlenia (jak dotąd plaintext).
    return NextResponse.json({
      ...settings,
      discordWebhook: decryptSecret(settings.discordWebhook),
      steamApiKey: decryptSecret(settings.steamApiKey),
      faceitApiKey: decryptSecret(settings.faceitApiKey),
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania ustawień' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = coachSettingsSchema.parse(body)

    // Sekrety szyfrowane przed zapisem (plaintext ze starszych wersji
    // przechodzi i szyfruje się przy pierwszym zapisie).
    const toStore = {
      ...validated,
      discordWebhook: validated.discordWebhook ? encryptSecret(validated.discordWebhook) : validated.discordWebhook,
      steamApiKey: validated.steamApiKey ? encryptSecret(validated.steamApiKey) : validated.steamApiKey,
      faceitApiKey: validated.faceitApiKey ? encryptSecret(validated.faceitApiKey) : validated.faceitApiKey,
    }
    const settings = await prisma.coachSettings.upsert({
      where: { coachId: userId },
      update: toStore,
      create: { coachId: userId, ...toStore },
    })

    return NextResponse.json({
      ...settings,
      discordWebhook: decryptSecret(settings.discordWebhook),
      steamApiKey: decryptSecret(settings.steamApiKey),
      faceitApiKey: decryptSecret(settings.faceitApiKey),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji ustawień' }, { status: 500 })
  }
}