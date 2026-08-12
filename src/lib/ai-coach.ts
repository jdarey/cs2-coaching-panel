// "AI Trener" — deterministic analysis engine built on Leetify's per-match and
// season stats. No external LLM needed: every claim is derived from real
// numbers (accuracy, preaim, reaction, utility, positioning…) and phrased in
// plain Polish with concrete advice.

import { prisma } from './prisma'
import { LeetifyMatch } from './gaming'

interface LeetifyProfileLike {
  aim: number | null
  positioning: number | null
  utility: number | null
  clutch: number | null
  opening: number | null
  stats: Record<string, number>
}

// Leetify's stats are 0–100 (percentages / ms / etc.). The `rating` block is
// MIXED: aim/positioning/utility come as 0–100, clutch/opening as 0–1.
// Normalize anything to a readable 0–100 percentage.
export function toPercent(v: number | null): number | null {
  if (v == null) return null
  return v <= 1 ? v * 100 : v
}

function pct(v: number | null): number | null {
  return v == null ? null : Math.round(toPercent(v) ?? 0)
}

function pl(v: number, decimals = 0): string {
  return v.toLocaleString('pl-PL', { maximumFractionDigits: decimals })
}

const STAT_LABELS: Record<string, string> = {
  accuracy_enemy_spotted: 'celność przy widocznym wrogu',
  accuracy_head: 'celność w głowę',
  spray_accuracy: 'celność spraya',
  counter_strafing_good_shots_ratio: 'poprawne counter-strafy',
  reaction_time_ms: 'czas reakcji',
  preaim: 'pre-aim',
  flashbang_hit_foe_per_flashbang: 'trafienia flashy',
  traded_deaths_success_percentage: 'udane trade-deathy',
  trade_kills_success_percentage: 'skuteczność trade-killi',
  utility_on_death_avg: 'utylki przy śmierci',
  t_opening_duel_success_percentage: 'wygrane otwarcia (T)',
  ct_opening_duel_success_percentage: 'wygrane otwarcia (CT)',
}

function statValue(stats: Record<string, number>, key: string): number | null {
  const v = stats[key]
  return typeof v === 'number' && isFinite(v) ? v : null
}

export interface Weakness {
  key: string
  label: string
  value: number | null // 0–100
  advice: string
}

/**
 * Record a Leetify skill snapshot for a student (0–1 ratings). Only stores a
 * new row when at least one value changed meaningfully vs the last snapshot,
 * so the progress chart isn't polluted with duplicates.
 */
export async function recordSkillSnapshot(
  studentId: string,
  profile: { aim: number | null; positioning: number | null; utility: number | null; clutch: number | null; opening: number | null; stats?: Record<string, number> },
): Promise<void> {
  const reaction = profile.stats ? statValue(profile.stats, 'reaction_time_ms') : null
  // Store normalized 0–100 values so the chart is consistent
  const norm = {
    aim: toPercent(profile.aim),
    positioning: toPercent(profile.positioning),
    utility: toPercent(profile.utility),
    clutch: toPercent(profile.clutch),
    opening: toPercent(profile.opening),
  }
  const last = await prisma.skillSnapshot.findFirst({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  })

  if (last) {
    const same = [
      last.aim === profile.aim,
      last.positioning === profile.positioning,
      last.utility === profile.utility,
      last.clutch === profile.clutch,
      last.opening === profile.opening,
    ].every(Boolean)
    if (same) return
  }

  await prisma.skillSnapshot.create({
    data: {
      studentId,
      aim: norm.aim,
      positioning: norm.positioning,
      utility: norm.utility,
      clutch: norm.clutch,
      opening: norm.opening,
      reactionMs: reaction,
    },
  })
}

