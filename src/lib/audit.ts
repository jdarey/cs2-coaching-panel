import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export type AuditAction =
  | 'USER_RESET_PASSWORD'
  | 'USER_COACH_CHANGED'
  | 'USER_BLOCKED'
  | 'USER_UNBLOCKED'
  | 'USER_IMPERSONATED'
  | 'EMAIL_TEMPLATE_UPDATED'
  | 'EMAIL_TEMPLATE_TEST_SENT'
  | 'FINANCE_ENTRY_CREATED'
  | 'FINANCE_ENTRY_DELETED'
  | 'FINANCE_EXPORT'
  | 'USERS_EXPORT'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED'
  | 'FEATURE_FLAG_TOGGLED'
  | 'ADMIN_LOGIN'

export interface AuditDetails {
  before?: Record<string, any>
  after?: Record<string, any>
  reason?: string
  [key: string]: any
}

export async function auditLog(
  action: AuditAction,
  options: {
    actorId: string
    actorRole: string
    targetId?: string
    targetType?: string
    details?: AuditDetails
  }
) {
  try {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               h.get('x-real-ip') ||
               'unknown'
    const userAgent = h.get('user-agent') || 'unknown'

    await prisma.auditLog.create({
      data: {
        actorId: options.actorId,
        actorRole: options.actorRole,
        action,
        targetId: options.targetId,
        targetType: options.targetType,
        details: options.details ? options.details as any : undefined,
        ip,
        userAgent,
      },
    })
  } catch (e) {
    // Audit log failure must never break the main operation
    console.error('[AuditLog] Failed to write:', e)
  }
}

// Helper do typowych akcji
export const audit = {
  userResetPassword: (actorId: string, actorRole: string, targetUserId: string) =>
    auditLog('USER_RESET_PASSWORD', { actorId, actorRole, targetId: targetUserId, targetType: 'USER' }),

  userCoachChanged: (actorId: string, actorRole: string, targetUserId: string, oldCoachId: string | null, newCoachId: string | null) =>
    auditLog('USER_COACH_CHANGED', { actorId, actorRole, targetId: targetUserId, targetType: 'USER', details: { oldCoachId, newCoachId } }),

  userBlocked: (actorId: string, actorRole: string, targetUserId: string, reason?: string) =>
    auditLog('USER_BLOCKED', { actorId, actorRole, targetId: targetUserId, targetType: 'USER', details: { reason } }),

  userUnblocked: (actorId: string, actorRole: string, targetUserId: string) =>
    auditLog('USER_UNBLOCKED', { actorId, actorRole, targetId: targetUserId, targetType: 'USER' }),

  userImpersonated: (actorId: string, actorRole: string, targetUserId: string) =>
    auditLog('USER_IMPERSONATED', { actorId, actorRole, targetId: targetUserId, targetType: 'USER' }),

  emailTemplateUpdated: (actorId: string, actorRole: string, templateKey: string, changes: Record<string, { before: any; after: any }>) =>
    auditLog('EMAIL_TEMPLATE_UPDATED', { actorId, actorRole, targetId: templateKey, targetType: 'EMAIL_TEMPLATE', details: { changes } }),

  emailTemplateTestSent: (actorId: string, actorRole: string, templateKey: string) =>
    auditLog('EMAIL_TEMPLATE_TEST_SENT', { actorId, actorRole, targetId: templateKey, targetType: 'EMAIL_TEMPLATE' }),

  financeEntryCreated: (actorId: string, actorRole: string, entryId: string, kind: 'INCOME' | 'EXPENSE', amount: number) =>
    auditLog('FINANCE_ENTRY_CREATED', { actorId, actorRole, targetId: entryId, targetType: 'FINANCE_ENTRY', details: { kind, amount } }),

  financeEntryDeleted: (actorId: string, actorRole: string, entryId: string) =>
    auditLog('FINANCE_ENTRY_DELETED', { actorId, actorRole, targetId: entryId, targetType: 'FINANCE_ENTRY' }),

  financeExport: (actorId: string, actorRole: string) =>
    auditLog('FINANCE_EXPORT', { actorId, actorRole }),

  usersExport: (actorId: string, actorRole: string) =>
    auditLog('USERS_EXPORT', { actorId, actorRole }),

  backupCreated: (actorId: string, actorRole: string, fileName: string) =>
    auditLog('BACKUP_CREATED', { actorId, actorRole, details: { fileName } }),

  backupRestored: (actorId: string, actorRole: string, fileName: string) =>
    auditLog('BACKUP_RESTORED', { actorId, actorRole, details: { fileName } }),

  featureFlagToggled: (actorId: string, actorRole: string, flagKey: string, enabled: boolean) =>
    auditLog('FEATURE_FLAG_TOGGLED', { actorId, actorRole, targetId: flagKey, targetType: 'FEATURE_FLAG', details: { enabled } }),

  adminLogin: (actorId: string, actorRole: string) =>
    auditLog('ADMIN_LOGIN', { actorId, actorRole }),
}