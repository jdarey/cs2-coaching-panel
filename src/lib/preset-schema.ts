import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const presetVariantSchema = z.object({
  label: z.string().min(1).max(60),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  description: z.string().max(500).optional().nullable(),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
})

export const exercisePresetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  gifUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  steamMapUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  linkUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  // Kategoria (aim / movement / utility ...) — tag główny dla filtrów biblioteki
  category: z.string().max(40).optional().nullable(),
  // Warianty trudności — cały zestaw podmieniany przy każdej edycji
  variants: z.array(presetVariantSchema).max(6).optional().default([]),
})

// Wersja PATCH: wszystkie pola opcjonalne
export const exercisePresetPatchSchema = exercisePresetSchema.partial()

export type VariantInput = z.infer<typeof presetVariantSchema>

// Zapisuje warianty presetu: replace-all (najprostsza semantyka, spójne kolejności).
export async function replaceVariants(presetId: string, variants: VariantInput[]) {
  await prisma.presetVariant.deleteMany({ where: { presetId } })
  if (variants.length === 0) return
  await prisma.presetVariant.createMany({
    data: variants.map((v, i) => ({
      presetId,
      label: v.label,
      difficulty: v.difficulty,
      description: v.description ?? null,
      minutes: v.minutes ?? null,
      order: i,
    })),
  })
}
