'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Mail, Lock, User, AlertCircle, Shield } from 'lucide-react'

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validate all fields
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

      toast({ title: 'Konto utworzone', description: 'Pomyślnie zarejestrowano. Logowanie...' })
      router.push('/login?registered=true')
      router.refresh()
    } catch {
      setFormError('Wystąpił błąd serwera. Spróbuj ponownie.')
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            CS2 Coaching Panel
          </h1>
          <p className="text-muted-foreground mt-2">Utwórz nowe konto</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Rejestracja</CardTitle>
            <CardDescription>Wypełnij formularz aby utworzyć konto</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="twój@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Imię (opcjonalnie)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Twoje imię"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.name}
                  />
                </div>
                {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                  />
                </div>
                {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label>Rola</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as 'COACH' | 'STUDENT' }))}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="relative">
                    <RadioGroupItem
                      value="STUDENT"
                      className="peer h-24 w-full border-2 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary"
                    >
                      <Shield className="h-8 w-8 mb-2" />
                      <span className="font-medium">Uczeń</span>
                      <span className="text-xs text-muted-foreground">Chcę się uczyć</span>
                    </RadioGroupItem>
                  </div>
                  <div className="relative">
                    <RadioGroupItem
                      value="COACH"
                      className="peer h-24 w-full border-2 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary"
                    >
                      <User className="h-8 w-8 mb-2" />
                      <span className="font-medium">Trener</span>
                      <span className="text-xs text-muted-foreground">Chcę uczyć innych</span>
                    </RadioGroupItem>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Utwórz konto
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Separator>lub</Separator>
            <Link
              href="/login"
              className="text-center text-sm text-primary hover:underline font-medium"
            >
              Masz już konto? Zaloguj się
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}