'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Settings,
  User,
  Mail,
  Lock,
  Bell,
  Globe,
  Save,
  Trash2,
  Loader2,
  Camera,
  Shield,
  Moon,
  Sun,
  Send,
  CheckCircle2,
} from 'lucide-react'
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

type SectionKey = 'profile' | 'password' | 'notifications' | 'appearance'

const SECTIONS: { key: SectionKey; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'password', label: 'Hasło', icon: Lock },
  { key: 'notifications', label: 'Powiadomienia', icon: Bell },
  { key: 'appearance', label: 'Wygląd', icon: Globe },
]

export function StudentSettingsClient({ initialUser }: StudentSettingsClientProps) {
  const user = initialUser
  const [activeSection, setActiveSection] = useState<SectionKey>('profile')
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

  const tabRefs = useRef<Record<SectionKey, HTMLButtonElement | null>>({ profile: null, password: null, notifications: null, appearance: null })
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const update = () => {
      const el = tabRefs.current[activeSection]
      if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeSection])

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

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

  const inputBase =
    'h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#8b7bff]/50 focus-visible:ring-2 focus-visible:ring-[#7c6fff]/25 focus-visible:outline-none transition-all duration-300 pl-11 pr-4 text-sm'

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Page header ===== */}
        <div className="rise-in mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white/65 bg-white/[0.04] border border-white/[0.07] mb-5 backdrop-blur-xl">
            <Settings className="w-3.5 h-3.5 text-[#a594ff]" />
            Panel ucznia
          </div>
          <h1 className="font-display text-4xl md:text-[3.4rem] leading-[1.05] font-bold tracking-tight mb-3 text-gradient-violet">
            Ustawienia
          </h1>
          <p className="text-white/45 text-lg max-w-2xl font-light">
            Zarządzaj swoim profilem, hasłem i preferencjami powiadomień.
          </p>
        </div>

        {/* ===== Tabs with animated underline ===== */}
        <div
          className="spotlight relative rounded-3xl glass-liquid rise-in overflow-hidden mb-8"
          style={{ animationDelay: '0.1s' }}
          onMouseMove={handleCardMouse}
        >
          <div className="relative flex gap-1 px-3 sm:px-4 pt-3 border-b border-white/[0.06] overflow-x-auto">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  ref={(el) => {
                    tabRefs.current[s.key] = el
                  }}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'relative z-10 flex items-center gap-2.5 px-4 sm:px-5 py-3.5 text-sm font-display font-semibold transition-colors duration-300 rounded-t-xl whitespace-nowrap',
                    activeSection === s.key ? 'text-white' : 'text-white/45 hover:text-white/75',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
              )
            })}
            <span className="tab-underline" style={{ left: underline.left, width: underline.width }} />
          </div>

          <div className="p-5 sm:p-7">
            {/* ===== PROFILE ===== */}
            {activeSection === 'profile' && (
              <div className="space-y-6" style={{ animationDelay: '0.15s' }}>
                {/* Avatar + identity preview */}
                <div
                  className="spotlight relative rounded-3xl glass-tinted p-6 overflow-hidden rise-in"
                  onMouseMove={handleCardMouse}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-2xl ring-1 ring-white/15">
                        <AvatarImage src={user.avatarUrl || ''} alt={user.name || ''} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] text-white">
                          {getInitials(user.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 grid place-items-center w-7 h-7 rounded-xl bg-[#06070d] border border-white/10">
                        <Camera className="w-3.5 h-3.5 text-white/55" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-display font-semibold text-white">{user.name || 'Bez nazwy'}</p>
                      <p className="text-white/45 text-sm">{user.email}</p>
                      <p className="text-xs text-white/40 mt-1">Członek od {formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Profile form */}
                <form
                  onSubmit={handleProfileUpdate}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-white/70">
                      Imię i nazwisko
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Twoje imię"
                        className={inputBase}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-white/70">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className={cn(inputBase, 'opacity-60 cursor-not-allowed')}
                      />
                    </div>
                    <p className="text-xs text-white/40">Zmiana emaila wymaga weryfikacji</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="shimmer-line relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#8b7bff] to-[#5a4fff] shadow-[0_12px_32px_-8px_rgba(124,111,255,0.55)] hover:shadow-[0_16px_40px_-8px_rgba(124,111,255,0.7)] disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Zapisz zmiany
                  </button>
                </form>

                {/* Coach card */}
                {user.coach && (
                  <div
                    className="spotlight relative rounded-3xl glass-liquid p-5 overflow-hidden rise-in"
                    style={{ animationDelay: '0.05s' }}
                    onMouseMove={handleCardMouse}
                  >
                    <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-3">Twój trener</p>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 rounded-xl ring-1 ring-white/10">
                        <AvatarImage src={user.coach.avatarUrl || ''} alt={user.coach.name || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] text-white">
                          {user.coach.name?.[0] || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-display font-semibold text-white">{user.coach.name || 'Trener'}</p>
                        <p className="text-sm text-white/45">{user.coach.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== PASSWORD ===== */}
            {activeSection === 'password' && (
              <form onSubmit={handlePasswordChange} className="space-y-5" style={{ animationDelay: '0.15s' }}>
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="text-sm font-medium text-white/70">
                    Obecne hasło
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      placeholder="••••••••"
                      className={inputBase}
                    />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-white/70">
                      Nowe hasło
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                        required
                        minLength={6}
                        placeholder="Min. 6 znaków"
                        className={inputBase}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-white/70">
                      Potwierdź nowe hasło
                    </label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        placeholder="Powtórz hasło"
                        className={inputBase}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="shimmer-line relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#8b7bff] to-[#5a4fff] shadow-[0_12px_32px_-8px_rgba(124,111,255,0.55)] hover:shadow-[0_16px_40px_-8px_rgba(124,111,255,0.7)] disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Zmień hasło
                </button>
              </form>
            )}

            {/* ===== NOTIFICATIONS ===== */}
            {activeSection === 'notifications' && (
              <div className="space-y-3" style={{ animationDelay: '0.15s' }}>
                {[
                  { key: 'email', label: 'Powiadomienia emailowe', desc: 'Otrzymuj emaile o nowych sesjach i filmach', icon: Mail },
                  { key: 'sessionReminders', label: 'Przypomnienia o sesjach', desc: 'Przypominaj o nadchodzących sesjach', icon: Bell },
                  { key: 'progressUpdates', label: 'Aktualizacje postępu', desc: 'Informuj o nowych filmach do oglądania', icon: Send },
                  { key: 'newVideos', label: 'Nowe filmy', desc: 'Powiadamiaj gdy trener doda nowe filmy', icon: Globe },
                ].map((item) => {
                  const Icon = item.icon
                  const on = notifications[item.key as keyof typeof notifications]
                  return (
                    <div
                      key={item.key}
                      className="group flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#a594ff] flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{item.label}</p>
                          <p className="text-sm text-white/45">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={on}
                        onClick={() => handleNotificationChange(item.key, !on)}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300',
                          on ? 'bg-gradient-to-r from-[#8b7bff] to-[#5a4fff]' : 'bg-white/[0.08] border border-white/[0.08]',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300',
                            on ? 'translate-x-6' : 'translate-x-1',
                          )}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ===== APPEARANCE ===== */}
            {activeSection === 'appearance' && (
              <div className="grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.15s' }}>
                {(['light', 'dark', 'system'] as const).map((t) => {
                  const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Shield
                  const accent =
                    t === 'light'
                      ? 'text-[#fbbf24]'
                      : t === 'dark'
                        ? 'text-[#60a5fa]'
                        : 'text-[#a594ff]'
                  return (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300',
                        theme === t
                          ? 'glass-tinted border-[#8b7bff]/30'
                          : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]',
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'grid place-items-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06]',
                            accent,
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {theme === t && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#7c6fff]/20 text-[#a594ff] border border-[#7c6fff]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktywny
                          </span>
                        )}
                      </div>
                      <p className="font-display font-semibold text-white capitalize">{t}</p>
                      <p className="text-xs text-white/45 mt-0.5">
                        {t === 'light' ? 'Zawsze jasny' : t === 'dark' ? 'Zawsze ciemny' : 'Zgodny z systemem'}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== Danger zone ===== */}
        <div
          className="relative rounded-3xl p-6 sm:p-7 overflow-hidden rise-in"
          style={{
            background: 'linear-gradient(160deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.03) 60%, rgba(255,255,255,0.015) 100%)',
            border: '1px solid rgba(239,68,68,0.18)',
            boxShadow: '0 24px 60px -16px rgba(239,68,68,0.25)',
            animationDelay: '0.2s',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-semibold text-red-300">Strefa niebezpieczeństwa</p>
                <p className="text-sm text-white/50 mt-0.5">Trwale usuń swoje konto i wszystkie powiązane dane.</p>
              </div>
            </div>
            <button
              onClick={() => alert('Funkcja do zaimplementowania')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-red-200 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 hover:border-red-500/40 transition-all duration-300 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Usuń konto
            </button>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
