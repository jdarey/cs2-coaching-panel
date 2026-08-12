import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLeetifyProfile, fetchFaceitLegacy } from '@/lib/gaming'

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

    const resolveSteam64 = async (vanity: string): Promise<string | null> => {
      try {
        const url = `https://steamcommunity.com/id/${encodeURIComponent(vanity)}?xml=1`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CS2-Coaching-Panel/1.0' },
          cache: 'no-store',
        })
        if (!res.ok) return null
        const xml = await res.text()
        const m = xml.match(/<steamID64>\s*(\d{17})\s*<\/steamID64>/)
        return m ? m[1] : null
      } catch {
        return null
      }
    }

    for (const student of students) {
      const hasIdentity = student.steamVanity || student.steamId || student.faceitNickname
      if (!hasIdentity) continue

      summary.studentsChecked++
      const name = student.name || student.id
      const entries: { mode: string; rank: string; elo: number | null; note: string }[] = []

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
              note: 'Cron: Leetify (automatycznie)',
            })
          }
          if (leetify.faceitElo != null) {
            entries.push({
              mode: 'FACEIT',
              rank: `${leetify.faceitElo} ELO`,
              elo: leetify.faceitElo,
              note: `Cron: Leetify (automatycznie)${leetify.faceitLevel != null ? ` · Lv.${leetify.faceitLevel}` : ''}`,
            })
          } else if (leetify.faceitLevel != null) {
            entries.push({
              mode: 'FACEIT',
              rank: `Poziom ${leetify.faceitLevel}`,
              elo: null,
              note: 'Cron: Leetify (automatycznie)',
            })
          }
        }
      }

      // 2) Faceit nickname fallback (keyless legacy)
      if (entries.length === 0 && student.faceitNickname) {
        const faceit = await fetchFaceitLegacy(student.faceitNickname)
        if (faceit && faceit.elo != null) {
          entries.push({
            mode: 'FACEIT',
            rank: `${faceit.elo} ELO`,
            elo: faceit.elo,
            note: `Cron: Faceit (automatycznie)${faceit.skillLevel != null ? ` · Lv.${faceit.skillLevel}` : ''}`,
          })
        }
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
