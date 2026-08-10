'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { AuroraBackground } from '@/components/aurora-background'
import { Tilt3D } from '@/components/tilt-3d'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, User, AlertCircle, GraduationCap, ShieldCheck, Sparkles, ArrowRight, ChevronRight, GraduationCap as GraduationCapIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react'

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

  const roles: { key: 'STUDENT' | 'COACH'; label: string; sub: string; Icon: typeof GraduationCapIcon; color: string; ring: string }[] = [
    { key: 'STUDENT', label: 'Uczeń', sub: 'Chcę się uczyć', Icon: GraduationCapIcon, color: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(96,165,250,0.4)' },
    { key: 'COACH', label: 'Trener', sub: 'Chcę uczyć innych', Icon: ShieldCheckIcon, color: 'from-[#a855f7] to-[#d946ef]', ring: 'rgba(168,85,247,0.4)' },
  ]

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-sans text-white">
      <AuroraBackground variant="auth" />

      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full blur-3xl opacity-20 animate-aurora" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-10 w-64 h-64 rounded-full blur-3xl opacity-15 animate-aurora-reverse" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-rise-in">
        {/* Brand */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-white shadow-[0_16px_40px_-12px_rgba(255,255,255,0.25)] transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
              <GraduationCap className="w-7 h-7 text-[#060606]" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
            </div>
          </Link>
          <h1 className="font-display text-3xl md:text-4xl leading-none font-bold tracking-tight text-gradient-premium mb-3">
            CS2 Coaching
          </h1>
          <p className="text-white/45 text-sm font-light">Utwórz nowe konto</p>
        </div>

        {/* Card — tilts in 3D toward the cursor */}
        <Tilt3D
          wrapperClassName="animate-rise-in animate-rise-in-delay-1"
          className="relative rounded-3xl glass-card p-7 md:p-10 shimmer-sweep"
          maxTilt={4}
        >
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-20 w-52 h-52 rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#a594ff]" />
              <p className="text-[11px] uppercase tracking-widest text-[#a594ff] font-semibold">Rejestracja</p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Załóż konto</h2>

            {formError && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20 animate-rise-in-delay-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 animate-rise-in-delay-2" style={{ animationDelay: '100ms' }}>
              {/* Role selector */}
              <div className="space-y-3">
                <Label className="label-premium">Kim chcesz być?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const Icon = r.Icon
                    const active = formData.role === r.key
                    return (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => setFormData((prev) => ({ ...prev, role: r.key }))}
                        className={cn(
                          'relative group flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all duration-300 overflow-hidden',
                          active
                            ? 'border-[#8b7bff]/50 bg-[#8b7bff]/10 shadow-[0_0_28px_-8px_rgba(139,123,255,0.5)]'
                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]',
                        )}
                      >
                        <div
                          className={cn('relative p-3.5 rounded-xl bg-gradient-to-br grid place-items-center', r.color)}
                          style={{ boxShadow: active ? `0 12px 32px -8px ${r.ring}` : 'none' }}
                        >
                          <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                          <div className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{r.label}</p>
                          <p className="text-[11px] text-white/45">{r.sub}</p>
                        </div>
                        {active && (
                          <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#8b7bff] shadow-[0_0_12px_rgba(139,123,255,0.8)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2.5">
                <Label htmlFor="email" className="label-premium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
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
                    className="input-premium pl-12"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-red-300 mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Name */}
              <div className="space-y-2.5">
                <Label htmlFor="name" className="label-premium">Imię <span className="text-white/30 normal-case font-normal">(opcjonalnie)</span></Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
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
                    className="input-premium pl-12"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-red-300 mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2.5">
                <Label htmlFor="password" className="label-premium">Hasło</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
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
                    className="input-premium pl-12"
                  />
                </div>
                {fieldErrors.password && <p className="text-xs text-red-300 mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="label-premium">Potwierdź hasło</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#a594ff]" />
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
                    className="input-premium pl-12"
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="text-xs text-red-300 mt-1">{fieldErrors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                className="shimmer-sweep btn-3d group relative w-full h-13 rounded-xl overflow-hidden font-display font-semibold text-sm btn-primary-gradient"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Tworzenie konta…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Utwórz konto
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 animate-rise-in-delay-3" style={{ animationDelay: '160ms' }}>
              <div className="relative flex items-center">
                <span className="flex-1 h-px bg-white/10" />
                <span className="px-4 text-[11px] text-white/30 uppercase tracking-widest">lub</span>
                <span className="flex-1 h-px bg-white/10" />
              </div>
              <Link
                href="/login"
                className="mt-4 shimmer-sweep relative block w-full text-center px-5 py-3.5 rounded-xl text-sm font-medium text-white glass hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
              >
                Masz już konto? Zaloguj się
              </Link>
            </div>
          </div>
        </Tilt3D>

        <p className="mt-8 text-center text-[11px] text-white/30 font-light tracking-wide">
          Tworząc konto akceptujesz regulamin i politykę prywatności
        </p>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}