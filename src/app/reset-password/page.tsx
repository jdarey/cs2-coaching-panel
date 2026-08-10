'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuroraBackground } from '@/components/aurora-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, GraduationCap, KeyRound, ArrowLeft } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setFormError('Brakujący lub nieprawidłowy link. Poproś o nowy link do zresetowania hasła.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError('Hasło musi mieć co najmniej 8 znaków')
      return
    }
    if (password !== confirm) {
      setFormError('Hasła nie są identyczne')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data?.error || 'Wystąpił błąd. Spróbuj ponownie.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/login'), 2500)
      }
    } catch {
      setFormError('Wystąpił błąd. Spróbuj ponownie.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
      <AuroraBackground variant="auth" />

      <div className="relative z-10 w-full max-w-md animate-rise-in">
        {/* Brand */}
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-3 mb-8 group">
            <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] shadow-[0_16px_40px_-10px_rgba(20,184,166,0.6)] transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
              <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
            </div>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] uppercase tracking-widest text-white/55 font-semibold mb-5">
            <span className="live-dot" />
            Nowe hasło
          </div>
          <h1 className="font-display text-display-md font-bold tracking-tight text-gradient-vantor mb-3">
            CS2 Coaching
          </h1>
          <p className="text-white/45 text-sm font-light">Ustaw nowe hasło</p>
        </div>

        {/* Card */}
        <div className="animate-rise-in animate-rise-in-delay-1 relative rounded-3xl glass-card p-7 md:p-10">
          <div className="relative z-10">
            {done ? (
              <div className="text-center py-4">
                <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-[#34d399]/15 border border-[#34d399]/30 mb-5">
                  <CheckCircle2 className="w-7 h-7 text-[#34d399]" />
                </div>
                <h2 className="font-display text-xl font-bold mb-3">Hasło zmienione!</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  Twoje hasło zostało zaktualizowane. Za chwilę przeniesiemy Cię do logowania.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#8cffef] hover:text-white transition-colors"
                >
                  Przejdź do logowania <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-[#8cffef]" />
                  <p className="text-[11px] uppercase tracking-widest text-[#8cffef] font-semibold">Nowe hasło</p>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Ustaw nowe hasło</h2>

                {formError && (
                  <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20 animate-rise-in-delay-2">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 animate-rise-in-delay-2" style={{ animationDelay: '120ms' }}>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="label-premium mb-0">Nowe hasło</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#8cffef]" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="input-premium pl-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80 transition-colors p-1"
                        aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="confirm" className="label-premium mb-0">Powtórz hasło</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#8cffef]" />
                      <Input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="input-premium pl-12"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className=" group relative w-full h-13 rounded-xl overflow-hidden font-display font-semibold text-sm btn-primary-gradient"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Zapisywanie…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Zapisz nowe hasło</span>
                    )}
                  </Button>
                </form>

                <Link
                  href="/login"
                  className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-white/55 hover:text-[#8cffef] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Wróć do logowania
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-[#060606] text-white">
          <AuroraBackground variant="auth" />
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white/60 animate-spin" />
            </div>
            <p className="text-white/40 text-sm font-display">Ładowanie…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
