import Link from 'next/link'
import { CheckCircle2, KeyRound, Mail, ArrowRight } from 'lucide-react'
import { retrieveSessionPaid } from '@/lib/stripe'

export const metadata = {
  title: 'Dziękujemy za zakup — Rutyna CS2',
  description: 'Płatność przyjęta. Sprawdź maila z kodem dostępu i aktywuj rutynę w 30 sekund.',
}

// Odczyt sesji Stripe wymaga requestu — strona zawsze dynamiczna.
export const dynamic = 'force-dynamic'

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id
  // null = brak konfiguracji Stripe lub błąd odczytu → pokazujemy neutralną wersję
  const paid = sessionId ? await retrieveSessionPaid(sessionId) : null

  return (
    <main className="relative min-h-screen overflow-x-clip font-sans text-white bg-[#07060c]">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(139,92,246,0.5), transparent 75%)' }} />
        </div>

        <div className="relative z-10 w-full max-w-lg animate-rise-in text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/25 shadow-[0_0_44px_-8px_rgba(52,211,153,0.6)]">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Dziękujemy za zakup!
          </h1>
          <p className="mx-auto mt-4 max-w-md text-white/55">
            {paid === false ? (
              <>Wykrywamy, że płatność jeszcze nie doszła — jeśli właśnie ją zatwierdziłeś, daj jej chwilę i odśwież stronę.</>
            ) : (
              <>Płatność przyjęta. Za chwilę dostaniesz maila z <strong className="text-white/85">jednorazowym kodem dostępu</strong> (format <span className="font-mono text-[#c4b5fd]">CS2-XXXX-XXXX</span>).</>
            )}
          </p>

          <div className="mt-10 rounded-3xl glass-card p-7 text-left">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4b5fd]">
              <Mail className="h-4 w-4" /> Co teraz — 3 kroki
            </p>
            <ol className="space-y-4 text-sm text-white/60">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#a78bfa]/15 text-xs font-black text-[#c4b5fd]">1</span>
                <span>Sprawdź skrzynkę (i folder spam) — mail z kodem przychodzi zwykle w ciągu minuty od zakupu.</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#a78bfa]/15 text-xs font-black text-[#c4b5fd]">2</span>
                <span>Załóż konto — zajmie Ci to 30 sekund. Konto ucznia, bez karty.</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#a78bfa]/15 text-xs font-black text-[#c4b5fd]">3</span>
                <span>Wpisz kod na stronie aktywacji — rutyna pojawi się w Twoim panelu razem z timerem i kalendarzem.</span>
              </li>
            </ol>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/aktywuj-kod/enter"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white btn-darey"
              >
                <KeyRound className="h-4 w-4" /> Mam kod — aktywuję
              </Link>
              <Link
                href="/register?next=%2Faktywuj-kod"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white/70 glass transition hover:text-white"
              >
                Załóż konto najpierw <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-6 text-xs text-white/30">
            Mail nie przyszedł po 10 minutach? Napisz do nas — rozwikłamy sprawę.
          </p>
        </div>
      </div>
    </main>
  )
}
