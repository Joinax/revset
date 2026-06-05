// src/app/faq/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const SECTIONS = [
  {
    title: 'Покупателям',
    icon:  'ti-shopping-bag',
    faqs: [
      { q: 'Как скачать модель после покупки?',       a: 'После оплаты перейдите в личный кабинет → вкладка «Покупки». Там будет кнопка «Скачать RFA» для каждой купленной модели. Ссылка генерируется заново при каждом нажатии — файл можно скачивать неограниченное количество раз.' },
      { q: 'Какие версии Revit поддерживаются?',      a: 'Мы поддерживаем Revit 2022, 2023, 2024 и 2025. Совместимые версии указаны на странице каждой модели.' },
      { q: 'Можно ли вернуть деньги?',                a: 'Возврат возможен в течение 7 дней после покупки если модель не соответствует описанию. Напишите в поддержку с указанием причины.' },
      { q: 'Как оплатить?',                           a: 'Принимаем банковские карты (Visa, МИР, Mastercard), СБП, SberPay и ЮMoney.' },
      { q: 'Бесплатные модели — зачем регистрация?',  a: 'Регистрация нужна чтобы отслеживать скачанные модели и оставлять отзывы.' },
    ],
  },
  {
    title: 'Авторам',
    icon:  'ti-upload',
    faqs: [
      { q: 'Как стать автором?',                     a: 'Зарегистрируйтесь на сайте, перейдите в личный кабинет и подайте заявку на статус автора. Проверка занимает до 24 часов.' },
      { q: 'Какой процент я получаю с продаж?',      a: '80% от стоимости каждой продажи. Остальные 20% — комиссия платформы.' },
      { q: 'Когда и как происходят выплаты?',        a: 'Выплаты раз в месяц — 10-го числа за предыдущий месяц. Минимальная сумма выплаты — 1000 ₽. Переводим на карту или расчётный счёт.' },
      { q: 'Какие требования к моделям?',            a: 'Файл должен быть в формате RFA, корректно открываться в Revit, иметь параметры и материалы. Мы проверяем каждую модель перед публикацией.' },
      { q: 'Можно загружать платные и бесплатные?',  a: 'Да. Бесплатные модели помогают набрать рейтинг и привлечь аудиторию к платным.' },
    ],
  },
  {
    title: 'Технические вопросы',
    icon:  'ti-settings',
    faqs: [
      { q: 'Файл не открывается в Revit — что делать?', a: 'Проверьте совместимость версии Revit на странице модели. Если проблема сохраняется — напишите в поддержку, мы разберёмся с автором.' },
      { q: 'Где хранятся мои данные?',                   a: 'Все данные хранятся на серверах в России в соответствии с требованиями 152-ФЗ.' },
      { q: 'Безопасна ли оплата?',                       a: 'Оплата проходит через ЮKassa — сертифицированный платёжный шлюз. Мы не храним данные карт.' },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg2)', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{q}</span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '16px', color: 'var(--muted)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px', background: 'var(--bg)', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>
          Частые <span>вопросы</span>
        </h1>
        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)', marginBottom: '40px' }}>
          Не нашли ответ? Напишите нам
        </p>

        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className={`ti ${section.icon}`} style={{ fontSize: '18px', color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '16px', margin: 0 }}>{section.title}</h2>
            </div>
            {section.faqs.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        ))}

        {/* Контакты */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', textAlign: 'center', marginTop: '16px' }}>
          <h3 style={{ marginBottom: '8px' }}>Остались вопросы?</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Напишите нам — ответим в течение нескольких часов</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="mailto:support@revset.ru" className="btn-primary">
              <i className="ti ti-mail" style={{ marginRight: '6px' }} />
              support@revset.ru
            </Link>
            <Link href="https://t.me/revset_support" className="btn-outline">
              <i className="ti ti-brand-telegram" style={{ marginRight: '6px' }} />
              Telegram
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
