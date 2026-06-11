// src/app/author/[id]/page.tsx
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import AuthorProducts from '@/components/AuthorProducts'
import AuthorSubscribeButton from '@/components/AuthorSubscribeButton'

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [author, session] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        authorProfile: true,
        products: {
          where:   { isPublished: true },
          orderBy: { downloads: 'desc' },
          include: {
            category: { select: { name: true } },
            reviews:  { select: { rating: true } },
            _count:   { select: { reviews: true } },
          },
        },
        _count: { select: { followers: true } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])

  if (!author || author.role !== 'author') notFound()

  let isFollowing = false
  if (session?.user && session.user.id !== id) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: id } },
    })
    isFollowing = !!follow
  }

  const memberSince = new Date(author.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })

  const mappedProducts = author.products.map(p => ({
    id:            p.id,
    name:          p.name,
    author:        author.name ?? 'Автор',
    price:         p.price,
    rating:        p.reviews.length > 0
      ? Math.round(p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length * 10) / 10
      : null,
    reviewCount:   p._count.reviews,
    isNew:         p.isNew,
    emoji:         p.previewEmoji ?? '📦',
    previewBg:     p.previewBg   ?? '#141420',
    images:        p.images ?? [],
    categoryName:  p.category.name,
    revitVersions: p.revitVersions,
  }))

  const isOwnProfile = session?.user?.id === id

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 48px 0' }}>
          <div className="author-hero">
            <div className="author-hero-pattern" />
            <div className="author-hero-overlay" />
            <div className="author-hero-inner">
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: '88px', height: '88px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: author.image ? '#fff' : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', fontWeight: 800, color: '#fff',
                  border: '3px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  {author.image
                    ? <img src={author.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (author.name ?? 'А')[0].toUpperCase()
                  }
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                      {author.name}
                    </h1>
                    {author.authorProfile?.isVerified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1D9E75', background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                        <i className="ti ti-circle-check-filled" style={{ fontSize: '13px' }} />
                        Проверенный автор
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>На сайте с {memberSince}{author.authorProfile?.city && ` · ${author.authorProfile.city}`}</span>
                    <span>{author._count.followers} подписчиков</span>
                  </div>

                  {author.authorProfile?.bio && (
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, maxWidth: '500px', margin: '0 0 16px' }}>
                      {author.authorProfile.bio}
                    </p>
                  )}
                  {!isOwnProfile && (
                    <div className="hero-subscribe-btn">
                      <AuthorSubscribeButton authorId={id} isFollowing={isFollowing} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 64px 48px' }}>


          {mappedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <i className="ti ti-file-3d" style={{ fontSize: '48px', display: 'block', marginBottom: '16px', opacity: 0.25 }} />
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Нет опубликованных моделей</p>
              <p style={{ fontSize: '13px' }}>Этот автор пока не загрузил ни одной модели</p>
            </div>
          ) : (
            <AuthorProducts products={mappedProducts} authorName={author.name ?? 'Автор'} />
          )}
        </div>
      </div>

      <style>{`
        body { background: var(--bg); }
        .author-hero {
          position: relative; overflow: hidden;
          background: #0e0e0e; min-height: 200px;
          display: flex; align-items: center;
          border-radius: 16px; margin-bottom: 0;
        }
        .author-hero-pattern {
          position: absolute; inset: 0;
          background-color: #0e0e0e;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpolygon points='0,100 100,0 200,100 100,200' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cpolygon points='0,0 100,60 200,0' fill='rgba(255,255,255,0.02)' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3Cpolygon points='0,200 100,140 200,200' fill='rgba(255,255,255,0.015)' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3Cpolygon points='0,100 100,60 100,140' fill='rgba(255,255,255,0.025)' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3Cpolygon points='200,100 100,60 100,140' fill='rgba(255,255,255,0.01)' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }
        .author-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 50%, rgba(0,0,0,0.3) 100%);
        }
        .author-hero-inner {
          position: relative; z-index: 1;
          width: 100%; padding: 40px 48px;
        }
        .dark .author-hero { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6); }

        @media (max-width: 768px) {
          .author-hero-inner { padding: 28px 16px 36px; }
        }
      `}</style>
    </>
  )
}
