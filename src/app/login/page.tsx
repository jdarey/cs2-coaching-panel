'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Suspense } from 'react'

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
        toast({ title: 'Zalogowano', description: 'Przekierowujemy...' })
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">CS2 Coaching</h1>
          <p className="text-muted-foreground mt-2">Zaloguj się do panelu</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Witaj z powrotem</h2>
            <p className="text-muted-foreground mt-1">Zaloguj się, aby kontynuować</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || formError) && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <span>{formError || error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twój@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Hasło</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">Zapomniałeś hasła?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading && <span className="mr-2 h-4 w-4 animate-spin">⏳</span>}
              Zaloguj się
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">lub</span>
              </div>
            </div>
            <Link href="/register" className="block w-full text-center px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium">
              Załóż konto
            </Link>
            <Link href="/demo" className="block w-full text-center px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium">
              Wersja demonstracyjna
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="text-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Ładowanie...</p></div></div>}>
      <LoginForm />
    </Suspense>
  )
}