/** Profile-level weaknesses sorted weakest-first with concrete advice. */
export function analyzeWeaknesses(profile: LeetifyProfileLike): Weakness[] {
  const out: Weakness[] = []

  const ratingEntries: { key: string; label: string; v: number | null }[] = [
    { key: 'aim', label: 'Celność (Aim)', v: pct(profile.aim) },
    { key: 'positioning', label: 'Pozycjonowanie', v: pct(profile.positioning) },
    { key: 'utility', label: 'Użycie granatów (Utility)', v: pct(profile.utility) },
    { key: 'clutch', label: 'Klucze 1vX (Clutch)', v: pct(profile.clutch) },
    { key: 'opening', label: 'Otwarcia rund (Opening)', v: pct(profile.opening) },
  ]

  const ADVICE: Record<string, string> = {
    aim: "Skup się na celności: 15–20 minut DM dziennie z fokusem na głowę, potem 20 minut retake. Ustaw crosshair na wysokości głowy i kontroluj spray do 10 strzałów.",
    positioning: "Pracuj nad pozycjami: analizuj VOD własnych roundów, ucz się \"off-angles\" i rotacji. Zawsze miej plan wyjścia (trade partner) i nie wystawiaj się na dwóch przeciwników naraz.",
    utility: "Naucz się 2–3 przydatnych granatów na mapę (flashy wejściowe, smoke'y rotacyjne). Nie umieraj z granatem w ręku — rzuć go albo wyciągnij broń przed kontaktem.",
    clutch: "W sytuacjach 1vX graj czasem, nie agresją: trzymaj odległość od bombsite'a, zbierz info, rozbij duela na pojedyncze starcia. Oglądaj klucze pro-graczy.",
    opening: "Rozpoczynaj rundy pewniej: graj z pre-aimem na pierwszy headshot, nie peekuj na ślepo. Wejście z flashy zamiast suchego peeku podwaja szansę na pierwsze fragi.",
  }

  for (const e of ratingEntries) {
    if (e.v == null) continue
    out.push({ key: e.key, label: e.label, value: e.v, advice: ADVICE[e.key] })
  }

  // Stats-driven add-ons (only when clearly off)
  const stats = profile.stats || {}
  const checks: { key: string; label: string; bad: (v: number) => boolean; advice: string }[] = [
    {
      key: 'reaction_time_ms',
      label: 'Czas reakcji',
      bad: (v) => v > 350,
      advice: 'Twój czas reakcji jest wysoki. Rozgrzewka refleksu (3–5 min) przed każdą grą + poprawa pre-aimu skróci go o 30–50 ms.',
    },
    {
      key: 'counter_strafing_good_shots_ratio',
      label: 'Counter-strafing',
      bad: (v) => v < 40,
      advice: 'Słabe counter-strafy zaburzają celność. Poćwicz technikę w DM: stop-instant shot, potem dopiero celuj. To fundament celności w CS2.',
    },
    {
      key: 'utility_on_death_avg',
      label: 'Utylki przy śmierci',
      bad: (v) => v > 1,
      advice: 'Giniesz z granatami w ręku. Rzuć utility wcześnie w rundzie — flash/smoke przed wejściem, nie "na zapas".',
    },
    {
      key: 'accuracy_head',
      label: 'Celność w głowę',
      bad: (v) => v < 20,
      advice: 'Celność w głowę poniżej 20% — ustaw crosshair wyżej (na wysokości głowy przeciwnika) i graj z pre-aimem na rogi.',
    },
  ]

  for (const c of checks) {
    const v = statValue(stats, c.key)
    if (v == null) continue
    if (c.bad(v)) {
      out.push({ key: c.key, label: c.label, value: v, advice: c.advice })
    }
  }

  return out.sort((a, b) => (a.value ?? 100) - (b.value ?? 100))
}

