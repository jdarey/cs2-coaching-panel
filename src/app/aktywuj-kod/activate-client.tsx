'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuroraBackground } from '@/components/aurora-background'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

function normalizeLocal(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 11)
}

function formatAsTyped(raw: string): string {
  const cleaned = normalizeLocal(raw)
  if (!cleaned.startsWith('CS2')) return cleaned
  const rest = cleaned.slice(3)
  if (rest.length <= 4) return `CS2-${rest}`
  return `CS2-${rest.slice(0, 4)}-${rest.slice(4, 8)}`
}

export function ActivateCodeClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/access/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Nie udało się aktywować kodu')
        return
      }
      setDone(true)
      toast({ title: 'Kod aktywowany', description: 'Twoja rutyna czeka w Zadaniach treningowych.' })
      setTimeout(() => {
        router.push('/student/tasks')
        router.refresh()
      }, 900)
    } catch {
      setError('Brak połączenia — spróbuj ponownie')
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
        <AuroraBackground variant="auth" />
        <div className="relative z-10 w-full max-w-md animate-rise-in text-center">
          <div className="rounded-3xl glass-card p-10">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/25">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Kod aktywowany!</h1>
            <p className="text-sm text-white/50 mb-8">Pełna rutyna CS2 jest już Twoja. Przenosimy Cię do zadań…</p>
            <div className="mx-auto mb-8 h-1 w-40 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#2dd4bf] bar-shimmer" />
            </div>
            <Link href="/student/tasks" className="inline-flex items-center gap-2 text-sm font-semibold text-[#c4b5fd] hover:text-white transition">
              Otwórz teraz <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
      <AuroraBackground variant="auth" />

      <div className="relative z-10 w-full max-w-md animate-rise-in">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/15 shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)]">
            <KeyRound className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.34em] text-white/35 font-semibold">Rutyna CS2</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Aktywuj swój kod</h1>
          <p className="mt-3 text-sm text-white/45">
            Kod otrzymałeś po zakupie. Wpisz go dokładnie tak, jak jest w mailu — myślniki możesz pominąć.
          </p>
        </div>

        <div className="rounded-3xl glass-card p-7 sm:p-8">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-300 bg-red-500/[0.08] border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="access-code" className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">
                Kod dostępu
              </label>
              <input
                id="access-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="CS2-XXXX-XXXX"
                value={formatAsTyped(code)}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                className="h-14 w-full rounded-xl bg-white/[0.03] border border-white/[0.09] px-4 text-center font-display text-xl font-bold tracking-[0.18em] text-white placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-white/25 outline-none transition-all duration-300 focus:border-[#a78bfa]/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || normalizeLocal(code).length < 11}
              className="relative overflow-hidden inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white btn-darey disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {isLoading ? 'Aktywuję…' : 'Aktywuj i odbierz rutynę'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-white/35">
            Nie masz konta?{' '}
            <Link href="/register?next=%2Faktywuj-kod" className="text-[#c4b5fd] hover:text-white transition font-medium">
              Załóż je najpierw
            </Link>{' '}
            — kod aktywujesz po zalogowaniu.
          </p>
        </div>
      </div>
    </div>
  )
}

export function AlreadyActiveNotice({ routineTitle }: { routineTitle: string }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
      <AuroraBackground variant="auth" />
      <div className="relative z-10 w-full max-w-md animate-rise-in text-center">
        <div className="rounded-3xl glass-card p-10">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Produkt już aktywny</h1>
          <p className="text-sm text-white/50 mb-8">
            „{routineTitle}” jest przypisane do Twojego konta i czeka w zadatach treningowych.
          </p>
          <Link href="/student/tasks" className="inline-flex items-center gap-2 rounded-xl px-6 h-11 text-sm font-semibold text-white btn-darey">
            Przejdź do rutyny <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
