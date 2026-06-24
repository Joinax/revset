// src/lib/serialize.ts
// Рекурсивно конвертирует все Prisma.Decimal в обычные числа JS.
// Использовать перед отправкой данных на фронтенд через NextResponse.json().
//
// Пример:
//   return NextResponse.json(serializeDecimal(product))

export function serializeDecimal<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      // Prisma.Decimal имеет конструктор с именем 'Decimal'
      if (
        value !== null &&
        typeof value === 'object' &&
        value.constructor?.name === 'Decimal'
      ) {
        return Number(value)
      }
      return value
    })
  )
}
