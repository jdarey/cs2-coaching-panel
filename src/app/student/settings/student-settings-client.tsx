'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { applyStoredTheme } from '@/components/providers'
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
  Gamepad2,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  steamId: string | null
  steamVanity: string | null
  faceitNickname: string | null
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
}

interface StudentSettingsClientProps {
  initialUser: User
}

type SectionKey = 'profile' | 'password' | 'gaming' | 'notifications' | 'appearance'

const SECTIONS: { key: SectionKey; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'password', label: 'Hasło', icon: Lock },
  { key: 'gaming', label: 'Gry i konta', icon: Gamepad2 },
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
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (typeof window !== 'undefined' && (localStorage.getItem('theme') as 'light' | 'dark' | 'system')) || 'system'
  )
  const [gaming, setGaming] = useState({
    steam: user.steamVanity || user.steamId || '',
    faceit: user.faceitNickname || '',
  })
  const [gamingLoading, setGamingLoading] = useState(false)
  const [gamingResult, setGamingResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [faceitResult, setFaceitResult] = useState<{ nickname: string; elo: number | null; skillLevel: number | null } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [avatarDirty, setAvatarDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { update: refreshSession } = useSession()
  const { toast } = useToast()

  const tabRefs = useRef<Record<SectionKey, HTMLButtonElement | null>>({ profile: null, password: null, gaming: null, notifications: null, appearance: null })
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
    // In real app, save to database
  }

  const saveGaming = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setGamingResult(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamVanity: gaming.steam.trim() || null,
          steamId: null,
          faceitNickname: gaming.faceit.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGamingResult({ ok: false, message: data.error || 'Nie udało się zapisać' })
        return
      }
      setGamingResult({ ok: true, message: 'Zapisano konta gier' })
    } catch {
      setGamingResult({ ok: false, message: 'Błąd sieci' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGamingProfile = async () => {
    const identifier = (gaming.steam || gaming.faceit || '').trim()
    if (!identifier) {
      setGamingResult({ ok: false, message: 'Podaj link do profilu Steam lub nickname Faceit' })
      return
    }
    setGamingLoading(true)
    setGamingResult(null)
    setFaceitResult(null)
    try {
      // Unified keyless integration: Steam URL/vanity/ID or Faceit nick
      const res = await fetch(`/api/integrations/leetify?identifier=${encodeURIComponent(identifier)}`)
      const data = await res.json()
      if (!res.ok) {
        setGamingResult({ ok: false, message: data.error || 'Nie udało się pobrać rangi' })
        return
      }
      setFaceitResult({ nickname: data.name || identifier, elo: data.faceitElo, skillLevel: data.faceitLevel })

      // Auto-save rank entries (Premier + Faceit) so they land on the rank page
      let saved = 0
      if (data.premier != null) {
        const r = await fetch('/api/ranks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'PREMIER',
            rank: `${data.premier} Premier`,
            elo: data.premier,
            note: 'Pobrano automatycznie (Leetify)',
          }),
        })
        if (r.ok) saved++
      }
      if (data.faceitElo != null || data.faceitLevel != null) {
        const r = await fetch('/api/ranks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'FACEIT',
            rank: data.faceitElo != null ? `${data.faceitElo} ELO` : `Poziom ${data.faceitLevel}`,
            elo: data.faceitElo,
            note: 'Pobrano automatycznie (Leetify)',
          }),
        })
        if (r.ok) saved++
      }

      const parts = []
      if (data.premier != null) parts.push(`Premier: ${data.premier}`)
      if (data.faceitElo != null) parts.push(`Faceit ELO: ${data.faceitElo}`)
      if (data.faceitLevel != null) parts.push(`Poziom: ${data.faceitLevel}`)
      setGamingResult({
        ok: true,
        message: parts.length > 0 ? `Pobrano: ${parts.join(' · ')}${saved > 0 ? ' · zapisano do rankingu' : ''}` : 'Profil znaleziony, ale bez danych o rangach',
      })
    } catch {
      setGamingResult({ ok: false, message: 'Błąd sieci przy pobieraniu rangi' })
    } finally {
      setGamingLoading(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    // Re-apply through the shared initializer so system === current OS preference
    applyStoredTheme()
  }

  const inputBase =
    'h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#a78bfa]/50 focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 focus-visible:outline-none transition-all duration-300 pl-11 pr-4 text-sm'

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={Settings}
          label="Panel ucznia"
          title="Ustawienia"
          subtitle="Zarządzaj swoim profilem, hasłem i preferencjami powiadomień."
        />

        {/* ===== Tabs with animated underline ===== */}
        <div
          className=" relative rounded-3xl glass-liquid rise-in overflow-hidden mb-8"
          style={{ animationDelay: '0.1s' }} >
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
                  className=" relative rounded-3xl glass-tinted p-6 overflow-hidden rise-in" >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-2xl ring-1 ring-white/15">
                        <AvatarImage src={avatarUrl || ''} alt={user.name || ''} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white">
                          {getInitials(user.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
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
                        className="absolute -bottom-1 -right-1 grid place-items-center w-7 h-7 rounded-xl bg-[#060606] border border-white/10 hover:border-[#a78bfa]/40 transition"
                        aria-label="Zmień zdjęcie profilowe"
                        title="Zmień zdjęcie profilowe"
                      >
                        <Camera className="w-3.5 h-3.5 text-white/55" />
                      </button>
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
                    className=" relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white btn-darey disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Zapisz zmiany
                  </button>
                </form>

                {/* Coach card */}
                {user.coach && (
                  <div
                    className=" relative rounded-3xl glass-liquid p-5 overflow-hidden rise-in"
                    style={{ animationDelay: '0.05s' }} >
                    <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-3">Twój trener</p>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 rounded-xl ring-1 ring-white/10">
                        <AvatarImage src={user.coach.avatarUrl || ''} alt={user.coach.name || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white">
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
                  className=" relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white btn-darey disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Zmień hasło
                </button>
              </form>
            )}

            {/* ===== GAMING ===== */}
            {activeSection === 'gaming' && (
              <form onSubmit={saveGaming} className="space-y-6" style={{ animationDelay: '0.15s' }}>
                <div className="rounded-3xl glass-tinted p-6">
                  <div className="flex items-start gap-3 mb-1">
                    <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#c4b5fd] flex-shrink-0">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white">Konta gier</h3>
                      <p className="text-sm text-white/45">Podłącz Steam — Twoja ranga i ELO będą pobierane automatycznie i trafiały na stronę rangi.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label htmlFor="steam" className="text-sm font-medium text-white/70">
                      Link do profilu Steam lub nickname Faceit
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        id="steam"
                        value={gaming.steam}
                        onChange={(e) => setGaming((s) => ({ ...s, steam: e.target.value }))}
                        placeholder="np. https://steamcommunity.com/id/TwojNick albo nick z Faceit"
                        className={inputBase}
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Wystarczy sam link — Twój Premier rating, Faceit ELO i poziom zostaną pobrane automatycznie.
                      Bez żadnych kluczy API po Twojej stronie. Jeśli profil jest prywatny, ustaw go jako publiczny
                      albo połącz z Leetify (leetify.com).
                    </p>
                  </div>

                  {gamingResult && (
                    <p className={cn('mt-4 text-sm', gamingResult.ok ? 'text-emerald-300' : 'text-red-300')}>
                      {gamingResult.message}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className=" relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white btn-darey disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Zapisz konta
                    </button>
                    <button
                      type="button"
                      onClick={fetchGamingProfile}
                      disabled={gamingLoading}
                      className=" relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-white/[0.04] border border-white/[0.1] hover:border-[#a78bfa]/40 disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {gamingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4 text-[#c4b5fd]" />}
                      Pobierz rangę teraz
                    </button>
                  </div>

                  {faceitResult && (
                    <div className="mt-5 rounded-2xl bg-white/[0.03] border border-[#a78bfa]/20 p-4 flex items-center gap-4">
                      <div className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white flex-shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-white">{faceitResult.nickname}</p>
                        <p className="text-sm text-white/55">
                          ELO: <span className="font-semibold text-[#c4b5fd]">{faceitResult.elo ?? '—'}</span>
                          {faceitResult.skillLevel != null && <> · Poziom {faceitResult.skillLevel}</>}
                        </p>
                      </div>
                      <a
                        href={`https://www.faceit.com/pl/players/${encodeURIComponent(faceitResult.nickname)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors"
                      >
                        Profil <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
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
                        <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#c4b5fd] flex-shrink-0">
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
                          on ? 'btn-darey' : 'bg-white/[0.08] border border-white/[0.08]',
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
                        ? 'text-[#a78bfa]'
                        : 'text-[#c4b5fd]'
                  return (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300',
                        theme === t
                          ? 'glass-tinted border-[#a78bfa]/30'
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
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/30">
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
