'use client'

import { useState } from 'react'
import { Calendar, Download, FileText, BarChart2, Package, AlertTriangle, Trash2, Filter } from 'lucide-react'
import { useReports } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatNumber, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useCategories, useStockLocations } from '@/lib/query/hooks'

type ReportType = 'stock_position' | 'movement_history' | 'top_moving' | 'inventory_value' | 'no_movement' | 'loss_adjustment'

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('stock_position')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filters, setFilters] = useState({ location_id: '', category_id: '' })
  const [page, setPage] = useState(1)

  const { data: categories } = useCategories('')
  const { data: locations } = useStockLocations('', true)

  // Mock data for now - replace with actual hooks
  const [stockPosition, setStockPosition] = useState<any[]>([])
  const [movementHistory, setMovementHistory] = useState<any[]>([])
  const [topMoving, setTopMoving] = useState<any[]>([])
  const [inventoryValue, setInventoryValue] = useState<any>(null)
  const [noMovement, setNoMovement] = useState<any[]>([])
  const [lossAdjustment, setLossAdjustment] = useState<any[]>([])

  const handleGenerate = async () => {
    // Call actual report hooks here
    console.log('Generating report:', reportType, dateRange, filters)
  }

  const handleExport = (type: 'csv' | 'pdf' | 'xlsx') => {
    console.log('Exporting as', type)
  }

  const reportTypes = [
    { value: 'stock_position', label: 'Posição de Estoque', icon: Package },
    { value: 'movement_history', label: 'Histórico de Movimentações', icon: FileText },
    { value: 'top_moving', label: 'Produtos Mais Movimentados', icon: TrendingUp },
    { value: 'inventory_value', label: 'Valor Total do Inventário', icon: DollarSign },
    { value: 'no_movement', label: 'Produtos Sem Movimentação', icon: Package },
    { value: 'loss_adjustment', label: 'Histórico de Perdas e Ajustes', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios e exporte dados do seu estoque</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Tipo de Relatório"
              options={reportTypes.map(r => ({ value: r.value, label: r.label }))}
              value={reportType}
              onValueChange={setReportType}
            />
            <div className="grid gap-2">
              <label className="text-sm font-medium">Período</label>
              <div className="flex gap-2">
                <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} placeholder="Início" />
                <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} placeholder="Fim" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Depósito</label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...(locations?.map(l => ({ value: l.id, label: l.name })) || [])]}
                value={filters.location_id}
                onValueChange={(v) => setFilters({...filters, location_id: v})}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                options={[{ value: '', label: 'Todas' }, ...(categories?.map(c => ({ value: c.id, label: c.name })) || [])]}
                value={filters.category_id}
                onValueChange={(v) => setFilters({...filters, category_id: v})}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleGenerate}>
              <Filter className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('xlsx')}>
              <BarChart2 className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reportTypes.find(r => r.value === reportType)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {reportType === 'stock_position' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Total Custo</TableHead>
                  <TableHead className="text-right">Total Venda</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockPosition.length > 0 ? stockPosition.map(item => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.product_sku}</TableCell>
                    <TableCell>{item.category_name || '-'}</TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sale_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        item.status === 'out' ? 'bg-red-100 text-red-800' :
                        item.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {item.status === 'out' ? 'Sem estoque' : item.status === 'low' ? 'Baixo' : 'Normal'}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum dado" description="Clique em Gerar Relatório para ver os resultados" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {reportType === 'movement_history' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Saldo Ant.</TableHead>
                  <TableHead>Saldo Dep.</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementHistory.length > 0 ? movementHistory.map(mov => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDateTime(mov.date)}</TableCell>
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
                    <TableCell className="text-right">{formatNumber(mov.quantity)}</TableCell>
                    <TableCell className="text-right">{formatNumber(mov.balance_before)}</TableCell>
                    <TableCell className="text-right">{formatNumber(mov.balance_after)}</TableCell>
                    <TableCell>{mov.location_name}</TableCell>
                    <TableCell>{mov.reason || '-'}</TableCell>
                    <TableCell>{mov.created_by_name}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <EmptyState icon={<FileText className="h-8 w-8" />} title="Nenhum dado" description="Gere o relatório para ver o histórico" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {reportType === 'inventory_value' && inventoryValue && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Valor Total (Custo)</p>
                    <p className="text-2xl font-bold">{formatCurrency(inventoryValue.total_cost)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Valor Total (Venda)</p>
                    <p className="text-2xl font-bold">{formatCurrency(inventoryValue.total_sale_value)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total de Unidades</p>
                    <p className="text-2xl font-bold">{formatNumber(inventoryValue.total_quantity)}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Por Categoria</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Produtos</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {inventoryValue.by_category.map((cat: any) => (
                          <TableRow key={cat.category_name}>
                            <TableCell>{cat.category_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.total_cost)}</TableCell>
                            <TableCell className="text-right">{formatNumber(cat.total_quantity)}</TableCell>
                            <TableCell className="text-right">{cat.product_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Por Depósito</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Depósito</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {inventoryValue.by_location.map((loc: any) => (
                          <TableRow key={loc.location_name}>
                            <TableCell>{loc.location_name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(loc.total_cost)}</TableCell>
                            <TableCell className="text-right">{formatNumber(loc.total_quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {reportType === 'loss_adjustment' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lossAdjustment.length > 0 ? lossAdjustment.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateTime(item.date)}</TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', item.type === 'loss' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                    <TableCell>{item.reason || '-'}</TableCell>
                    <TableCell>{item.notes || '-'}</TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell>{item.created_by_name}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="Nenhum dado" description="Gere o relatório para ver perdas e ajustes" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}