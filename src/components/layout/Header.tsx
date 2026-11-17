'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Menu, User, LogOut, Sun, Moon, Bell, Settings } from 'lucide-react'
import { formatRelativeTime } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'

interface HeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
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

export function Header({ 
  sidebarCollapsed, 
  onToggleSidebar, 
  user, 
  notifications = [], 
  unreadCount = 0 
}: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    document.documentElement.classList.toggle('dark', newDarkMode)
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
  }

  const handleSignOut = () => {
    toast.addToast({
      type: 'info',
      title: 'Saindo...',
      message: 'Redirecionando para a página de login',
    })
    // Implementar logout real
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={<Bell className="h-5 w-5" />}
            content={
              <div className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className={cn('text-left', !notif.read && 'font-medium')}
                      onClick={() => {
                        // Marcar como lida
                      }}
                    >
                      <div>
                        <p className="text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {}}>Ver todas</DropdownMenuItem>
              </div>
            }
            align="end"
          >
            <Button variant="ghost" size="icon" aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenu>

          <DropdownMenu
            trigger={
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            }
            content={
              <div className="w-56">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {}}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </div>
            }
            align="end"
          />
        </div>
      </div>
    </header>
  )
}