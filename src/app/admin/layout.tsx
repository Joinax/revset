import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .admin-root {
          --admin-bg-page: #F5F6FA;
          --admin-bg:      #FFFFFF;
          --admin-bg2:     #F5F6FA;
          --admin-border:  #E0E0E0;
          --admin-text:    #202224;
          --admin-muted:   #848484;
          --admin-accent:  #4880FF;
          --admin-success: #00B69B;
          --admin-danger:  #EF3826;
          --admin-warning: #FFA756;
          --admin-shadow:  0 6px 54px rgba(0,0,0,0.05);
          --admin-radius:  14px;
        }
        .dark .admin-root {
          --admin-bg-page: #1C1C28;
          --admin-bg:      #242535;
          --admin-bg2:     #1C1C28;
          --admin-border:  rgba(255,255,255,0.08);
          --admin-text:    #EEEDF6;
          --admin-muted:   #72718A;
          --admin-accent:  #4880FF;
          --admin-success: #00B69B;
          --admin-danger:  #EF3826;
          --admin-warning: #FFA756;
          --admin-shadow:  0 6px 54px rgba(0,0,0,0.2);
          --admin-radius:  14px;
        }
      `}</style>
      <div className="admin-root" style={{ display: 'flex', height: '100vh', background: 'var(--admin-bg-page)' }}>
        <AdminSidebar />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <AdminTopbar />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
