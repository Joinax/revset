// prisma/seed-faq.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

const ARTICLES = [
  // ── PAYMENT ──
  {
    id:          'faq-payment-001',
    question:    'Как оплатить заказ?',
    answer:      'Мы принимаем оплату банковскими картами Visa, Mastercard и МИР через защищённый платёжный шлюз. После оплаты файлы доступны для скачивания немедленно.',
    category:    'PAYMENT',
    position:    1,
    isPublished: true,
  },
  {
    id:          'faq-payment-002',
    question:    'Что делать если оплата прошла, но файл недоступен?',
    answer:      'Иногда требуется 1-2 минуты на обработку. Обновите страницу. Если проблема сохраняется — откройте обращение в поддержку с номером заказа.',
    category:    'PAYMENT',
    position:    2,
    isPublished: true,
  },
  {
    id:          'faq-payment-003',
    question:    'Можно ли вернуть деньги?',
    answer:      'Возврат возможен в течение 7 дней после покупки, если модель не соответствует описанию. Создайте обращение в поддержку с указанием причины и номером заказа.',
    category:    'PAYMENT',
    position:    3,
    isPublished: true,
  },
  // ── DOWNLOAD ──
  {
    id:          'faq-download-001',
    question:    'Как скачать купленный файл?',
    answer:      'В Личном кабинете → Покупки → найдите заказ → нажмите «Скачать». Файлы доступны в формате RFA (Revit) или ZIP.',
    category:    'DOWNLOAD',
    position:    1,
    isPublished: true,
  },
  {
    id:          'faq-download-002',
    question:    'Почему файл не открывается в Revit?',
    answer:      'Проверьте версию Revit: файл совместим с версиями, указанными в описании товара. Если версия совпадает — попробуйте скачать ещё раз или обратитесь в поддержку.',
    category:    'DOWNLOAD',
    position:    2,
    isPublished: true,
  },
  {
    id:          'faq-download-003',
    question:    'Сколько раз можно скачать файл?',
    answer:      'Количество скачиваний не ограничено. Ссылка для скачивания генерируется заново при каждом нажатии и доступна в разделе «Покупки» личного кабинета.',
    category:    'DOWNLOAD',
    position:    3,
    isPublished: true,
  },
  // ── MODERATION ──
  {
    id:          'faq-moderation-001',
    question:    'Почему моя модель отклонена?',
    answer:      'Причина указана в карточке товара на вкладке «Мои модели». Исправьте замечания и отправьте на повторную проверку.',
    category:    'MODERATION',
    position:    1,
    isPublished: true,
  },
  {
    id:          'faq-moderation-002',
    question:    'Сколько времени занимает модерация?',
    answer:      'Обычно 1-3 рабочих дня. В период высокой нагрузки — до 5 дней. Следите за статусом в Личном кабинете в разделе «Мои модели».',
    category:    'MODERATION',
    position:    2,
    isPublished: true,
  },
  {
    id:          'faq-moderation-003',
    question:    'Какие требования к загружаемым моделям?',
    answer:      'Файл должен быть в формате RFA, корректно открываться в Revit, содержать параметры и материалы. Не допускается контент, нарушающий авторские права третьих лиц.',
    category:    'MODERATION',
    position:    3,
    isPublished: true,
  },
  // ── ACCOUNT ──
  {
    id:          'faq-account-001',
    question:    'Как стать автором?',
    answer:      'На странице Личного кабинета нажмите «Стать автором», заполните профиль и дождитесь подтверждения. Обычно занимает 1-2 рабочих дня.',
    category:    'ACCOUNT',
    position:    1,
    isPublished: true,
  },
  {
    id:          'faq-account-002',
    question:    'Как сменить пароль?',
    answer:      'В Личном кабинете → Безопасность → «Сменить пароль». Введите текущий пароль и укажите новый.',
    category:    'ACCOUNT',
    position:    2,
    isPublished: true,
  },
  // ── OTHER ──
  {
    id:          'faq-other-001',
    question:    'Как предложить идею или улучшение?',
    answer:      'Перейдите на страницу /ideas и опубликуйте предложение. Лучшие идеи мы реализуем в будущих обновлениях платформы.',
    category:    'OTHER',
    position:    1,
    isPublished: true,
  },
  {
    id:          'faq-other-002',
    question:    'Как связаться с поддержкой?',
    answer:      'Создайте обращение в разделе «Поддержка» личного кабинета. Мы отвечаем в течение рабочего дня.',
    category:    'OTHER',
    position:    2,
    isPublished: true,
  },
]

async function main() {
  console.log('🌱 Заполняем FAQ...')

  for (const article of ARTICLES) {
    await db.faqArticle.upsert({
      where:  { id: article.id },
      update: {
        question:    article.question,
        answer:      article.answer,
        category:    article.category,
        position:    article.position,
        isPublished: article.isPublished,
      },
      create: article,
    })
    console.log(`  ✓ ${article.category} — ${article.question.slice(0, 50)}`)
  }

  console.log(`✅ Создано/обновлено ${ARTICLES.length} FAQ статей`)
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
