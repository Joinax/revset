// src/lib/ticket-categories.ts
export const TICKET_CATEGORIES = {
  PAYMENT:    { label: 'Проблема с оплатой',   icon: 'ti-credit-card',    priority: 'URGENT' as const },
  DOWNLOAD:   { label: 'Не могу скачать файл', icon: 'ti-download',       priority: 'HIGH'   as const },
  MODERATION: { label: 'Вопрос по модерации',  icon: 'ti-shield-check',   priority: 'HIGH'   as const },
  ACCOUNT:    { label: 'Вопрос по аккаунту',   icon: 'ti-user',           priority: 'MEDIUM' as const },
  OTHER:      { label: 'Другое / предложение', icon: 'ti-bulb',           priority: 'LOW'    as const },
} as const

export type TicketCategoryKey = keyof typeof TICKET_CATEGORIES

export function getCategoryLabel(key: string): string {
  return (TICKET_CATEGORIES as Record<string, { label: string }>)[key]?.label ?? key
}
