type Props = {
  productCount?: number
  authorCount?:  number
}

export default function StatsStrip({
  productCount = 0,
  authorCount  = 0,
}: Props) {
  const stats = [
    { value: productCount.toLocaleString('ru') + '+', label: 'RFA-семейств'       },
    { value: authorCount.toLocaleString('ru'),         label: 'Авторов'            },
    { value: '3 200+',                                 label: 'Скачиваний сегодня' },
  ]

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: 'var(--border)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }} className="stats-strip">
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg)',
            padding: '22px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: '24px', fontWeight: 700, color: 'var(--accent)',
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 400px) {
          .stats-strip { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
