import { EventEmitter } from 'events'

// Синглтон через globalThis — переживает HMR в dev-режиме
const g = globalThis as typeof globalThis & { _adminEmitter?: EventEmitter }
if (!g._adminEmitter) {
  g._adminEmitter = new EventEmitter()
  g._adminEmitter.setMaxListeners(200)
}
const emitter = g._adminEmitter

export type AdminEventType = 'pack' | 'product' | 'verification' | 'user' | 'review'

export interface AdminEvent {
  type: AdminEventType
  id?:  string
}

export function emitAdminEvent(event: AdminEvent): void {
  emitter.emit('e', event)
}

export function onAdminEvent(handler: (event: AdminEvent) => void): () => void {
  emitter.on('e', handler)
  return () => emitter.off('e', handler)
}
