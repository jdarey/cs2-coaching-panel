'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuroraBackground } from '@/components/aurora-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, ArrowLeft, AlertCircle, CheckCircle2, GraduationCap, KeyRound, ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data?.error || 'Wystąpił błąd. Spróbuj ponownie.')
      } else {
        setSent(true)
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
            <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
              <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
            </div>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] uppercase tracking-widest text-white/55 font-semibold mb-5">
            <span className="live-dot" />
            Odzyskaj dostęp
          </div>
          <h1 className="font-display text-display-md font-bold tracking-tight text-gradient-vantor mb-3">
            CS2 Coaching
          </h1>
          <p className="text-white/45 text-sm font-light">Zresetuj swoje hasło</p>
        </div>

        {/* Card */}
        <div className="animate-rise-in animate-rise-in-delay-1 relative rounded-3xl glass-card p-7 md:p-10">
          <div className="relative z-10">
            {sent ? (
              <div className="text-center py-4">
                <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-[#34d399]/15 border border-[#34d399]/30 mb-5">
                  <CheckCircle2 className="w-7 h-7 text-[#34d399]" />
                </div>
                <h2 className="font-display text-xl font-bold mb-3">Sprawdź swoją skrzynkę</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  Jeśli konto o adresie <span className="text-white/80">{email}</span> istnieje,
                  wysłaliśmy na nie link do zresetowania hasła. Sprawdź też folder spam.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#8cffef] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Wróć do logowania
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-[#8cffef]" />
                  <p className="text-[11px] uppercase tracking-widest text-[#8cffef] font-semibold">Odzyskiwanie hasła</p>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Nie pamiętasz hasła?</h2>
                <p className="text-white/45 text-sm mb-6 leading-relaxed">
                  Podaj adres email powiązany z kontem, a wyślemy Ci link do ustawienia nowego hasła.
                </p>

                {formError && (
                  <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20 animate-rise-in-delay-2">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 animate-rise-in-delay-2" style={{ animationDelay: '120ms' }}>
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="label-premium">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 transition-colors group-focus-within:text-[#8cffef]" />
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

                  <Button
                    type="submit"
                    className=" group relative w-full h-13 rounded-xl overflow-hidden font-display font-semibold text-sm btn-primary-gradient"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Wysyłanie…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Wyślij link
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/40">
                  <ShieldCheck className="w-4 h-4 text-[#2de5ca]" />
                  Link będzie ważny przez 1 godzinę
                </div>

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
