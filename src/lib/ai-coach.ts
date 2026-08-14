// "AI Trener" — deterministic analysis engine built on Leetify's per-match and
// season stats. No external LLM needed: every claim is derived from real
// numbers (accuracy, preaim, reaction, utility, positioning…) and phrased in
// plain Polish with concrete advice.

import { prisma } from './prisma'
import { LeetifyMatch } from './gaming'

export interface LeetifyProfileLike {
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

/**
 * Per-match analysis: what went wrong / what to keep doing, in Polish.
 *
 * Every claim is backed by a real comparison between the match's own stats
 * (LeetifyMatch) and the player's season averages (profile.stats) — never
 * generic filler or speculation. If there is no number to compare, the
 * analysis says exactly that instead of guessing.
 */
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

  // 1) Match-level stats vs season averages — only rows with BOTH numbers
  // present can produce a claim.
  const stats = profile.stats || {}
  const avgReaction = statValue(stats, 'reaction_time_ms')
  const avgPreaim = statValue(stats, 'preaim')
  const avgHead = statValue(stats, 'accuracy_head')
  const avgSpray = statValue(stats, 'spray_accuracy')
  const avgSpotted = statValue(stats, 'accuracy_enemy_spotted')

  type Cmp = { label: string; match: number | null; avg: number | null; unit: string; worseIfHigher: boolean; threshold: number }
  const cmps: Cmp[] = [
    { label: 'czas reakcji', match: m.reactionTimeMs, avg: avgReaction, unit: ' ms', worseIfHigher: true, threshold: 40 },
    { label: 'pre-aim', match: m.preaim, avg: avgPreaim, unit: '%', worseIfHigher: false, threshold: 1.5 },
    { label: 'celność w głowę', match: m.accuracyHead, avg: avgHead, unit: '%', worseIfHigher: false, threshold: 4 },
    { label: 'kontrola spraya', match: m.sprayAccuracy, avg: avgSpray, unit: '%', worseIfHigher: false, threshold: 5 },
    { label: 'celność przy widocznym wrogu', match: m.accuracyEnemySpotted, avg: avgSpotted, unit: '%', worseIfHigher: false, threshold: 6 },
  ].filter((c) => c.match != null && c.avg != null)

  const fmtCmp = (c: Cmp) => `${c.label} ${pl(c.match!, 1)}${c.unit} (średnia ${pl(c.avg!, 1)}${c.unit})`
  const isWorse = (c: Cmp) => (c.worseIfHigher ? c.match! > c.avg! + c.threshold : c.match! < c.avg! - c.threshold)
  const isBetter = (c: Cmp) => (c.worseIfHigher ? c.match! < c.avg! - c.threshold : c.match! > c.avg! + c.threshold)

  const issues = cmps.filter(isWorse)
  const strengths = cmps.filter(isBetter)

  if (issues.length > 0) {
    parts.push(`${opener} Zawiodło najbardziej: ${issues.map(fmtCmp).join(', ')}.`)
  } else if (cmps.length > 0) {
    // Verified: no stat was meaningfully below the season average.
    parts.push(`${opener} Żadna z mierzonych statystyk nie była znacząco poniżej Twojej średniej sezonowej.`)
  } else {
    // No match numbers at all — state that plainly instead of guessing.
    parts.push(`${opener} Brak danych porównawczych dla tego meczu — połącz konto Leetify, aby analiza opierała się na liczbach.`)
  }

  if (strengths.length > 0) {
    parts.push(`Trzymaj poziom: ${strengths.map(fmtCmp).join(', ')}.`)
  }

  // 2) Biggest season weakness — clearly labeled as a season-level (not
  // match-level) finding, so it can't be mistaken for this match's verdict.
  const weakest = analyzeWeaknesses(profile)[0]
  if (weakest) {
    parts.push(`Poza tym meczem — Twoja największa luka w całym sezonie to ${weakest.label} (${weakest.value}%): ${weakest.advice}`)
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

/**
 * Short one-liner verdict for a match (used on compact cards).
 *
 * Also strictly data-driven: it names the single biggest verified deviation
 * from the season average, and says plainly when there is none.
 */
export function matchVerdict(profile: LeetifyProfileLike, m: LeetifyMatch): string {
  const stats = profile.stats || {}
  const avgReaction = statValue(stats, 'reaction_time_ms')
  const avgHead = statValue(stats, 'accuracy_head')
  const avgPreaim = statValue(stats, 'preaim')
  const avgSpray = statValue(stats, 'spray_accuracy')

  const deviations: string[] = []
  const over: string[] = []

  if (m.reactionTimeMs != null && avgReaction != null) {
    if (m.reactionTimeMs > avgReaction + 40) deviations.push(`reakcja ${pl(m.reactionTimeMs)} ms (śr. ${pl(avgReaction)} ms)`)
    else if (m.reactionTimeMs < avgReaction - 40) over.push(`reakcja ${pl(m.reactionTimeMs)} ms`)
  }
  if (m.accuracyHead != null && avgHead != null) {
    if (m.accuracyHead < avgHead - 4) deviations.push(`celność w głowę ${pl(m.accuracyHead)}% (śr. ${pl(avgHead)}%)`)
    else if (m.accuracyHead > avgHead + 4) over.push(`celność w głowę ${pl(m.accuracyHead)}%`)
  }
  if (m.preaim != null && avgPreaim != null) {
    if (m.preaim < avgPreaim - 1.5) deviations.push(`pre-aim ${pl(m.preaim, 1)}% (śr. ${pl(avgPreaim, 1)}%)`)
    else if (m.preaim > avgPreaim + 1.5) over.push(`pre-aim ${pl(m.preaim, 1)}%`)
  }
  if (m.sprayAccuracy != null && avgSpray != null) {
    if (m.sprayAccuracy < avgSpray - 5) deviations.push(`kontrola spraya ${pl(m.sprayAccuracy)}% (śr. ${pl(avgSpray)}%)`)
    else if (m.sprayAccuracy > avgSpray + 5) over.push(`kontrola spraya ${pl(m.sprayAccuracy)}%`)
  }

  if (m.outcome === 'WIN') {
    if (deviations.length > 0) return `Wygrana, ale ${deviations[0]} poniżej Twojej średniej.`
    if (over.length > 0) return `Wygrana — ${over[0]} ponad Twoją średnią.`
    return 'Wygrana — statystyki na poziomie Twojej średniej sezonowej.'
  }
  if (deviations.length > 0) return `Porażka — ${deviations[0]} poniżej Twojej średniej.`
  return 'Porażka bez wyraźnego spadku względem Twojej średniej — przejrzyj VOD przegranych rund.'
}
