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
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, GraduationCap, Sparkles, ShieldCheck, ArrowRight, ChevronRight } from 'lucide-react'

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

      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full blur-3xl opacity-20 animate-aurora" style={{ background: 'radial-gradient(circle, rgba(139,123,255,0.5) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-10 w-64 h-64 rounded-full blur-3xl opacity-15 animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.4) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-rise-in">
        {/* Brand */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] shadow-[0_16px_40px_-10px_rgba(139,123,255,0.7)] transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
              <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30" />
            </div>
          </Link>
          <h1 className="font-display text-3xl md:text-4xl leading-none font-bold tracking-tight text-gradient-premium mb-3">
            CS2 Coaching
          </h1>
          <p className="text-white/45 text-sm font-light">Zaloguj się do swojego panelu</p>
        </div>

        {/* Auth card */}
        <div
          className="relative rounded-3xl glass-card p-7 md:p-10 animate-rise-in-delay-1 shimmer-sweep"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
            e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
          }}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-20 w-52 h-52 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,123,255,0.45) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#a594ff]" />
              <p className="text-[11px] uppercase tracking-widest text-[#a594ff] font-semibold">Witaj z powrotem</p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Zaloguj się</h2>

            {registered && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/25 animate-rise-in-delay-2">
                <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0" />
                <span>Konto utworzone — możesz się zalogować.</span>
              </div>
            )}

            {(urlError || formError) && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20 animate-rise-in-delay-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{formError || urlError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 animate-rise-in-delay-2" style={{ animationDelay: '120ms' }}>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="label-premium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="twój@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="input-premium pl-12"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="label-premium mb-0">Hasło</Label>
                  <Link href="/forgot-password" className="text-xs text-white/45 hover:text-[#a594ff] transition-colors font-medium">
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
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

              <Button
                type="submit"
                className="shimmer-sweep group relative w-full h-13 rounded-xl overflow-hidden font-display font-semibold text-sm btn-primary-gradient"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logowanie…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Zaloguj się
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-4 animate-rise-in-delay-3" style={{ animationDelay: '180ms' }}>
              <div className="relative flex items-center">
                <span className="flex-1 h-px bg-white/10" />
                <span className="px-4 text-[11px] text-white/30 uppercase tracking-widest">lub</span>
                <span className="flex-1 h-px bg-white/10" />
              </div>
              <Link
                href="/register"
                className="shimmer-sweep relative block w-full text-center px-5 py-3.5 rounded-xl text-sm font-medium text-white glass hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
              >
                Załóż nowe konto
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-white/30 font-light tracking-wide">
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
            <div className="relative w-16 h-16 mx-auto mb-6">
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