import Link from 'next/link'

type Props = {
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
}

export default function CTABlock({
  title       = 'Вы автор BIM-семейств?',
  description = 'Загружайте модели и зарабатывайте. Комиссия 20% — лучшие условия на рынке.',
  buttonText  = 'Стать автором',
  buttonHref  = '/for-authors',
}: Props) {
  return (
    <>
      <div className="cta-block" style={{
        margin: '0 24px 24px',
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '28px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div>
          <h3 style={{ marginBottom: '6px' }}>{title}</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>

        <Link href={buttonHref} className="btn-primary cta-btn"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          {buttonText}
        </Link>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cta-block {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .cta-btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}
