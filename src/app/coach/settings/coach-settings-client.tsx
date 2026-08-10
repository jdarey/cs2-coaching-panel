'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { applyStoredTheme } from '@/components/providers'
import { signOut, useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import {
  User,
  Mail,
  Lock,
  Bell,
  Globe,
  Save,
  Loader2,
  Shield,
  Trash2,
  Moon,
  Sun,
  Monitor,
  MessageCircle,
  Sparkles,
  Camera,
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

interface Settings {
  id: string
  coachId: string
  defaultTagColors: Record<string, string>
  defaultVideoOrder: string[]
  notificationEmail: boolean
  notificationDiscord: boolean
  discordWebhook: string | null
  createdAt: string
  updatedAt: string
}

type SettingsOrNull = Settings | null

interface CoachSettingsClientProps {
  initialUser: User
  initialSettings: SettingsOrNull
}

export function CoachSettingsClient({ initialUser, initialSettings }: CoachSettingsClientProps) {
  const user = initialUser
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'appearance'>(
    'profile'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [notifications, setNotifications] = useState({
    email: initialSettings?.notificationEmail || false,
    discord: initialSettings?.notificationDiscord || false,
    sessionReminders: true,
    newStudents: true,
    progressUpdates: true,
  })
  const [discordWebhook, setDiscordWebhook] = useState(initialSettings?.discordWebhook || '')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (typeof window !== 'undefined' && (localStorage.getItem('theme') as 'light' | 'dark' | 'system')) || 'system'
  )
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [avatarDirty, setAvatarDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { update: refreshSession } = useSession()
  const { toast } = useToast()

  type TabKey = 'profile' | 'password' | 'notifications' | 'appearance'
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ profile: null, password: null, notifications: null, appearance: null })
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const update = () => {
      const el = tabRefs.current[activeTab]
      if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab])

  const handleAvatarPick = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Błąd', description: 'Wybierz plik obrazu (JPG, PNG, WEBP)', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Błąd', description: 'Plik jest za duży (maks. 5 MB)', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Downscale to 256x256 to keep the stored data URL small
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85))
        setAvatarDirty(true)
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          avatarUrl: avatarDirty ? avatarUrl : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      if (avatarDirty) setAvatarDirty(false)
      // Refresh the session token so the sidebar avatar updates immediately
      await refreshSession()
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
  }

  const handleDiscordSave = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationDiscord: notifications.discord,
          discordWebhook: discordWebhook,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Zapisano', description: 'Ustawienia Discord zaktualizowane' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    // Re-apply through the shared initializer so system === current OS preference
    applyStoredTheme()
  }

  
  const tabs = [
    { value: 'profile', label: 'Profil', Icon: User },
    { value: 'password', label: 'Hasło', Icon: Lock },
    { value: 'notifications', label: 'Powiadomienia', Icon: Bell },
    { value: 'appearance', label: 'Wygląd', Icon: Globe },
  ] as const

  const toggleItems = [
    { key: 'email', label: 'Włącz powiadomienia emailowe', desc: 'Główny przełącznik' },
    { key: 'sessionReminders', label: 'Przypomnienia o sesjach', desc: '24h i 1h przed sesją' },
    { key: 'newStudents', label: 'Nowi uczniowie', desc: 'Gdy dodasz nowego ucznia' },
    { key: 'progressUpdates', label: 'Aktualizacje postępu', desc: 'Gdy uczeń obejrzy film lub zmieni status' },
  ] as const

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; desc: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Jasny', desc: 'Zawsze jasny', Icon: Sun },
    { value: 'dark', label: 'Ciemny', desc: 'Zawsze ciemny', Icon: Moon },
    { value: 'system', label: 'System', desc: 'Zgodny z systemem', Icon: Monitor },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Gradient header */}
        <div className="mb-8 rise-in">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl glass-tinted">
              <Shield className="h-5 w-5 text-[#8cffef]" />
            </span>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet">
                Ustawienia trenera
              </h1>
              <p className="text-sm text-white/45 mt-0.5">
                Zarządzaj swoim kontem i preferencjami panelu
              </p>
            </div>
          </div>
        </div>

        {/* Tabs with .tab-underline */}
        <div className="relative rise-in mb-8" style={{ animationDelay: '60ms' }}>
          <div className="glass-liquid relative flex items-center gap-1 rounded-2xl p-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = activeTab === t.value
              return (
                <button
                  key={t.value}
                  ref={(el) => {
                    tabRefs.current[t.value] = el
                  }}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 h-12 px-4 sm:px-5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'text-white' : 'text-white/55 hover:text-white/80'
                  )}
                >
                  <t.Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
            <span className="tab-underline" style={{ left: underline.left, width: underline.width }} />
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-3xl space-y-6">
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <section className="glass-liquid rise-in rounded-3xl p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <User className="h-5 w-5 text-[#8cffef]" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-gradient-violet">Profil</h2>
                  <p className="text-xs text-white/45">Zarządzaj swoimi danymi osobowymi</p>
                </div>
              </div>

              {/* Avatar preview — click the camera to change the photo */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={user.name || ''}
                      className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/15"
                    />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-xl glass-tinted ring-1 ring-white/15 text-2xl font-bold text-white">
                      {getInitials(user.name || 'T')}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleAvatarPick(e.target.files?.[0] || null)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl glass-tinted ring-1 ring-white/15 hover:ring-[#2de5ca]/40 transition"
                    aria-label="Zmień zdjęcie profilowe"
                    title="Zmień zdjęcie profilowe"
                  >
                    <Camera className="h-4 w-4 text-[#8cffef]" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-medium text-white truncate">{user.name || 'Bez nazwy'}</p>
                  <p className="text-sm text-white/55 truncate">{user.email}</p>
                  <p className="text-xs text-white/40 mt-1">Trener od {formatDate(user.createdAt)}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-medium text-white/55">
                    Imię i nazwisko
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Twoje imię"
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#14b8a6]/25 focus:border-[#2de5ca]/40 transition"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-white/55">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="h-12 w-full rounded-xl bg-white/[0.02] border border-white/[0.08] pl-11 pr-4 text-sm text-white/45 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-white/40">Zmiana emaila wymaga weryfikacji</p>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-60 transition"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Zapisz zmiany
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Password tab */}
          {activeTab === 'password' && (
            <section className="glass-liquid rise-in rounded-3xl p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <Lock className="h-5 w-5 text-[#8cffef]" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-gradient-violet">Hasło</h2>
                  <p className="text-xs text-white/45">Zaktualizuj swoje hasło dostępu</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {[
                  { id: 'currentPassword', label: 'Obecne hasło' },
                  { id: 'newPassword', label: 'Nowe hasło' },
                  { id: 'confirmPassword', label: 'Potwierdź nowe hasło' },
                ].map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <label htmlFor={f.id} className="text-xs font-medium text-white/55">{f.label}</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        id={f.id}
                        type="password"
                        value={formData[f.id as 'currentPassword' | 'newPassword' | 'confirmPassword']}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        required
                        minLength={f.id === 'newPassword' ? 6 : undefined}
                        className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#14b8a6]/25 focus:border-[#2de5ca]/40 transition"
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-60 transition"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Zmień hasło
                  </button>
                </div>
              </form>

              {/* Danger zone */}
              <div className="mt-8 rounded-2xl p-5 bg-red-500/[0.07] border border-red-500/20 backdrop-blur-xl ring-1 ring-red-500/10">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 ring-1 ring-red-500/25">
                    <Trash2 className="h-5 w-5 text-red-300" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-200">Strefa niebezpieczeństwa</p>
                    <p className="text-sm text-white/50 mt-0.5">
                      Nieodwracalne akcje. Trwale usunę swoje konto, uczniów, sesje i wszystkie dane.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('Czy na pewno chcesz trwale usunąć swoje konto? Ta akcja jest nieodwracalna.')) return
                      const res = await fetch('/api/user/account', { method: 'DELETE' })
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}))
                        toast({ title: 'Błąd', description: data.error || 'Nie udało się usunąć konta', variant: 'destructive' })
                        return
                      }
                      await signOut({ callbackUrl: '/login' })
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-medium text-red-200 border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/40 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Usuń konto
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <section className="glass-liquid rise-in rounded-3xl p-7 space-y-7"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <Bell className="h-5 w-5 text-[#8cffef]" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-gradient-violet">Powiadomienia</h2>
                  <p className="text-xs text-white/45">Otrzymuj powiadomienia o aktywności</p>
                </div>
              </div>

              <div className="space-y-3">
                {toggleItems.map((item) => {
                  const on = notifications[item.key as keyof typeof notifications]
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded-2xl p-4 glass-liquid"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-white/45">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNotificationChange(item.key, !on)}
                        className={cn(
                          'relative h-9 w-16 shrink-0 rounded-full transition-all',
                          on
                            ? 'btn-darey shadow-[0_0_18px_-2px_rgba(20,184,166,0.6)]'
                            : 'glass-tinted'
                        )}
                        aria-pressed={on}
                        role="switch"
                        aria-checked={on}
                      >
                        <span
                          className={cn(
                            'absolute top-1 grid h-7 w-7 place-items-center rounded-full transition-all',
                            on
                              ? 'left-8 bg-white text-[#147a6b]'
                              : 'left-1 bg-white/80 text-white/40'
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-current" />
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Discord integration */}
              <div className="rounded-2xl p-5 glass-liquid">
                <div className="flex items-center gap-4 mb-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                    <MessageCircle className="h-5 w-5 text-[#8cffef]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">Powiadomienia Discord</p>
                    <p className="text-sm text-white/45">Włącz, aby otrzymywać webhook powiadomienia</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleNotificationChange('discord', !notifications.discord)
                    }}
                    className={cn(
                      'relative h-9 w-16 shrink-0 rounded-full transition-all',
                      notifications.discord
                        ? 'btn-darey shadow-[0_0_18px_-2px_rgba(20,184,166,0.6)]'
                        : 'glass-tinted'
                    )}
                    aria-pressed={notifications.discord}
                    role="switch"
                    aria-checked={notifications.discord}
                  >
                    <span
                      className={cn(
                        'absolute top-1 grid h-7 w-7 place-items-center rounded-full transition-all',
                        notifications.discord
                          ? 'left-8 bg-white text-[#147a6b]'
                          : 'left-1 bg-white/80 text-white/40'
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                    </span>
                  </button>
                </div>

                {notifications.discord && (
                  <div className="space-y-2">
                    <label htmlFor="discordWebhook" className="text-xs font-medium text-white/55">
                      Webhook URL
                    </label>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        id="discordWebhook"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#14b8a6]/25 focus:border-[#2de5ca]/40 transition"
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Utwórz webhook w ustawieniach kanału Discorda: Ustawienia kanału → Integracje →
                      Webhooki
                    </p>
                    <button
                      onClick={handleDiscordSave}
                      disabled={isLoading}
                      className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-60 transition"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Zapisz webhook
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <section className="glass-liquid rise-in rounded-3xl p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <Globe className="h-5 w-5 text-[#8cffef]" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-gradient-violet">Wygląd</h2>
                  <p className="text-xs text-white/45">Wybierz preferowany motyw interfejsu</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {themeOptions.map((opt) => {
                  const active = theme === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleThemeChange(opt.value)}
                      className={cn(
                        'relative overflow-hidden rounded-2xl p-5 text-left transition-all',
                        active
                          ? 'glass-tinted ring-1 ring-[#2de5ca]/40'
                          : 'glass-liquid hover:border-white/[0.12]'
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-11 w-11 place-items-center rounded-xl transition',
                          active ? 'glass-tinted' : 'glass-liquid'
                        )}
                      >
                        <opt.Icon
                          className={cn(
                            'h-5 w-5',
                            active ? 'text-[#8cffef]' : 'text-white/55'
                          )}
                        />
                      </span>
                      <p className="mt-3 font-medium text-white">{opt.label}</p>
                      <p className="text-xs text-white/45 mt-0.5">{opt.desc}</p>
                      {active && (
                        <span className="absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-full btn-darey">
                          <Sparkles className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </CoachLayout>
  )
}
