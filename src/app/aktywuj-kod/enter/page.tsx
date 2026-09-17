import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { KeyRound, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Aktywuj kod — Rutyna CS2',
}

// Czyta sesję (getServerSession) — musi być dynamiczne.
export const dynamic = 'force-dynamic'

/**
 * Pośredni krok aktywacji bez sesji: kupujący bez konta trafia tu z landinga.
 * Wybiera: załóż konto (z powrotem do aktywacji) albo zaloguj się.
 * Zalogowany uczeń leci od razu na właściwą stronę aktywacji.
 */
export default async function ActivateEnterPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const role = (session.user as any).role
    if (role === 'STUDENT') redirect('/aktywuj-kod')
    if (role === 'ADMIN') redirect('/coach/routines')
    redirect('/coach/dashboard')
  }

  return (
    <main className="relative min-h-screen overflow-x-clip font-sans text-white bg-[#07060c]">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
        <div className="relative z-10 w-full max-w-md animate-rise-in text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/15 shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)]">
            <KeyRound className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Masz kod dostępu?</h1>
          <p className="mt-3 text-sm text-white/50">
            Najpierw konto (30 sekund), potem aktywacja kodu i pełna rutyna CS2 w Twoim panelu.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/register?next=%2Faktywuj-kod"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white btn-darey"
            >
              Załóż konto i aktywuj kod <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login?callbackUrl=%2Faktywuj-kod"
              className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium text-white/70 glass transition hover:text-white"
            >
              Mam już konto
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/30">Kod otrzymasz mailem bezpośrednio po zakupie.</p>
        </div>
      </div>
    </main>
  )
}
