// Progi podatkowe do statusu w Finansach. JEDNO miejsce na liczby —
// jak zmienią się kwoty (rosną co roku), poprawiasz tutaj.
export const TAX_YEAR = 2026

// Minimalne wynagrodzenie brutto. Sprawdź aktualną kwotę na dany rok
// (np. na gov.pl) — od niej liczy się limit działalności nierejestrowanej.
export const MIN_WAGE_PLN = 4806

// Działalność nierejestrowana: przychód miesięczny do 75% minimalnego.
// Powyżej → trzeba założyć firmę (JDG).
export const UNREGISTERED_MONTHLY_LIMIT_PLN = Math.floor(MIN_WAGE_PLN * 0.75)

export interface TaxStatusInput {
  // przychody miesięczne w groszach: [{ month: '2026-09', income: 12345 }]
  months: { month: string; income: number }[]
  yearIncome: number
}

export type TaxStatus =
  | { level: 'ok'; title: string; detail: string }
  | { level: 'warn'; title: string; detail: string }

export function taxStatus(input: TaxStatusInput): TaxStatus {
  const limitGr = UNREGISTERED_MONTHLY_LIMIT_PLN * 100
  const worst = input.months.reduce<{ month: string; income: number } | null>(
    (best, m) => (!best || m.income > best.income ? m : best),
    null,
  )

  if (worst && worst.income > limitGr) {
    return {
      level: 'warn',
      title: 'Musisz założyć działalność (lub skonsultować)',
      detail: `W miesiącu ${worst.month} przychód ${(worst.income / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} przekroczył limit działalności nierejestrowanej (${UNREGISTERED_MONTHLY_LIMIT_PLN.toLocaleString('pl-PL')} zł). Powyżej limitu sprzedaż bez firmy jest nielegalna — załóż JDG albo idź do księgowej.`,
    }
  }

  if (input.yearIncome > 0) {
    return {
      level: 'ok',
      title: 'Na razie bez firmy — rozliczysz w PIT-36',
      detail: `Mieścisz się w limicie nierejestrowanej (do ${UNREGISTERED_MONTHLY_LIMIT_PLN.toLocaleString('pl-PL')} zł mies.). Bez ZUS, a podatek rozliczysz raz w roku w PIT-36 za ${TAX_YEAR}. Pilnuj, żeby żaden miesiąc nie przekroczył limitu.`,
    }
  }

  return {
    level: 'ok',
    title: 'Brak przychodów w tym roku',
    detail: 'Dopiero jak wpadnie pierwsza kasa, pojawi się tu status podatkowy.',
  }
}
