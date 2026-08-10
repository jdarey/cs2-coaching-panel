'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { AuroraBackground } from '@/components/aurora-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, GraduationCap, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const urlError = searchParams.get('error')
  const registered = searchParams.get('registered')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
        toast({ title: 'Zalogowano', description: 'Przekierowujemy…' })
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError('Wystąpił błąd. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
      <AuroraBackground variant="auth" />

      <div className="w-full max-w-md rise-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] shadow-[0_12px_32px_-8px_rgba(124,111,255,0.7)]">
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30" />
            </div>
          </div>
          <h1 className="font-display text-[2.6rem] leading-none font-bold tracking-tight text-gradient-violet mb-2">
            CS2 Coaching
          </h1>
          <p className="text-white/45 text-sm font-light">Zaloguj się do swojego panelu</p>
        </div>

        {/* Auth card */}
        <div className="relative rounded-3xl glass-liquid spotlight p-7 md:p-8" onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
          e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
        }}>
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
            <div
              className="absolute -top-20 -right-16 w-44 h-44 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(124,111,255,0.45) 0%, transparent 70%)' }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#a594ff]" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#a594ff] font-semibold">Witaj z powrotem</p>
            </div>
            <h2 className="font-display text-2xl font-bold mb-5">Zaloguj się</h2>

            {registered && (
              <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/25">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Konto utworzone — możesz się zalogować.</span>
              </div>
            )}

            {(urlError || formError) && (
              <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError || urlError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold tracking-wide text-white/70">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="twój@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold tracking-wide text-white/70">Hasło</Label>
                  <Link href="/forgot-password" className="text-xs text-white/45 hover:text-[#a594ff] transition-colors">
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-12 pl-11 pr-11 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors p-1"
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="shimmer-line group relative w-full h-12 rounded-xl overflow-hidden font-display font-semibold text-sm bg-gradient-to-r from-[#8b7bff] to-[#5a4fff] shadow-[0_12px_32px_-8px_rgba(124,111,255,0.6)] hover:shadow-[0_18px_40px_-8px_rgba(124,111,255,0.8)] hover:-translate-y-0.5 transition-all duration-300 border-0"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logowanie…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Zaloguj się
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="relative flex items-center">
                <span className="flex-1 h-px bg-white/10" />
                <span className="px-3 text-xs text-white/35 uppercase tracking-[0.18em]">lub</span>
                <span className="flex-1 h-px bg-white/10" />
              </div>
              <Link
                href="/register"
                className="shimmer-line relative block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-white bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
              >
                Załóż nowe konto
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30 font-light">
          Bezpieczne logowanie · Twoje dane są szyfrowane end-to-end
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-[#06070d] text-white">
          <AuroraBackground variant="auth" />
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#8b7bff] border-r-[#5a4fff] animate-spin" />
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
