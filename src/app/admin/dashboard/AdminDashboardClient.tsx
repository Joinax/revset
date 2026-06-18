'use client'

import Link from 'next/link'

type Stats = {
  totalUsers: number
  totalProducts: number
  publishedProducts: number
  pendingVerification: number
  revenueThisMonth: number
  revenueChange: number
  ordersThisMonth: number
}

type ChartPoint = { date: string; amount: number }

type RecentOrder = {
  id: string
  userName: string
  userEmail: string
  amount: number
  productName: string
  itemCount: number
  createdAt: string
}

type Props = {
  stats: Stats
  chartData: ChartPoint[]
  recentOrders: RecentOrder[]
}

function StatCard({
  label, value, icon, sub, subPositive, href,
}: {
  label: string
  value: string
  icon: string
  sub?: string
  subPositive?: boolean
  href?: string
}) {
  const content = (
    <div className="admin-stat-card" style={{
      background: 'var(--admin-bg)',
      border: '1px solid var(--admin-border)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--admin-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'rgba(41,82,200,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: '18px', color: 'var(--admin-accent)' }} />
        </span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)', marginBottom: '6px' }}>{value}</div>
      {sub && (
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: subPositive ? 'var(--admin-success)' : 'var(--admin-danger)',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <i className={`ti ${subPositive ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ fontSize: '13px' }} />
          {sub}
        </div>
      )}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

function MiniChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '128px', color: 'var(--admin-muted)', fontSize: '13px' }}>
        Нет данных за последние 30 дней
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.amount))
  const w = 600
  const h = 120
  const pad = 8

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2)
    const y = h - pad - ((d.amount / (max || 1)) * (h - pad * 2))
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '128px' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--admin-accent)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--admin-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke="var(--admin-accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export default function AdminDashboardClient({ stats, chartData, recentOrders }: Props) {
  const formatMoney = (n: number) =>
    n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

  const cardStyle = {
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .admin-stat-card:hover { box-shadow: 0 8px 32px rgba(72,128,255,0.12) !important; transform: translateY(-1px); transition: all 0.2s; }
        .admin-stat-card { transition: all 0.2s; }
        .admin-order-row:hover { background: rgba(72,128,255,0.04) !important; }
        .admin-order-row { transition: background 0.15s; cursor: pointer; }
      `}</style>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text)' }}>Дашборд</h1>
        <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginTop: '4px' }}>Обзор платформы</p>
      </div>

      {/* Карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard label="Пользователи" value={stats.totalUsers.toLocaleString('ru-RU')} icon="ti-users" href="/admin/users" />
        <StatCard
          label="Семейства"
          value={`${stats.publishedProducts} / ${stats.totalProducts}`}
          icon="ti-box"
          sub={`${stats.totalProducts - stats.publishedProducts} на модерации`}
          subPositive={stats.totalProducts - stats.publishedProducts === 0}
          href="/admin/families"
        />
        <StatCard
          label="Выручка за месяц"
          value={formatMoney(stats.revenueThisMonth)}
          icon="ti-credit-card"
          sub={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% к прошлому месяцу` : undefined}
          subPositive={stats.revenueChange >= 0}
          href="/admin/transactions"
        />
        <StatCard
          label="Ждут верификации"
          value={stats.pendingVerification.toLocaleString('ru-RU')}
          icon="ti-shield-check"
          sub={stats.pendingVerification > 0 ? 'Требуют проверки' : 'Всё проверено'}
          subPositive={stats.pendingVerification === 0}
          href="/admin/verification"
        />
      </div>

      {/* График */}
      <div style={{ ...cardStyle, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--admin-text)' }}>Продажи за 30 дней</h2>
            <p style={{ fontSize: '12px', color: 'var(--admin-muted)', marginTop: '2px' }}>{stats.ordersThisMonth} заказов в этом месяце</p>
          </div>
        </div>
        <MiniChart data={chartData} />
      </div>

      {/* Последние заказы */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--admin-border)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--admin-text)' }}>Последние заказы</h2>
          <Link href="/admin/transactions" style={{ fontSize: '13px', color: 'var(--admin-accent)' }}>
            Смотреть все
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '13px' }}>
            Заказов пока нет
          </div>
        ) : (
          <div>
            {recentOrders.map((order, i) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="admin-order-row" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < recentOrders.length - 1 ? '1px solid var(--admin-border)' : 'none',
                textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(41,82,200,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-accent)' }}>
                      {order.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.userName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.productName}{order.itemCount > 1 ? ` +${order.itemCount - 1}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text)' }}>{formatMoney(order.amount)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>{formatDate(order.createdAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
