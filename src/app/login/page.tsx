'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { AuroraBackground } from '@/components/aurora-background'
import { RedirectOverlay } from '@/components/redirect-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, GraduationCap, ShieldCheck, ChevronRight,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  // Absolute callbackUrl: next-auth/react resolves the POST response with
  // `new URL(data.url)`, which throws on a relative path ('/') and makes the
  // whole login fail with a generic error. Build an absolute URL from the
  // browser's own origin so the client-side parse always succeeds and the
  // redirect after login stays on the same origin. SSR-guarded: this client
  // component can be executed on the server (Suspense fallback path), where
  // `window` does not exist — accessing it there crashed the whole /login
  // request (and the dev server) with ReferenceError.
  const callbackUrl = (() => {
    if (typeof window === 'undefined') return '/'
    const raw = searchParams.get('callbackUrl')
    return raw
      ? (raw.startsWith('http') ? raw : new URL(raw, window.location.origin).toString())
      : window.location.origin + '/'
  })()
  const urlError = searchParams.get('error')
  const registered = searchParams.get('registered')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (res?.error) {
        setFormError('Nieprawidłowy email lub hasło')
        toast({ title: 'Błąd logowania', description: 'Nieprawidłowy email lub hasło', variant: 'destructive' })
      } else {
        // Premium SaaS transition: full-screen overlay plays a short animated
        // sequence, then RedirectOverlay navigates to the dashboard.
        setRedirecting(true)
        setIsLoading(true)
      }
    } catch {
      setFormError('Wystąpił błąd. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-14 font-sans text-white overflow-hidden">
      <RedirectOverlay
        to={callbackUrl}
        visible={redirecting}
        label={callbackUrl === '/' ? 'Otwieramy Twój dashboard' : 'Otwieramy żądaną stronę'}
        stages={['Uwierzytelnianie', 'Weryfikacja sesji', 'Przygotowanie panelu', 'Prawie gotowe']}
      />
      <AuroraBackground variant="auth" intensity={0.9} />

      {/* Single breathing violet glow — the one focal point */}
      <div className="pointer-events-none absolute top-[8%] left-1/2 -translate-x-1/2 w-[620px] h-[420px] animate-breathe" aria-hidden>
        <div className="absolute inset-0 rounded-full blur-[110px]" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(139,92,246,0.32) 0%, rgba(109,40,217,0.10) 45%, transparent 75%)' }} />
      </div>
      {/* Hairline top accent */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-transparent" aria-hidden />

      <div className="relative z-10 w-full max-w-sm">
        {/* ===== Brand — restrained, refined ===== */}
        <div className="flex flex-col items-center text-center mb-10 animate-fade-in-slow">
          <Link href="/" className="group mb-6" aria-label="CS2 Coaching">
            <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/15 shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)] transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_56px_-6px_rgba(139,92,246,0.8)]">
              <GraduationCap className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
          </Link>
          <p className="text-[10px] uppercase tracking-[0.34em] text-white/35 font-semibold mb-4">CS2 Coaching</p>
          <h1 className="font-display text-4xl sm:text-[2.75rem] font-bold tracking-tight leading-[1.04] text-white">
            Witaj z powrotem.
          </h1>
          <p className="mt-3 text-sm text-white/40 font-light tracking-wide">
            Zaloguj się, aby kontynuować trening.
          </p>
        </div>

        {/* ===== Card — hairline, barely there ===== */}
        <div className="animate-fade-in-slow rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-7 sm:p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)]" style={{ animationDelay: '120ms' }}>
          {registered && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-[#34d399] bg-[#34d399]/[0.08] border border-[#34d399]/20">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Konto utworzone — możesz się zalogować.</span>
            </div>
          )}

          {(urlError || formError) && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-300 bg-red-500/[0.08] border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError || urlError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-colors duration-300 group-focus-within:text-[#c4b5fd]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="twój@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 w-full rounded-xl pl-10 pr-4 text-sm bg-white/[0.03] border border-white/[0.09] text-white placeholder:text-white/25 transition-all duration-300 focus:border-[#a78bfa]/60 focus:bg-white/[0.05] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-semibold">Hasło</Label>
                <Link href="/forgot-password" className="text-xs text-white/35 hover:text-[#c4b5fd] transition-colors font-medium">
                  Zapomniałeś?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-colors duration-300 group-focus-within:text-[#c4b5fd]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl pl-10 pr-11 text-sm bg-white/[0.03] border border-white/[0.09] text-white placeholder:text-white/25 transition-all duration-300 focus:border-[#a78bfa]/60 focus:bg-white/[0.05] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 transition-colors"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="group relative w-full h-11 rounded-xl font-display font-semibold text-sm text-white overflow-hidden animate-shimmer bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] shadow-[0_12px_40px_-12px_rgba(139,92,246,0.6)] hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              {isLoading ? (
                <span className="flex items-center gap-2 relative z-10">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logowanie…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  Zaloguj się
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-7 flex items-center gap-3">
            <span className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-[10px] text-white/25 uppercase tracking-[0.2em]">lub</span>
            <span className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <Link
            href="/register"
            className="mt-5 block w-full text-center py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1] transition-all duration-300"
          >
            Załóż nowe konto
          </Link>
        </div>

        {/* ===== Footer — whisper quiet ===== */}
        <p className="mt-8 text-center text-[11px] text-white/20 font-light tracking-wide animate-fade-in-slow" style={{ animationDelay: '260ms' }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#34d399]" />
            </span>
            Wszystkie systemy działają · dane szyfrowane end-to-end
          </span>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-[#07060c] text-white">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-6 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/40 text-sm font-display">Ładowanie…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
