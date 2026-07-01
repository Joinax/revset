// src/instrumentation.ts
// Next.js вызывает register() один раз при старте сервера.
// Node.js-специфичный код вынесен в instrumentation.node.ts — это
// предотвращает попадание Node.js API в Edge-бандл при статическом анализе.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerNode } = require('./instrumentation.node') as typeof import('./instrumentation.node')
    await registerNode()
  }
}