/** Per-match analysis: what went wrong / what to keep doing, in Polish. */
export function analyzeMatch(
  profile: LeetifyProfileLike,
  m: LeetifyMatch,
): string {
  const parts: string[] = []

  const won = m.outcome === 'WIN'
  const scoreText = m.score ? `${m.score[0]}:${m.score[1]}` : null
  const opener = won
    ? `Wygrana${scoreText ? ` ${scoreText}` : ''} na ${m.map}.`
    : `Przegrana${scoreText ? ` ${scoreText}` : ''} na ${m.map}.`

  // 1) Match-level stats vs season averages
  const stats = profile.stats || {}
  const avgPreaim = statValue(stats, 'preaim')
  const avgReaction = statValue(stats, 'reaction_time_ms')
  const avgHead = statValue(stats, 'accuracy_head')
  const avgSpray = statValue(stats, 'spray_accuracy')
  const avgSpotted = statValue(stats, 'accuracy_enemy_spotted')

  const issues: string[] = []
  const strengths: string[] = []

  if (m.reactionTimeMs != null && avgReaction != null && m.reactionTimeMs > avgReaction + 40) {
    issues.push(`czas reakcji ${pl(m.reactionTimeMs)} ms (średnia ${pl(avgReaction)} ms)`)
  }
  if (m.preaim != null && avgPreaim != null && m.preaim < avgPreaim - 1.5) {
    issues.push(`pre-aim ${pl(m.preaim, 1)}% (średnia ${pl(avgPreaim, 1)}%)`)
  }
  if (m.accuracyHead != null && avgHead != null && m.accuracyHead < avgHead - 4) {
    issues.push(`celność w głowę ${pl(m.accuracyHead)}% (średnia ${pl(avgHead)}%)`)
  }
  if (m.sprayAccuracy != null && avgSpray != null && m.sprayAccuracy < avgSpray - 5) {
    issues.push(`kontrola spraya ${pl(m.sprayAccuracy)}% (średnia ${pl(avgSpray)}%)`)
  }
  if (m.accuracyEnemySpotted != null && avgSpotted != null && m.accuracyEnemySpotted < avgSpotted - 6) {
    issues.push(`celność przy widocznym wrogu ${pl(m.accuracyEnemySpotted)}% (średnia ${pl(avgSpotted)}%)`)
  }

  if (m.reactionTimeMs != null && avgReaction != null && m.reactionTimeMs < avgReaction - 40) {
    strengths.push(`reakcja ${pl(m.reactionTimeMs)} ms — lepiej niż Twoja średnia`)
  }
  if (m.preaim != null && avgPreaim != null && m.preaim > avgPreaim + 1.5) {
    strengths.push(`pre-aim ${pl(m.preaim, 1)}% — powyżej średniej`)
  }
  if (m.accuracyHead != null && avgHead != null && m.accuracyHead > avgHead + 4) {
    strengths.push(`celność w głowę ${pl(m.accuracyHead)}%`)
  }
  if (m.sprayAccuracy != null && avgSpray != null && m.sprayAccuracy > avgSpray + 5) {
    strengths.push(`kontrola spraya ${pl(m.sprayAccuracy)}%`)
  }

  if (issues.length > 0) {
    parts.push(`${opener} Zawiodło najbardziej: ${issues.join(', ')}.`)
  } else {
    parts.push(
      won
        ? `${opener} Gra na poziomie Twojej średniej lub wyżej — solidny występ.`
        : `${opener} Bez wyraźnych spadków względem średniej — porażka wynikała raczej z przeciwnika niż z Twojej gry indywidualnej.`,
    )
  }

  if (strengths.length > 0) {
    parts.push(`Trzymaj poziom: ${strengths.join(', ')}.`)
  }

  // 2) Biggest weakness context
  const weakest = analyzeWeaknesses(profile)[0]
  if (weakest) {
    if (issues.length > 0) {
      parts.push(`Ogólnie Twoja największa luka to ${weakest.label} — ${weakest.advice}`)
    } else {
      parts.push(`Następny krok: pracuj nad ${weakest.label} — ${weakest.advice}`)
    }
  }

  return parts.join(' ')
}

export interface RoutineTaskSuggestion {
  title: string
  day: number
  minutes: number
}

export interface RoutineSuggestion {
  title: string
  description: string
  tasks: RoutineTaskSuggestion[]
}

