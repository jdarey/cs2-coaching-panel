import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLeetifyProfile, fetchBestFaceitElo, parseSteamIdentifier, resolveSteamVanity } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

// Weekly keyless rank sync. No API keys needed:
//  - students with steamVanity/steamId -> Leetify (Premier + Faceit) with
//    Faceit legacy fallback by nickname
//  - only creates a RankEntry when the ELO/rating CHANGED since the last one
export async function GET(request: Request) {
  // Verify cron secret (same convention as /api/cron/cleanup)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        steamVanity: true,
        steamId: true,
        faceitNickname: true,
      },
    })

    const summary = {
      studentsChecked: 0,
      entriesCreated: 0,
      skippedUnchanged: 0,
      errors: 0,
      details: [] as string[],
    }

    const resolveSteam64 = async (value: string): Promise<string | null> => {
      const parsed = parseSteamIdentifier(value)
      if (parsed.type === 'steam64') return parsed.value
      if (parsed.type === 'vanity') return resolveSteamVanity(parsed.value)
      return null
    }

    for (const student of students) {
      const hasIdentity = student.steamVanity || student.steamId || student.faceitNickname
      if (!hasIdentity) continue

      summary.studentsChecked++
      const name = student.name || student.id
      const entries: { mode: string; rank: string; elo: number | null; source: 'FACEIT_LIVE' | 'LEETIFY'; note: string }[] = []

      // 1) Steam-based: Leetify gives Premier + Faceit together (keyless)
      let steamId = student.steamId || null
      if (!steamId && student.steamVanity) {
        steamId = await resolveSteam64(student.steamVanity)
      }
      if (steamId) {
        const leetify = await fetchLeetifyProfile(steamId)
        if (leetify) {
          if (leetify.premier != null) {
            entries.push({
              mode: 'PREMIER',
              rank: `${leetify.premier} Premier`,
              elo: leetify.premier,
              source: 'LEETIFY',
              note: 'Cron: Leetify (automatycznie)',
            })
          }
        }
      }

      // 2) Faceit: prefer live Faceit legacy (nickname saved OR auto-discovered
      // from Leetify match history — Steam nick often differs from Faceit nick).
      // Leetify's cached faceit_elo is a fallback only (it can be stale).
      const best = await fetchBestFaceitElo(steamId, student.faceitNickname)

      // Persist an auto-discovered Faceit nickname so future syncs use the
      // saved value instead of re-discovering it via Leetify match details.
      if (best.nickname && best.nickname !== student.faceitNickname && best.source === 'faceit') {
        await prisma.user.update({
          where: { id: student.id },
          data: { faceitNickname: best.nickname },
        })
        summary.details.push(`${name}: wykryto nick Faceit „${best.nickname}”`)
      }
      if (best.elo != null) {
        entries.push({
          mode: 'FACEIT',
          rank: `${best.elo} ELO`,
          elo: best.elo,
          source: best.source === 'faceit' ? 'FACEIT_LIVE' : 'LEETIFY',
          note: `Cron: ${best.source === 'faceit' ? `Faceit (na żywo)${best.level != null ? ` · Lv.${best.level}` : ''}` : `Leetify (automatycznie)${best.level != null ? ` · Lv.${best.level}` : ''}`}`,
        })
      } else if (best.level != null) {
        entries.push({
          mode: 'FACEIT',
          rank: `Poziom ${best.level}`,
          elo: null,
          source: best.source === 'faceit' ? 'FACEIT_LIVE' : 'LEETIFY',
          note: `Cron: ${best.source === 'faceit' ? 'Faceit (na żywo)' : 'Leetify (automatycznie)'}`,
        })
      }

      if (entries.length === 0) {
        summary.errors++
        summary.details.push(`${name}: brak danych (prywatny profil / brak konta)`)
        continue
      }

      // 3) Only write when the value changed vs. the last entry of the same mode
      for (const entry of entries) {
        const lastEntry = await prisma.rankEntry.findFirst({
          where: { studentId: student.id, mode: entry.mode },
          orderBy: { recordedAt: 'desc' },
        })

        if (lastEntry && lastEntry.elo === entry.elo && lastEntry.rank === entry.rank) {
          summary.skippedUnchanged++
          continue
        }

        await prisma.rankEntry.create({
          data: {
            studentId: student.id,
            mode: entry.mode,
            rank: entry.rank,
            elo: entry.elo,
            source: entry.source,
            note: entry.note,
          },
        })
        summary.entriesCreated++
        summary.details.push(`${name} [${entry.mode}]: ${lastEntry ? `${lastEntry.rank} → ${entry.rank}` : entry.rank}`)
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...summary })
  } catch (error) {
    console.error('Cron faceit-sync failed:', error)
    return NextResponse.json(
      { error: 'Faceit sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
