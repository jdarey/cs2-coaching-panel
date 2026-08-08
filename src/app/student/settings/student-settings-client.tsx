'use client'

import { useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { User, Mail, Lock, Shield, Bell, Palette, Moon, Sun, Loader2, Save, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
}

interface StudentSettingsClientProps {
  initialUser: User
}

export function StudentSettingsClient({ initialUser }: StudentSettingsClientProps) {
  const user = initialUser
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'account'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [notifications, setNotifications] = useState({
    email: true,
    sessionReminders: true,
    progressUpdates: true,
    newVideos: true,
  })
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const { toast } = useToast()

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Zapisano', description: 'Profil zaktualizowany' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({ title: 'Błąd', description: 'Hasła nie są identyczne', variant: 'destructive' })
      return
    }
    
    if (formData.newPassword.length < 6) {
      toast({ title: 'Błąd', description: 'Nowe hasło musi mieć minimum 6 znaków', variant: 'destructive' })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Sukces', description: 'Hasło zmienione' })
      setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    // In real app, save to database
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    document.documentElement.classList.remove('light', 'dark')
    if (newTheme === 'system') {
      document.documentElement.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      document.documentElement.classList.add(newTheme)
    }
    localStorage.setItem('theme', newTheme)
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>
          <p className="text-muted-foreground mt-1">Zarządzaj swoim kontem i preferencjami</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profil</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Powiadomienia</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" /> Wygląd</TabsTrigger>
            <TabsTrigger value="account"><Shield className="mr-2 h-4 w-4" /> Konto</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informacje o profilu</CardTitle>
                <CardDescription>Zarządzaj swoimi danymi osobowymi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatarUrl || ''} alt={user.name || ''} />
                    <AvatarFallback className="text-2xl">{getInitials(user.name || 'U')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-medium">{user.name || 'Bez nazwy'}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground mt-1">Członek od {formatDate(user.createdAt)}</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Twoje imię"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Zmiana emaila wymaga weryfikacji</p>
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Zapisz zmiany
                  </Button>
                </form>
              </CardContent>
            </Card>

            {user.coach && (
              <Card>
                <CardHeader>
                  <CardTitle>Twój trener</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.coach.avatarUrl || ''} alt={user.coach.name || ''} />
                      <AvatarFallback>{user.coach.name?.[0] || 'T'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.coach.name || 'Trener'}</p>
                      <p className="text-sm text-muted-foreground">{user.coach.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferencje powiadomień</CardTitle>
                <CardDescription>Wybierz, o czym chcesz być informowany</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'email', label: 'Powiadomienia emailowe', desc: 'Otrzymuj emaile o nowych sesjach i filmach' },
                  { key: 'sessionReminders', label: 'Przypomnienia o sesjach', desc: 'Przypominaj o nadchodzących sesjach' },
                  { key: 'progressUpdates', label: 'Aktualizacje postępu', desc: 'Informuj o nowych filmach do oglądania' },
                  { key: 'newVideos', label: 'Nowe filmy', desc: 'Powiadamiaj gdy trener doda nowe filmy' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={notifications[item.key as keyof typeof notifications]}
                      onClick={() => handleNotificationChange(item.key, !notifications[item.key as keyof typeof notifications])}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-primary'
                          : 'bg-input'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Motyw</CardTitle>
                <CardDescription>Wybierz preferowany motyw interfejsu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-left',
                        theme === t
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {t === 'light' && <Sun className="h-6 w-6 text-yellow-500" />}
                        {t === 'dark' && <Moon className="h-6 w-6 text-blue-500" />}
                        {t === 'system' && <Shield className="h-6 w-6 text-gray-500" />}
                        <div>
                          <p className="font-medium capitalize">{t}</p>
                          <p className="text-xs text-muted-foreground">
                            {t === 'light' ? 'Zawsze jasny' : t === 'dark' ? 'Zawsze ciemny' : 'Zgodny z systemem'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Zmień hasło</CardTitle>
                <CardDescription>Zaktualizuj swoje hasło dostępu</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Obecne hasło</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nowe hasło</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Zmień hasło
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Strefa niebezpieczeństwa</CardTitle>
                <CardDescription>Nieodwracalne akcje</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                  <div>
                    <p className="font-medium text-destructive">Usuń konto</p>
                    <p className="text-sm text-muted-foreground">Trwale usunę swoje konto i wszystkie dane</p>
                  </div>
                  <Button variant="destructive" onClick={() => alert('Funkcja do zaimplementowania')}>
                    Usuń konto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}