// A ready-to-create routine for a specific weakness — the coach can generate it
// in one click. Task templates map to the weakness advice.
export function suggestRoutineForWeakness(weakness: Weakness): RoutineSuggestion {
  const common: Record<string, RoutineSuggestion> = {
    aim: {
      title: 'Tydzień celności',
      description: 'Program na poprawę celności: DM, retake i kontrola spraya z fokusem na headshoty.',
      tasks: [
        { title: 'Deathmatch — tylko headshoty (pistolet + riffle)', day: 1, minutes: 20 },
        { title: 'Aim Botz — 1000 killi z pre-aimem', day: 1, minutes: 25 },
        { title: 'Retake — gra z fokusem na pierwszy headshot', day: 2, minutes: 30 },
        { title: 'Kontrola spraya AK/M4 — wzory do 10 strzałów', day: 3, minutes: 20 },
        { title: 'DM bez sprintu — celuj dopiero po counter-strafie', day: 4, minutes: 20 },
        { title: 'Test: 3 rundy retake + refleksja', day: 5, minutes: 30 },
      ],
    },
    positioning: {
      title: 'Tydzień pozycji i rotacji',
      description: 'Program na pozycjonowanie: off-angles, rotacje i plan wyjścia z każdej rundy.',
      tasks: [
        { title: 'VOD własnego meczu — wypisz 5 złych pozycji', day: 1, minutes: 40 },
        { title: 'Nauka off-angles na Twojej głównej mapie', day: 2, minutes: 30 },
        { title: 'Retake — graj pozycje z trade-partnerem', day: 3, minutes: 30 },
        { title: 'Analiza demka pro-gracza na tej samej pozycji', day: 4, minutes: 40 },
        { title: 'Mecz z planem wyjścia w każdej rundzie + refleksja', day: 5, minutes: 60 },
      ],
    },
    utility: {
      title: 'Tydzień utility',
      description: 'Program na granaty: lineupy, flashy wejściowe i brak śmierci z granatem w ręku.',
      tasks: [
        { title: 'Nauka 3 smokeów na Mirage', day: 1, minutes: 30 },
        { title: 'Flashy wejściowe — 5 miejsc na mapie', day: 2, minutes: 20 },
        { title: 'Lineupy na Inferno — banana + graveyard', day: 3, minutes: 30 },
        { title: 'Retake z użyciem utility przed wejściem', day: 4, minutes: 30 },
        { title: 'Mecz — cel: ani jedna śmierć z granatem w ręku', day: 5, minutes: 60 },
      ],
    },
    clutch: {
      title: 'Tydzień kluczy 1vX',
      description: 'Program na sytuacje 1vX: gra na czas, zbieranie info i rozbijanie duelów.',
      tasks: [
        { title: 'Analiza 3 kluczy pro-graczy (1v3+)', day: 1, minutes: 40 },
        { title: 'Serwer 1v1 — gra na czas, nie na agresję', day: 2, minutes: 30 },
        { title: 'Scenariusze 1v2 na retake', day: 3, minutes: 30 },
        { title: 'Ćwiczenie: odległość od bombsite\'a w 1vX', day: 4, minutes: 20 },
        { title: 'Mecz — zapisuj każdą sytuację 1vX + refleksja', day: 5, minutes: 60 },
      ],
    },
    opening: {
      title: 'Tydzień otwarć rund',
      description: 'Program na pierwsze fragi: pre-aim, entry z flashy i pewne otwarcia.',
      tasks: [
        { title: 'DM z pre-aimem na pierwszy headshot', day: 1, minutes: 25 },
        { title: 'Entry z flashy — 10 wejść na retake', day: 2, minutes: 30 },
        { title: 'Nauka agresywnych pozycji otwarcia (T)', day: 3, minutes: 30 },
        { title: 'Otwarcia CT — swingi z info, nie na ślepo', day: 4, minutes: 25 },
        { title: 'Mecz — cel: pierwszy frag w 30% rund + refleksja', day: 5, minutes: 60 },
      ],
    },
    'Czas reakcji': {
      title: 'Tydzień refleksu',
      description: 'Program na skrócenie czasu reakcji: rozgrzewka refleksu i pre-aim przed każdą grą.',
      tasks: [
        { title: 'Rozgrzewka refleksu — 5 minut przed każdą sesją', day: 1, minutes: 5 },
        { title: 'DM z fokusem na reakcję na pierwszy ruch', day: 2, minutes: 20 },
        { title: 'Pre-aim na rogi — bez czekania na pojawienie się wroga', day: 3, minutes: 25 },
        { title: 'Test reakcji + porównanie ze średnią', day: 4, minutes: 10 },
        { title: 'Mecz — cel: reakcja poniżej 300 ms + refleksja', day: 5, minutes: 60 },
      ],
    },
    'Counter-strafing': {
      title: 'Tydzień ruchu',
      description: 'Program na counter-strafing — fundament celności w CS2.',
      tasks: [
        { title: 'DM — stop-instant shot (bez celowania w ruchu)', day: 1, minutes: 20 },
        { title: 'Ćwiczenie counter-strafe na mapach ruchu', day: 2, minutes: 25 },
        { title: 'DM — 50% killi po counter-strafie, 50% bez', day: 3, minutes: 20 },
        { title: 'Retake — ruch + celność razem', day: 4, minutes: 30 },
        { title: 'Mecz — kontroluj moment zatrzymania + refleksja', day: 5, minutes: 60 },
      ],
    },
    'Utylki przy śmierci': {
      title: 'Tydzień utility',
      description: 'Program na granaty: lineupy, flashy wejściowe i brak śmierci z granatem w ręku.',
      tasks: [
        { title: 'Nauka 3 smokeów na Mirage', day: 1, minutes: 30 },
        { title: 'Flashy wejściowe — 5 miejsc na mapie', day: 2, minutes: 20 },
        { title: 'Lineupy na Inferno — banana + graveyard', day: 3, minutes: 30 },
        { title: 'Retake z użyciem utility przed wejściem', day: 4, minutes: 30 },
        { title: 'Mecz — cel: ani jedna śmierć z granatem w ręku', day: 5, minutes: 60 },
      ],
    },
    'Celność w głowę': {
      title: 'Tydzień headshotów',
      description: 'Program na celność w głowę: crosshair placement i DM z fokusem na HS.',
      tasks: [
        { title: 'DM — tylko headshoty (AK + USP)', day: 1, minutes: 20 },
        { title: 'Crosshair placement — trzymaj wysokość głowy', day: 2, minutes: 25 },
        { title: 'Aim Botz — headshot-only 500 killi', day: 3, minutes: 20 },
        { title: 'Retake z fokusem na pierwszy headshot', day: 4, minutes: 30 },
        { title: 'Mecz — cel: 30%+ celności w głowę + refleksja', day: 5, minutes: 60 },
      ],
    },
  }

  return (
    common[weakness.label] ??
    common[weakness.key] ?? {
      title: `Tydzień poprawy: ${weakness.label}`,
      description: `Program treningowy skoncentrowany na: ${weakness.label}. ${weakness.advice}`,
      tasks: [
        { title: `Praktyka: ${weakness.label} — poziom 1`, day: 1, minutes: 25 },
        { title: `Praktyka: ${weakness.label} — poziom 2`, day: 2, minutes: 25 },
        { title: 'Retake z fokusem na poprawę', day: 3, minutes: 30 },
        { title: 'Analiza VOD + refleksja', day: 4, minutes: 40 },
        { title: 'Mecz testowy + refleksja', day: 5, minutes: 60 },
      ],
    }
  )
}

/** Short one-liner verdict for a match (used on compact cards). */
export function matchVerdict(profile: LeetifyProfileLike, m: LeetifyMatch): string {
  const stats = profile.stats || {}
  const avgReaction = statValue(stats, 'reaction_time_ms')
  const avgHead = statValue(stats, 'accuracy_head')
  const avgPreaim = statValue(stats, 'preaim')

  if (m.outcome === 'WIN') {
    return 'Solidna wygrana — trzymaj tempo i powtarzaj ten poziom.'
  }
  // loss
  if (m.reactionTimeMs != null && avgReaction != null && m.reactionTimeMs > avgReaction + 40) {
    return 'Zawiodła reakcja — rozgrzewka refleksu przed następną grą.'
  }
  if (m.accuracyHead != null && avgHead != null && m.accuracyHead < avgHead - 4) {
    return 'Zawiodła celność — 20 min DM z fokusem na głowę.'
  }
  if (m.preaim != null && avgPreaim != null && m.preaim < avgPreaim - 1.5) {
    return 'Zawiódł pre-aim — crosshair trzymaj na wysokości głowy.'
  }
  return 'Zawiodły szczegóły — przeanalizuj VOD rund, które przegrałeś.'
}
