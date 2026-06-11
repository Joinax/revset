'use client'

import ThemeToggle from '@/components/ThemeToggle'

export default function AdminTopbar() {
  return (
    <header className="h-16 bg-white dark:bg-[#1A1D27] border-b border-gray-100 dark:border-gray-800
                       flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 w-64">
        <i className="ti ti-search text-gray-400 text-sm" />
        <input
          type="text"
          placeholder="Поиск..."
          className="bg-transparent text-sm outline-none text-gray-700 dark:text-gray-300
                     placeholder-gray-400 w-full"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <i className="ti ti-bell text-xl text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center
                          text-white text-sm font-medium">
            A
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Admin</span>
        </div>
      </div>
    </header>
  )
}
