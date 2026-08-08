import { z } from 'zod'

// Auth
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
})

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki').optional(),
  role: z.enum(['COACH', 'STUDENT']),
})

// Tags
export const tagSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(50, 'Max 50 znaków'),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Nieprawidłowy kolor HEX').default('#3B82F6'),
  icon: z.string().max(50).optional(),
})

export const tagUpdateSchema = tagSchema.partial()

// Videos
export const videoSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(200),
  url: z.string().url('Nieprawidłowy URL'),
  description: z.string().max(2000).optional(),
  duration: z.number().int().positive().optional(),
  source: z.enum(['youtube', 'vimeo', 'drive', 'other']).default('youtube'),
  tagIds: z.array(z.string()).default([]),
})

export const videoUpdateSchema = videoSchema.partial()

// Sessions
export const sessionSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(200),
  description: z.string().max(2000).optional(),
  studentId: z.string().min(1, 'Uczeń jest wymagany'),
  scheduledAt: z.string().datetime().optional(),
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
  note: z.string().max(2000).optional(),
})

// Coach Settings
export const coachSettingsSchema = z.object({
  defaultTagColors: z.record(z.string()).optional(),
  defaultVideoOrder: z.array(z.string()).optional(),
  notificationEmail: z.boolean().default(false),
  notificationDiscord: z.boolean().default(false),
  discordWebhook: z.string().url().optional().or(z.literal('')),
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