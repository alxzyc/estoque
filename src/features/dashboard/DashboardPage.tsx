'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Package, AlertTriangle, Box, DollarSign, RefreshCw } from 'lucide-react'
import { useDashboardMetrics, useRecentMovements, useTopSellingProducts, useMovementChartData, useStockEvolution, useLowStockProducts, useOutOfStockProducts, useExpiringProducts, useStockLocations } from '@/lib/query/hooks'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton, DashboardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatNumber, formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export function DashboardPage() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [locationFilter, setLocationFilter] = useState<string>('')

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(locationFilter || undefined)
  const { data: recentMovements } = useRecentMovements(10, locationFilter || undefined)
  const { data: topSelling } = useTopSellingProducts(Number(period), 10, locationFilter || undefined)
  const { data: movementChart } = useMovementChartData(Number(period), locationFilter || undefined)
  const { data: stockEvolution } = useStockEvolution(Number(period), undefined, locationFilter || undefined)
  const { data: lowStock } = useLowStockProducts('', locationFilter || undefined)
  const { data: outOfStock } = useOutOfStockProducts('', locationFilter || undefined)
  const { data: expiring } = useExpiringProducts('', 30, locationFilter || undefined)
  const { data: locations } = useStockLocations('', true)

  if (metricsLoading) {
    return <DashboardSkeleton />
  }

  const metricCards = [
    { title: 'Produtos Ativos', value: metrics?.active_products || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Unidades em Estoque', value: formatNumber(metrics?.total_units || 0), icon: Box, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Estoque Baixo', value: metrics?.low_stock_count || 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'Sem Estoque', value: metrics?.out_of_stock_count || 0, icon: Package, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Valor do Inventário', value: formatCurrency(metrics?.inventory_value || 0), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu estoque</p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={locationFilter}
            onValueChange={setLocationFilter}
            options={[
              { value: '', label: 'Todos os depósitos' },
              ...(locations?.map(l => ({ value: l.id, label: l.name })) || [])
            ]}
            placeholder="Filtrar por depósito"
          />
          <Select
            value={period}
            onValueChange={setPeriod as any}
            options={[
              { value: '7', label: 'Últimos 7 dias' },
              { value: '30', label: 'Últimos 30 dias' },
              { value: '90', label: 'Últimos 90 dias' },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((metric, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-3xl font-bold {metric.color}">{metric.value}</p>
                </div>
                <div className={cn('p-3 rounded-full', metric.bg)}>
                  <metric.icon className="h-6 w-6 {metric.color}" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle>Entradas vs Saídas ({period === '7' ? '7 dias' : period === '30' ? '30 dias' : '90 dias'})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={movementChart || []}>
                <defs>
                  <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} />
                <YAxis />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                  formatter={(value: number, name: string) => [formatNumber(value), name === 'entries' ? 'Entradas' : 'Saídas']}
                />
                <Legend />
                <Area type="monotone" dataKey="entries" name="Entradas" stroke="#22c55e" fillOpacity={1} fill="url(#colorEntries)" />
                <Area type="monotone" dataKey="exits" name="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExits)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-3">
          <CardHeader>
            <CardTitle>Evolução do Estoque Total</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockEvolution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} />
                <YAxis />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                  formatter={(value: number) => [formatNumber(value), 'Saldo']}
                />
                <Line type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mais Vendidos ({period === '7' ? '7 dias' : period === '30' ? '30 dias' : '90 dias'})</CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling && topSelling.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSelling.slice(0, 10).map((item, i) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.total_quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="Sem dados" description="Nenhuma venda no período" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Estoque Baixo ({lowStock?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Atual</TableHead>
                    <TableHead>Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.slice(0, 10).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatNumber(item.total_stock)}</TableCell>
                      <TableCell>{item.min_stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={<Package className="h-8 w-8" />} title="OK" description="Nenhum produto com estoque baixo" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sem Estoque ({outOfStock?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStock && outOfStock.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Depósito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outOfStock.slice(0, 10).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.location_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={<Package className="h-8 w-8" />} title="OK" description="Todos os produtos têm estoque" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximos ao Vencimento ({expiring?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {expiring && expiring.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiring.slice(0, 10).map(item => (
                    <TableRow key={`${item.product_id}-${item.lot_code}`}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.lot_code}</TableCell>
                      <TableCell>{new Date(item.expires_on).toLocaleDateString('pt-BR')} ({item.days_until_expiry}d)</TableCell>
                      <TableCell>{formatNumber(item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="OK" description="Nenhum lote vencendo" />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements && recentMovements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatRelativeTime(mov.created_at)}</TableCell>
                      <TableCell className="font-medium">{mov.product_name}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          ['in', 'return', 'transfer_in'].includes(mov.type) ? 'bg-green-100 text-green-800' :
                          ['out', 'loss', 'transfer_out'].includes(mov.type) ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {mov.type}
                        </span>
                      </TableCell>
                      <TableCell>{formatNumber(mov.quantity)}</TableCell>
                      <TableCell>{mov.location_name}</TableCell>
                      <TableCell>{mov.created_by_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={<RefreshCw className="h-8 w-8" />} title="Sem movimentações" description="Nenhuma movimentação recente" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}