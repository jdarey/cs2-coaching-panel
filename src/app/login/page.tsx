'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, Sparkles, Shield, Zap, Target, Crown } from 'lucide-react'
import { Suspense } from 'react'
import { useEffect, useRef } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
        }
      },
      { threshold: 0.1 }
    )

    const elements = [cardRef, titleRef, subtitleRef, formRef, footerRef].map(ref => ref.current).filter(Boolean)
    elements.forEach(el => observer.observe(el!))

    return () => elements.forEach(el => observer.unobserve(el!))
  }, [])

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
        cardRef.current?.classList.add('shake')
        setTimeout(() => cardRef.current?.classList.remove('shake'), 500)
      } else {
        toast({ title: 'Zalogowano', description: 'Witamy w panelu CS2 Coaching' })
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError('Wystąpił błąd. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float-slow" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary-glow) / 0.2))' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-float animate-float-delayed" style={{ background: 'linear-gradient(135deg, hsl(var(--primary-glow) / 0.2), hsl(var(--purple-500) / 0.2))' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl animate-float" style={{ background: 'linear-gradient(135deg, hsl(var(--purple-500) / 0.15), hsl(var(--pink-500) / 0.15))' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid opacity-50 dark:opacity-30" />
        
        {/* Radial Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-radial from-primary/10 to-transparent" style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-radial from-primary-glow/10 to-transparent" style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary-glow) / 0.1) 0%, transparent 70%)' }} />
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="fixed w-1 h-1 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
              background: `hsl(var(--primary) / 0.3)`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div ref={titleRef} className="text-center mb-10 opacity-0 translate-y-10 transition-all duration-700 ease-out animate-in:opacity-100 animate-in:translate-y-0">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative p-3 rounded-2xl shadow-xl shadow-primary/25" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }}>
              <Target className="w-8 h-8 text-primary-foreground" />
              <div className="absolute -inset-1 rounded-2xl blur-xl opacity-30 animate-pulse-glow" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }} />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)), hsl(var(--purple-500)))' }}>
              CS2 Coaching
            </span>
          </div>
          <p className="text-lg text-muted-foreground font-medium max-w-xs mx-auto">
            Profesjonalny panel coachingowy dla graczy CS2
          </p>
        </div>

        {/* Badges */}
        <div ref={subtitleRef} className="flex flex-wrap justify-center gap-2 mb-8 opacity-0 translate-y-10 transition-all duration-700 ease-out delay-100 animate-in:opacity-100 animate-in:translate-y-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-xs font-medium text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Bezpieczne logowanie
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-xs font-medium text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Szybki dostęp
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 text-xs font-medium text-muted-foreground">
            <Crown className="w-3.5 h-3.5 text-primary" />
            Premium SaaS
          </span>
        </div>

        {/* Login Card */}
        <div 
          ref={cardRef} 
          className="card-premium relative overflow-hidden opacity-0 translate-y-20 transition-all duration-800 ease-out delay-200 animate-in:opacity-100 animate-in:translate-y-0"
        >
          {/* Top Glow Border */}
          <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)), hsl(var(--purple-500)))' }} />
          
          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />

          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold bg-clip-text text-transparent" style={{ background: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--foreground) / 0.8), hsl(var(--muted-foreground)))' }}>
                Witaj z powrotem
              </CardTitle>
              <CardDescription className="text-muted-foreground/80 mt-1">
                Zaloguj się, aby uzyskać dostęp do panelu
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
                {(error || formError) && (
                  <div className="relative flex items-center gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-slide-up">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{formError || error}</span>
                  </div>
                )}

                {/* Email Field */}
                <div className="relative">
                  <Label htmlFor="email" className="label-premium">
                    Adres e-mail
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="twój@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className="input-premium pl-12 transition-all duration-300"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                    {focusedField === 'email' && (
                      <div className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full transition-all duration-300" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }} />
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="password" className="label-premium mb-0">
                      Hasło
                    </Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-xs text-primary hover:text-primary-glow font-medium transition-colors"
                    >
                      Zapomniałeś hasła?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="input-premium pl-12 pr-12 transition-all duration-300"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-all duration-300 p-1"
                      aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {focusedField === 'password' && (
                      <div className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full transition-all duration-300" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }} />
                    )}
                  </div>
                </div>

                {/* Remember & Submit */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded-lg border border-input bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">Zapamiętaj mnie</span>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="btn-primary w-full group relative overflow-hidden"
                  disabled={isLoading}
                  size="lg"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Logowanie...
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-base">Zaloguj się</span>
                        <Zap className="w-5 h-5" />
                      </>
                    )}
                  </span>
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="border-t border-border/50 pt-6">
              <Separator className="mb-6" >lub</Separator>
              
              <div className="space-y-3">
                <Link href="/register" className="btn-secondary w-full">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Załóż konto</span>
                </Link>
                
<Link href="/demo" className="btn-ghost w-full group">
  <span className="relative z-10 flex items-center justify-center gap-2">
    <Target className="w-5 h-5" />
    <span className="font-medium">Wersja demonstracyjna</span>
  </span>
  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, transparent, hsl(var(--primary) / 0.1), transparent)', transform: 'translateX(-100%)', transition: 'transform 0.7s ease-out' }} />
</Link>
              </div>
            </CardFooter>
          </Card>

          {/* Floating Decorations */}
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), transparent)' }} />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary-glow) / 0.1), transparent)' }} />
        </div>

        {/* Footer */}
        <div ref={footerRef} className="mt-10 text-center opacity-0 translate-y-10 transition-all duration-700 ease-out delay-300 animate-in:opacity-100 animate-in:translate-y-0">
          <p className="text-sm text-muted-foreground/60 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-primary/50" />
            CS2 Coaching Panel v2.0 — Premium SaaS Platform
          </p>
          <p className="text-xs text-muted-foreground/40 mt-2">
            Zbudowane z skupieniem na wydajności, bezpieczeństwie i UX
          </p>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 opacity-0 translate-y-10 transition-all duration-700 ease-out delay-400 animate-in:opacity-100 animate-in:translate-y-0">
        <button 
          className="p-3 rounded-xl glass-card shadow-xl hover:shadow-2xl transition-all duration-300 group"
          title="Wsparcie"
        >
          <span className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">?</span>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }} />
        </button>
        <button 
          className="p-3 rounded-xl glass-card shadow-xl hover:shadow-2xl transition-all duration-300 group"
          title="Tryb ciemny"
        >
          <span className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">🌙</span>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))' }} />
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted)))' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Inicjalizacja panelu...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}