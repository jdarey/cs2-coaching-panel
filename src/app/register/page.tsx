'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { AuroraBackground } from '@/components/aurora-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, User, AlertCircle, GraduationCap, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'STUDENT' as 'COACH' | 'STUDENT',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        if (!value) return 'Email jest wymagany'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Nieprawidłowy format email'
        return ''
      case 'password':
        if (!value) return 'Hasło jest wymagane'
        if (value.length < 6) return 'Hasło musi mieć minimum 6 znaków'
        return ''
      case 'confirmPassword':
        if (value !== formData.password) return 'Hasła nie są identyczne'
        return ''
      case 'name':
        if (value && value.length < 2) return 'Imię musi mieć minimum 2 znaki'
        return ''
      default:
        return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const errors: Record<string, string> = {}
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof typeof formData])
      if (error) errors[key] = error
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name || undefined,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Wystąpił błąd podczas rejestracji')
        if (data.details) {
          setFieldErrors(data.details.flatten().fieldErrors as Record<string, string>)
        }
        toast({ title: 'Błąd rejestracji', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Konto utworzone', description: 'Pomyślnie zarejestrowano. Logowanie…' })
      router.push('/login?registered=true')
      router.refresh()
    } catch {
      setFormError('Wystąpił błąd serwera. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const roles: { key: 'STUDENT' | 'COACH'; label: string; sub: string; icon: typeof User; color: string; ring: string }[] = [
    { key: 'STUDENT', label: 'Uczeń', sub: 'Chcę się uczyć', icon: GraduationCap, color: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(59,130,246,0.45)' },
    { key: 'COACH', label: 'Trener', sub: 'Chcę uczyć innych', icon: ShieldCheck, color: 'from-[#a855f7] to-[#d946ef]', ring: 'rgba(168,85,247,0.45)' },
  ]

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
          <p className="text-white/45 text-sm font-light">Utwórz nowe konto</p>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl glass-liquid p-7 md:p-8">
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
            <div
              className="absolute -top-20 -left-16 w-44 h-44 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#a594ff]" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#a594ff] font-semibold">Rejestracja</p>
            </div>
            <h2 className="font-display text-2xl font-bold mb-5">Załóż konto</h2>

            {formError && (
              <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide text-white/70">Kim chcesz być?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const Icon = r.icon
                    const active = formData.role === r.key
                    return (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => setFormData((prev) => ({ ...prev, role: r.key }))}
                        className={`relative group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                          active
                            ? 'border-[#8b7bff]/50 bg-[#8b7bff]/10 shadow-[0_0_24px_-6px_rgba(124,111,255,0.5)]'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15]'
                        }`}
                      >
                        <div
                          className={`relative p-2.5 rounded-xl bg-gradient-to-br grid place-items-center ${r.color}`}
                          style={{ boxShadow: active ? `0 10px 28px -8px ${r.ring}` : 'none' }}
                        >
                          <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                          <div className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{r.label}</p>
                          <p className="text-[11px] text-white/45">{r.sub}</p>
                        </div>
                        {active && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8b7bff] shadow-[0_0_10px_rgba(124,111,255,0.8)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold tracking-wide text-white/70">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="twój@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-red-300 mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold tracking-wide text-white/70">Imię <span className="text-white/30 normal-case">(opcjonalnie)</span></Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Twoje imię"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.name}
                    className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-red-300 mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold tracking-wide text-white/70">Hasło</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                </div>
                {fieldErrors.password && <p className="text-xs text-red-300 mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wide text-white/70">Potwierdź hasło</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    className="h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 transition-all duration-300"
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="text-xs text-red-300 mt-1">{fieldErrors.confirmPassword}</p>}
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
                    Tworzenie konta…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Utwórz konto
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 relative flex items-center">
              <span className="flex-1 h-px bg-white/10" />
              <span className="px-3 text-xs text-white/35 uppercase tracking-[0.18em]">lub</span>
              <span className="flex-1 h-px bg-white/10" />
            </div>

            <Link
              href="/login"
              className="mt-4 shimmer-line relative block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-white bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
            >
              Masz już konto? Zaloguj się
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30 font-light">
          Akceptując rejestrację otrzymujesz pełen dostęp do panelu
        </p>
      </div>
    </div>
  )
}
