// src/lib/audit-log.ts
import { db } from './db'
import type { Prisma } from '@prisma/client'

type AuditAction =
  | 'user.role_change'
  | 'user.ban'
  | 'user.unban'
  | 'user.flag_change'
  | 'verification.approve'
  | 'verification.reject'
  | 'verification.toggle_auto_publish'
  | 'order.status_change'
  | 'product.update'
  | 'product.publish'
  | 'product.unpublish'
  | 'category.create'
  | 'category.delete'
  | 'settings.update'
  | 'product.approve_pending_bundle'
  | 'pack.approve'
  | 'pack.reject'
  | 'pack.retry_bundle'
  | 'pack_review.approve'
  | 'pack_review.reject'
  | 'ticket.status_change'
  | 'ticket.priority_change'
  | 'ticket.assign'
  | 'ticket.reassign'
  | 'ticket.escalate'
  | 'ticket.close'
  | 'idea.approve'
  | 'idea.reject'
  | 'idea.status_change'
  | 'idea_comment.approve'
  | 'idea_comment.reject'

type AuditTargetType =
  | 'User'
  | 'Product'
  | 'Order'
  | 'Category'
  | 'Setting'
  | 'Pack'
  | 'PackReview'
  | 'SupportTicket'
  | 'Idea'
  | 'IdeaComment'

type LogAdminActionParams = {
  adminId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId?: string
  details?: Record<string, unknown>
}

/**
 * Записывает действие администратора в audit log.
 * Ошибки записи не должны прерывать основную операцию —
 * поэтому логируем их в консоль, но не бросаем исключение.
 */
export async function logAdminAction({
  adminId, action, targetType, targetId, details,
}: LogAdminActionParams) {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (err) {
    console.error('[audit-log] Failed to write audit log entry:', err)
  }
}
