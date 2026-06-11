'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/dashboard',     icon: 'ti-layout-dashboard', label: 'Дашборд' },
  { href: '/admin/families',      icon: 'ti-box',              label: 'Семейства' },
  { href: '/admin/users',         icon: 'ti-users',            label: 'Пользователи' },
  { href: '/admin/verification',  icon: 'ti-shield-check',     label: 'Верификация' },
  { href: '/admin/transactions',  icon: 'ti-credit-card',      label: 'Транзакции' },
  { href: '/admin/settings',      icon: 'ti-settings',         label: 'Настройки' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-16 hover:w-56 transition-all duration-300 overflow-hidden
                      bg-white dark:bg-[#1A1D27] border-r border-gray-100 dark:border-gray-800
                      flex flex-col py-4 group">
      {/* Logo */}
      <div className="px-4 mb-8 flex items-center gap-3">
        <span className="text-blue-600 text-xl font-bold shrink-0">R</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                         text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
          REVSET Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {links.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors
                ${active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <i className={`ti ${icon} text-xl shrink-0`} />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                               text-sm whitespace-nowrap">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2">
        <button
          className="flex items-center gap-3 px-2 py-2.5 rounded-lg w-full
                     text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20
                     hover:text-red-600 transition-colors"
        >
          <i className="ti ti-logout text-xl shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                           text-sm whitespace-nowrap">
            Выйти
          </span>
        </button>
      </div>
    </aside>
  )
}
