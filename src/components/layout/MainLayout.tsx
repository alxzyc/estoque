'use client'

import { useState, ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/utils/cn'

interface MainLayoutProps {
  children: ReactNode
  user?: {
    name: string
    email: string
    avatar?: string
  }
  notifications?: Array<{
    id: string
    title: string
    message: string
    created_at: string
    read: boolean
  }>
  unreadCount?: number
}

export function MainLayout({ 
  children, 
  user, 
  notifications = [], 
  unreadCount = 0 
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className={cn('transition-all duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
          <main className="pt-16 min-h-screen">
            <div className="p-4">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <main className="pt-16 min-h-screen">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}