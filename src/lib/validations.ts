import { z } from 'zod'

// Auth
// Jedno źródło zasad dla NOWYCH haseł (rejestracja, reset, zmiana,
// zakładanie konta przez trenera). Login celowo łagodniejszy — bcrypt
// i tak weryfikuje, a nie odrzucamy nikogo z hasłem sprzed zaostrzenia.
export const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć minimum 8 znaków')
  .max(128, 'Hasło jest za długie (max 128 znaków)')

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
})

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki').optional(),
  role: z.enum(['COACH', 'STUDENT']),
  inviteToken: z.string().optional(),
  password: passwordSchema,
})

// Tags
export const tagSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(50, 'Max 50 znaków'),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Nieprawidłowy kolor HEX').default('#3B82F6'),
  icon: z.string().max(50).optional(),
})

export const tagUpdateSchema = tagSchema.partial()

// Videos - duration moze przyjsc jako string '' z formularza (coach-videos-client), lub number, lub "mm:ss" / "hh:mm:ss"
export const videoSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(200),
  url: z.string().url('Nieprawidłowy URL'),
  description: z.string().max(2000).optional(),
  duration: z.preprocess(
    (v) => {
      if (v === '' || v == null) return undefined
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const s = v.trim()
        if (!s) return undefined
        if (/^\d+$/.test(s)) return parseInt(s, 10)
        // "mm:ss" lub "hh:mm:ss"
        const parts = s.split(':').map((p) => parseInt(p, 10))
        if (parts.some(isNaN)) return v // nech Zod zgłosi błąd
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        if (parts.length === 1) return parts[0]
      }
      return v
    },
    z.number().int().positive().optional()
  ),
  source: z.enum(['youtube', 'vimeo', 'drive', 'other']).default('youtube'),
  tagIds: z.array(z.string()).default([]),
})

export const videoUpdateSchema = videoSchema.partial()

// Sessions
// scheduledAt comes from <input type="datetime-local"> which yields
// "YYYY-MM-DDTHH:mm" (no seconds, no zone) — z.string().datetime() rejects
// that, so we accept any parseable date string. Empty string → undefined.
export const sessionSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(200),
  description: z.string().max(2000).optional(),
  studentId: z.string().min(1, 'Uczeń jest wymagany'),
  scheduledAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Nieprawidłowa data')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  tagIds: z.array(z.string()).default([]),
  videoIds: z.array(z.string()).default([]),
})

export const sessionUpdateSchema = sessionSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
})

// Session Tags (with custom notes per session)
export const sessionTagSchema = z.object({
  tagId: z.string(),
  note: z.string().max(1000).optional(),
  order: z.number().int().default(0),
})

// Session Videos
export const sessionVideoSchema = z.object({
  videoId: z.string(),
  tagId: z.string().optional(),
  order: z.number().int().default(0),
})

// Video Progress
export const videoProgressSchema = z.object({
  videoId: z.string(),
  sessionId: z.string().optional(),
  status: z.enum(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED']),
  progress: z.number().min(0).max(100).default(0),
  // Seconds where the student last stopped — resume point for the player.
  positionSeconds: z.number().min(0).optional(),
  note: z.string().max(2000).optional(),
})

// Coach Settings
export const coachSettingsSchema = z.object({
  defaultTagColors: z.record(z.string()).optional(),
  defaultVideoOrder: z.array(z.string()).optional(),
  notificationEmail: z.boolean().default(false),
  notificationDiscord: z.boolean().default(false),
  discordWebhook: z.string().url().optional().or(z.literal('')),
  steamApiKey: z.string().max(500).optional().nullable(),
  faceitApiKey: z.string().max(500).optional().nullable(),
})

// Types
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TagInput = z.infer<typeof tagSchema>
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>
export type VideoInput = z.infer<typeof videoSchema>
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>
export type SessionInput = z.infer<typeof sessionSchema>
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>
export type SessionTagInput = z.infer<typeof sessionTagSchema>
export type SessionVideoInput = z.infer<typeof sessionVideoSchema>
export type VideoProgressInput = z.infer<typeof videoProgressSchema>
export type CoachSettingsInput = z.infer<typeof coachSettingsSchema>