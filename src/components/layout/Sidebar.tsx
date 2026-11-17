'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  ArrowUpDown,
  BarChart2,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Produtos', href: '/products', icon: Package },
  { label: 'Categorias', href: '/categories', icon: Tags },
  { label: 'Fornecedores', href: '/suppliers', icon: Truck },
  { label: 'Depósitos', href: '/locations', icon: Building2 },
  { label: 'Movimentações', href: '/movements', icon: ArrowUpDown },
  { label: 'Relatórios', href: '/reports', icon: BarChart2, roles: ['admin', 'manager'] },
  { label: 'Usuários', href: '/users', icon: Users, roles: ['admin'] },
  { label: 'Configurações', href: '/settings', icon: Settings, roles: ['admin'] },
]

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Evita hydration mismatch
  if (!mounted) {
    return (
      <aside className={cn('fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-200', collapsed ? 'w-16' : 'w-64')}>
        <div className="flex h-full flex-col" />
      </aside>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <span className="font-semibold text-lg">Estoque</span>
          )}
          <button
            onClick={onToggle}
            className={cn(
              'p-2 rounded-md hover:bg-accent transition-colors',
              collapsed && 'mx-auto'
            )}
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          {!collapsed && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Versão 1.0.0
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}