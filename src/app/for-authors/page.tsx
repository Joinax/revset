// src/app/for-authors/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Авторам — загружайте BIM-семейства и зарабатывайте | REVSET',
  description: 'Станьте автором на REVSET. Загружайте RFA-семейства для Revit, получайте 80% с каждой продажи. Регистрация бесплатна.',
}

const STEPS = [
  { num: '01', title: 'Зарегистрируйтесь', desc: 'Создайте аккаунт и подайте заявку на статус автора. Проверка занимает до 24 часов.' },
  { num: '02', title: 'Загрузите модели', desc: 'Загружайте RFA-файлы через личный кабинет. Добавьте фото, описание и укажите версии Revit.' },
  { num: '03', title: 'Получайте доход', desc: 'Вы получаете 80% с каждой продажи. Выплаты — раз в месяц на карту или счёт.' },
]

const BENEFITS = [
  { icon: 'ti-currency-rubel', title: '80% с продаж',       desc: 'Лучшие условия на рынке. Никаких скрытых комиссий.' },
  { icon: 'ti-chart-bar',      title: 'Аналитика продаж',   desc: 'Следите за статистикой в реальном времени.' },
  { icon: 'ti-users',          title: 'Аудитория',          desc: 'Тысячи BIM-специалистов уже ищут модели на REVSET.' },
  { icon: 'ti-shield-check',   title: 'Защита файлов',      desc: 'Ваши файлы защищены — доступ только после оплаты.' },
  { icon: 'ti-headset',        title: 'Поддержка',          desc: 'Помогаем с загрузкой и продвижением моделей.' },
  { icon: 'ti-star',           title: 'Верификация',        desc: 'Верифицированные авторы получают больше доверия.' },
]

const FAQS = [
  { q: 'Какой формат файлов принимается?', a: 'Только RFA (Revit Family). Мы поддерживаем Revit 2022–2025.' },
  { q: 'Когда я получу выплату?',          a: 'Выплаты производятся раз в месяц — 10-го числа за предыдущий месяц.' },
  { q: 'Могу ли я загружать бесплатные модели?', a: 'Да, бесплатные модели тоже приветствуются — они помогают набрать рейтинг.' },
  { q: 'Что если покупатель недоволен?',   a: 'Мы рассматриваем каждый случай индивидуально. Возвраты возможны в течение 7 дней.' },
]

export default function ForAuthorsPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '64px 24px 48px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', color: 'var(--muted)', marginBottom: '24px' }}>
          <i className="ti ti-upload" style={{ color: 'var(--accent)' }} />
          Для авторов BIM-семейств
        </div>
        <h1 style={{ marginBottom: '16px' }}>
          Зарабатывайте на<br />своих <span>Revit-моделях</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.7 }}>
          Загружайте RFA-семейства и получайте 80% с каждой продажи. Тысячи BIM-специалистов уже ищут качественные модели.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary">Стать автором</Link>
          <Link href="/catalog"  className="btn-outline">Смотреть каталог</Link>
        </div>
      </section>

      {/* Шаги */}
      <section style={{ padding: '48px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>Как это работает</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {STEPS.map(step => (
            <div key={step.num} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: 'var(--font-unbounded), sans-serif', fontSize: '28px', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px' }}>
                {step.num}
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>{step.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Преимущества */}
      <section style={{ padding: '0 24px 48px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>Почему REVSET</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <i className={`ti ${b.icon}`} style={{ fontSize: '22px', color: 'var(--accent)', display: 'block', marginBottom: '10px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{b.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '0 24px 48px', maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Частые вопросы</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {FAQS.map(faq => (
            <div key={faq.q} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{faq.q}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 24px 64px', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '40px 24px', maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '12px' }}>Готовы начать?</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Регистрация займёт 2 минуты. Первую модель можно загрузить сразу после подтверждения аккаунта.
          </p>
          <Link href="/register" className="btn-primary">Зарегистрироваться бесплатно</Link>
        </div>
      </section>

      <div style={{ height: '64px' }} className="bottom-spacer" />
      <style>{`@media (min-width: 641px) { .bottom-spacer { display: none; } }`}</style>
    </div>
  )
}
