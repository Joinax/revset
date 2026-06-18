// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Заполняем базу данных...')

  // Категории
  const categories = await Promise.all([
    db.category.upsert({ where: { slug: 'furniture' },   update: {}, create: { slug: 'furniture',   name: 'Мебель',       emoji: '🪑', iconBg: '#1C2A10', order: 1 } }),
    db.category.upsert({ where: { slug: 'engineering' }, update: {}, create: { slug: 'engineering', name: 'Инженерия',    emoji: '🔧', iconBg: '#101C2A', order: 2 } }),
    db.category.upsert({ where: { slug: 'lighting' },    update: {}, create: { slug: 'lighting',    name: 'Освещение',    emoji: '💡', iconBg: '#1C1020', order: 3 } }),
    db.category.upsert({ where: { slug: 'windows' },     update: {}, create: { slug: 'windows',     name: 'Окна и двери', emoji: '🪟', iconBg: '#1C1C10', order: 4 } }),
  ])
  console.log(`✅ Создано ${categories.length} категорий`)

  // Тестовый автор — используем новую схему Better Auth
  // id теперь строка без @default, createdAt/updatedAt без @default
  const authorId = 'author-seed-001'
  const now = new Date()

  const author = await db.user.upsert({
    where: { email: 'arch_studio@revset.ru' },
    update: {},
    create: {
      id:            authorId,
      name:          'arch_studio',
      email:         'arch_studio@revset.ru',
      emailVerified: false,
      role:          'author',
      createdAt:     now,
      updatedAt:     now,
      authorProfile: {
        create: {
          bio:          'BIM-специалист, архитектор.',
          city:         'Москва',
          isVerified:   true,
          responseTime: '~2 часа',
          acceptOrders: true,
        },
      },
    },
  })
  console.log(`✅ Создан автор: ${author.name}`)

  // Товары
  const furniture = categories[0]
  const products = await Promise.all([
    db.product.upsert({ where: { id: 'product-1' }, update: {}, create: { id: 'product-1', name: 'Кресло Herman Miller Aeron', description: 'Высокоточная BIM-модель.', price: 490, priceOld: 690, previewEmoji: '🪑', previewBg: '#141420',revitVersions: ['2022','2023','2024','2025'], fileSize: '4.2 МБ', isPublished: true, isNew: true, downloads: 1240, categoryId: furniture.id, authorId: author.id } }),
    db.product.upsert({ where: { id: 'product-2' }, update: {}, create: { id: 'product-2', name: 'Ванна Villeroy & Boch Oberon', description: 'Точная модель ванны.', price: 350, previewEmoji: '🛁', previewBg: '#14201A',revitVersions: ['2023','2024','2025'], fileSize: '2.8 МБ', isPublished: true, downloads: 430, categoryId: furniture.id, authorId: author.id } }),
    db.product.upsert({ where: { id: 'product-3' }, update: {}, create: { id: 'product-3', name: 'Светильник Eglo Salobrena', description: 'Бесплатная модель.', price: null, previewEmoji: '💡', previewBg: '#201414',revitVersions: ['2022','2023','2024','2025'], fileSize: '1.1 МБ', isPublished: true, downloads: 2100, categoryId: furniture.id, authorId: author.id } }),
  ])
  console.log(`✅ Создано ${products.length} товаров`)
  console.log('🎉 База данных готова!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
