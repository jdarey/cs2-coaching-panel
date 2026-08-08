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
  const [emailValid, setEmailValid] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)

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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const elements = [cardRef, titleRef, subtitleRef, formRef, footerRef].map(ref => ref.current).filter(Boolean)
    elements.forEach(el => observer.observe(el!))

    return () => elements.forEach(el => observer.unobserve(el!))
  }, [])

  const validateEmail = (value: string) => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    setEmailValid(valid && value.length > 0)
    return valid
  }

  const validatePassword = (value: string) => {
    const valid = value.length >= 8
    setPasswordValid(valid)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail(email) || !validatePassword(password)) {
      setFormError('Sprawdź poprawność emaila i hasła (min. 8 znaków)')
      cardRef.current?.classList.add('shake')
      setTimeout(() => cardRef.current?.classList.remove('shake'), 500)
      return
    }

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
        toast({ title: 'Zalogowano', description: 'Przekierowujemy do panelu...' })
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError('Wystąpił błąd połączenia. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl animate-float animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute inset-0 bg-grid opacity-30 dark:opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-radial from-primary/5 to-transparent" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-radial from-primary-glow/5 to-transparent" />
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="fixed w-1 h-1 bg-primary/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div ref={titleRef} className="text-center mb-10 opacity-0 translate-y-8 transition-all duration-700 ease-out animate-in:opacity-100 animate-in:translate-y-0">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-purple-500 bg-clip-text text-transparent">
              CS2 Coaching
            </span>
          </div>
          <p className="text-muted-foreground mt-2">Profesjonalny panel coachingowy dla graczy CS2</p>
        </div>

        <div ref={subtitleRef} className="flex flex-wrap justify-center gap-2 mb-8 opacity-0 translate-y-8 transition-all duration-700 ease-out delay-100 animate-in:opacity-100 animate-in:translate-y-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Shield className="w-3.5 h-3.5" /> Bezpieczne logowanie
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Zap className="w-3.5 h-3.5" /> Szybki dostęp
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Crown className="w-3.5 h-3.5" /> Premium SaaS
          </span>
        </div>

        <div ref={cardRef} className="opacity-0 translate-y-8 transition-all duration-800 ease-out delay-200 animate-in:opacity-100 animate-in:translate-y-0">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Witaj z powrotem</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">Zaloguj się, aby kontynuować do panelu</CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
                {(error || formError) && (
                  <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-slide-up">
                    <AlertCircle className="w-4 h-4" />
                    <span>{formError || error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="twój@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Hasło</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">Zapomniałeś hasła?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="text-sm text-muted-foreground">Zapamiętaj mnie</span>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Zaloguj się
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Separator>lub</Separator>
              <Link href="/register" className="btn-secondary w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Załóż konto
              </Link>
              <Link href="/demo" className="btn-ghost w-full">
                <Target className="mr-2 h-4 w-4" />
                Wersja demonstracyjna
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div ref={footerRef} className="mt-8 text-center opacity-0 translate-y-4 transition-all duration-700 ease-out delay-300 animate-in:opacity-100 animate-in:translate-y-0">
          <p className="text-sm text-muted-foreground">CS2 Coaching Panel — Premium SaaS Platform</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Ładowanie...</p></div></div>}>
      <LoginForm />
    </Suspense>
  )
}