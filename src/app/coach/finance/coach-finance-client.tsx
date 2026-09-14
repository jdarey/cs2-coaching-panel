'use client'

import { useCallback, useEffect, useState } from 'react'
import { CoachLayout } from '@/components/coach-layout-export'
import { Wallet, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Scale, Info, ShieldCheck, ShieldAlert, Download, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Entry {
  id: string
  kind: 'INCOME' | 'EXPENSE'
  person: string
  title: string
  amount: number // grosze
  date: string
  note: string | null
}

const pln = (grosze: number) =>
  (grosze / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })

const toMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

// Format DD-MM-RRRR: maska (same cyfry + myślniki) i walidacja prawdziwej daty
const toDisplayDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`

function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

function parseDisplayDate(s: string): string | null {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (yyyy < 2000 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const d = new Date(yyyy, mm - 1, dd)
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export function CoachFinanceClient() {
  const [month, setMonth] = useState(() => toMonth(new Date()))
  const [viewAll, setViewAll] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [yearSummary, setYearSummary] = useState({ income: 0, expense: 0, year: new Date().getFullYear() })
  const [tax, setTax] = useState<{
    status: { level: string; title: string; detail: string }
    monthlyLimitPln: number
    year: number
    worstMonth: { month: string; income: number } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const [kind, setKind] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [person, setPerson] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => toDisplayDate(new Date()))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(viewAll ? '/api/coach/finance?all=1' : `/api/coach/finance?month=${month}`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.entries ?? [])
      setSummary(data.summary ?? { income: 0, expense: 0 })
      setYearSummary(data.yearSummary ?? { income: 0, expense: 0, year: new Date().getFullYear() })
      setTax(data.tax ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [month, viewAll])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const plnValue = Number(String(amount).replace(',', '.'))
    const isoDate = parseDisplayDate(date)
    if (!person.trim() || !title.trim() || !(plnValue > 0)) {
      setMsg({ ok: false, text: 'Uzupełnij: kto, za co i kwotę większą od zera.' })
      return
    }
    if (!isoDate) {
      setMsg({ ok: false, text: 'Zła data — wpisz w formacie DZIEŃ-MIESIĄC-ROK, np. 14-09-2026.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/coach/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, person: person.trim(), title: title.trim(), amountPln: plnValue, date: isoDate, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setPerson('')
      setTitle('')
      setAmount('')
      setNote('')
      setMsg({ ok: true, text: 'Zapisano.' })
      load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd zapisu' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Usunąć ten wpis?')) return
    try {
      const res = await fetch(`/api/coach/finance/${id}`, { method: 'DELETE' })
      if (res.ok) load()
    } catch {
      /* ignore */
    }
  }

  const balance = summary.income - summary.expense

  return (
    <CoachLayout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
              <Wallet className="w-5 h-5 text-white" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Kosztorys</p>
              <h1 className="font-display text-2xl font-bold">Finanse</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!viewAll && (
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/50 [color-scheme:dark]"
              />
            )}
            <button
              onClick={() => setViewAll((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold border transition-colors',
                viewAll
                  ? 'bg-[#a78bfa]/15 border-[#a78bfa]/40 text-white'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white',
              )}
            >
              <LayoutGrid className="w-4 h-4" /> {viewAll ? 'Całość' : 'Wgląd na całość'}
            </button>
            <a
              href="/api/coach/finance/export"
              className="inline-flex items-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold text-white/80 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.09]"
            >
              <Download className="w-4 h-4" /> Eksport CSV
            </a>
          </div>
        </div>

        {/* Status podatkowy z Twoich wpisów */}
        {tax && (
          <div className={cn('rounded-2xl border p-5 mb-4', tax.status.level === 'ok' ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-red-500/30 bg-red-500/[0.07]')}>
            <p className="flex items-center gap-2 text-sm font-bold mb-1">
              {tax.status.level === 'ok'
                ? <ShieldCheck className="w-4 h-4 text-emerald-300" />
                : <ShieldAlert className="w-4 h-4 text-red-300" />}
              <span className={tax.status.level === 'ok' ? 'text-emerald-200' : 'text-red-200'}>Podatek: {tax.status.title}</span>
            </p>
            <p className="text-sm text-white/60 leading-relaxed">{tax.status.detail}</p>
            <p className="mt-2 text-xs text-white/35">
              Limit nierejestrowanej: {tax.monthlyLimitPln.toLocaleString('pl-PL')} zł/mies.
              {tax.worstMonth && tax.worstMonth.income > 0 && (
                <> · najlepszy miesiąc: {tax.worstMonth.month} ({pln(tax.worstMonth.income)})</>
              )}
            </p>
          </div>
        )}

        {/* Podsumowanie miesiąca / całości */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300/80 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Wpływy</p>
            <p className="font-display text-2xl font-bold text-emerald-200">{pln(summary.income)}</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-300/80 mb-1"><TrendingDown className="w-3.5 h-3.5" /> Wydatki</p>
            <p className="font-display text-2xl font-bold text-red-200">{pln(summary.expense)}</p>
          </div>
          <div className={cn('rounded-2xl border p-5', balance >= 0 ? 'border-[#a78bfa]/25 bg-[#a78bfa]/[0.06]' : 'border-red-500/20 bg-red-500/[0.06]')}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 mb-1"><Scale className="w-3.5 h-3.5" /> Bilans</p>
            <p className="font-display text-2xl font-bold text-white">{pln(balance)}</p>
          </div>
        </div>
        <p className="text-xs text-white/40 mb-6">Od stycznia {yearSummary.year} wpadło łącznie: <b className="text-white/70">{pln(yearSummary.income)}</b> (wydatki: {pln(yearSummary.expense)})</p>

        {/* Nowy wpis */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-6 mb-6">
          <p className="text-sm font-semibold text-white mb-4">Nowy wpis</p>
          {msg && (
            <div className={cn('mb-4 rounded-xl px-4 py-3 text-sm border', msg.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-red-500/10 border-red-500/25 text-red-200')}>
              {msg.text}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['INCOME', 'EXPENSE'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'h-11 rounded-xl text-sm font-semibold border transition-colors',
                  kind === k
                    ? k === 'INCOME'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-500/15 border-red-500/40 text-red-200'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white',
                )}
              >
                {k === 'INCOME' ? '💰 Wpływ (zarobiłem)' : '💸 Wydatek (wydałem)'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder={kind === 'INCOME' ? 'Od kogo? (np. uczeń, nick)' : 'Komu? (np. montażysta)'} className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Za co? (np. pakiet 4 sesje)" className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Kwota w zł (np. 149,99)" className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30 tabular-nums" />
            <input value={date} onChange={(e) => setDate(maskDateInput(e.target.value))} inputMode="numeric" placeholder="DD-MM-RRRR (np. 14-09-2026)" maxLength={10} className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30 tabular-nums" />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notatka (opcjonalnie, np. forma płatności)" className="mt-3 w-full h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30" />
          <button
            onClick={add}
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Zapisz wpis
          </button>
        </div>

        {/* Lista */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/40 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie…
            </div>
          ) : entries.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/40">{viewAll ? 'Brak wpisów. Dodaj pierwszy powyżej.' : 'Brak wpisów w tym miesiącu. Dodaj pierwszy powyżej.'}</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base', e.kind === 'INCOME' ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                    {e.kind === 'INCOME' ? '💰' : '💸'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title} <span className="font-normal text-white/40">· {e.person}</span></p>
                    <p className="text-xs text-white/35">
                      {new Date(e.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' })}
                      {e.note ? ` · ${e.note}` : ''}
                    </p>
                  </div>
                  <span className={cn('shrink-0 font-display font-bold tabular-nums', e.kind === 'INCOME' ? 'text-emerald-200' : 'text-red-200')}>
                    {e.kind === 'INCOME' ? '+' : '−'}{pln(e.amount)}
                  </span>
                  <button onClick={() => remove(e.id)} title="Usuń wpis" className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/35 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ściąga podatkowa */}
        <div className="rounded-2xl border border-[#a78bfa]/25 bg-[#a78bfa]/[0.05] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-white mb-3"><Info className="w-4 h-4 text-[#c4b5fd]" /> Ściąga: podatek bez działalności (uczeń, bez firmy)</p>
          <ul className="space-y-2.5 text-sm text-white/65 leading-relaxed">
            <li><b className="text-white/85">Małe kwoty, nieregularnie → działalność nierejestrowana.</b> Bez ZUS, bez rejestracji — warunek: przychód w miesiącu do 75% minimalnego wynagrodzenia (kwota rośnie co roku, sprawdź aktualną). Raz w roku rozliczasz się w PIT-36.</li>
            <li><b className="text-white/85">Regularnie / powyżej limitu → firma (JDG).</b> Na start ulga: 6 mies. bez składek społecznych + 2 lata preferencyjnych („mały ZUS").</li>
            <li><b className="text-white/85">Masz mniej niż 26 lat → ulga dla młodych.</b> Do ok. 85,5 tys. zł rocznie zero PIT — ale uwaga: działa dla etatu/zlecenia, <b className="text-white/85">nie</b> dla własnej działalności.</li>
            <li><b className="text-white/85">Zapisuj każdy wpływ — to robisz tutaj.</b> Ewidencja to podstawa: kto, ile, kiedy. Przy kontroli skarbowej pokazujesz ten rejestr.</li>
            <li><b className="text-white/85">Kasa od uczniów „do ręki" też się liczy.</b> Nie ma znaczenia, czy przelew, BLIK czy gotówka — przychód to przychód.</li>
          </ul>
          <p className="mt-4 text-xs text-white/35">To ogólne informacje, nie porada podatkowa. Przed pierwszym rozliczeniem potwierdź swoją sytuację z księgową albo w urzędzie skarbowym (porada na start bywa darmowa).</p>
        </div>
      </div>
    </CoachLayout>
  )
}
