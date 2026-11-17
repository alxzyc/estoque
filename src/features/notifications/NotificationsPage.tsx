'use client'

import { useState } from 'react'
import { Bell, Check, CheckCheck, Filter, X, AlertTriangle, Package, Clock, TrendingUp, RotateCcw } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatRelativeTime, getAlertLabel, getAlertColor, cn } from '@/utils/cn'

const ALERT_ICONS = {
  low_stock: Package,
  out_of_stock: AlertTriangle,
  expiring: Clock,
  unusual_movement: TrendingUp,
  reorder: RotateCcw,
}

export function NotificationsPage() {
  const [filter, setFilter] = useState({ kind: '', read: '' })
  const [page, setPage] = useState(1)

  const { data: notificationsResult, isLoading } = useNotifications('', filter, page, 50)
  const { data: unreadCount } = useUnreadNotificationCount('')
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  const toast = useToast()

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead.mutateAsync({ organizationId: '' })
      toast.addToast({ type: 'success', title: 'Todas marcadas como lidas' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id)
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const notifications = notificationsResult?.notifications || []
  const total = notificationsResult?.total || 0

  const kindOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'low_stock', label: 'Estoque Baixo' },
    { value: 'out_of_stock', label: 'Sem Estoque' },
    { value: 'expiring', label: 'Próximo ao Vencimento' },
    { value: 'unusual_movement', label: 'Movimentação Incomum' },
    { value: 'reorder', label: 'Ponto de Reposição' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
            <p className="text-muted-foreground">Gerencie alertas e notificações do sistema</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">Gerencie alertas e notificações do sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <Bell className="h-3 w-3" />
            {unreadCount || 0} não lidas
          </Badge>
          {(unreadCount || 0) > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select
              options={kindOptions}
              value={filter.kind}
              onValueChange={(v) => { setFilter({...filter, kind: v}); setPage(1); }}
              placeholder="Tipo de alerta"
            />
            <Select
              options={[
                { value: '', label: 'Todas' },
                { value: 'false', label: 'Não lidas' },
                { value: 'true', label: 'Lidas' }
              ]}
              value={filter.read}
              onValueChange={(v) => { setFilter({...filter, read: v}); setPage(1); }}
              placeholder="Status"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {notifications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map(notif => {
                  const Icon = ALERT_ICONS[notif.kind as keyof typeof ALERT_ICONS] || Bell
                  return (
                    <TableRow key={notif.id} className={!notif.read_at ? 'bg-muted/30' : ''}>
                      <TableCell>
                        <div className={cn(
                          'p-2 rounded-lg',
                          !notif.read_at ? 'bg-primary/10' : 'bg-muted'
                        )}>
                          <Icon className={cn('h-5 w-5', getAlertColor(notif.kind))} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAlertColor(notif.kind) === 'red' ? 'destructive' : getAlertColor(notif.kind) === 'yellow' ? 'secondary' : 'default'}>
                          {getAlertLabel(notif.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {notif.product?.name || 'Sistema'}
                        {notif.product?.sku && <span className="text-muted-foreground ml-1">({notif.product.sku})</span>}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {notif.payload ? JSON.stringify(notif.payload, null, 2).substring(0, 100) + '...' : 'Sem detalhes'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={notif.read_at ? 'default' : 'secondary'}>
                          {notif.read_at ? 'Lida' : 'Não lida'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatRelativeTime(notif.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu
                          trigger={<Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>}
                          content={
                            <>
                              {!notif.read_at && (
                                <DropdownMenuItem onClick={() => handleMarkRead(notif.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Marcar como lida
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                Ver detalhes
                              </DropdownMenuItem>
                            </>
                          }
                          align="end"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * 50) + 1} a {Math.min(page * 50, total)} de {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}>
                  Próxima
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Bell className="h-12 w-12" />}
              title="Nenhuma notificação"
              description={filter.kind || filter.read ? 'Tente ajustar os filtros' : 'Você está em dia! Nenhum alerta no momento.'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}