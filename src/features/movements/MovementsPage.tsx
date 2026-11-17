'use client'

import { useState, useCallback } from 'react'
import { Plus, Search, Filter, Download, ArrowUpDown, RotateCcw, Truck, Package, Minus, AlertTriangle } from 'lucide-react'
import { useApplyMovement, useApplyTransfer, useReverseMovement, useStockLocations, useProducts, useSuppliers } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatNumber, formatDateTime, getMovementTypeLabel, getMovementTypeColor } from '@/utils/format'
import { cn } from '@/utils/cn'
import { movementSchema, adjustmentSchema, transferSchema, lossSchema } from '@/lib/validations/schemas'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MOVEMENT_TYPES, LOSS_REASONS } from '@/domain/movements/rules'

type MovementFormData = {
  product_id: string
  location_id: string
  type: string
  direction?: string
  quantity: number
  reason: string
  notes: string
  supplier_id: string
  unit_cost: number
  document_ref: string
}

type TransferFormData = {
  product_id: string
  from_location_id: string
  to_location_id: string
  quantity: number
  reason: string
  notes: string
}

export function MovementsPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history')
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer'>('in')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    product_id: '',
    location_id: '',
    type: '',
    start_date: '',
    end_date: ''
  })

  const { data: products } = useProducts('', {}, 1, 1000)
  const { data: locations } = useStockLocations('', true)
  const { data: suppliers } = useSuppliers('', true)

  const applyMovement = useApplyMovement()
  const applyTransfer = useApplyTransfer()
  const reverseMovement = useReverseMovement()

  const movementForm = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: '',
      location_id: '',
      type: 'in',
      direction: undefined,
      quantity: 1,
      reason: '',
      notes: '',
      supplier_id: '',
      unit_cost: 0,
      document_ref: '',
    }
  })

  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      product_id: '',
      from_location_id: '',
      to_location_id: '',
      quantity: 1,
      reason: '',
      notes: '',
    }
  })

  const toast = useToast()

  const handleMovementSubmit = async (data: MovementFormData) => {
    try {
      const idempotencyKey = crypto.randomUUID()
      await applyMovement.mutateAsync({
        ...data,
        quantity: Number(data.quantity),
        unit_cost: data.unit_cost || null,
        supplier_id: data.supplier_id || null,
        direction: data.direction as any,
        transfer_group_id: null,
        idempotency_key: idempotencyKey,
        created_by: '' // from auth context
      })
      toast.addToast({ type: 'success', title: 'Movimentação registrada' })
      movementForm.reset({ type: movementType })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleTransferSubmit = async (data: TransferFormData) => {
    try {
      const idempotencyKey = crypto.randomUUID()
      await applyTransfer.mutateAsync({
        ...data,
        quantity: Number(data.quantity),
        idempotency_key: idempotencyKey,
        created_by: ''
      })
      toast.addToast({ type: 'success', title: 'Transferência realizada' })
      transferForm.reset()
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleReverse = async (movementId: string) => {
    const reason = prompt('Motivo do estorno:')
    if (!reason) return
    try {
      const idempotencyKey = crypto.randomUUID()
      await reverseMovement.mutateAsync({ movementId, reason, createdBy: '', idempotencyKey })
      toast.addToast({ type: 'success', title: 'Estorno realizado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const getProductName = (id: string) => products?.find(p => p.id === id)?.name || id
  const getLocationName = (id: string) => locations?.find(l => l.id === id)?.name || id
  const getSupplierName = (id: string) => suppliers?.find(s => s.id === id)?.company_name || id

  const movementTypeOptions = [
    { value: 'in', label: 'Entrada', icon: ArrowUpDown },
    { value: 'out', label: 'Saída', icon: ArrowUpDown },
    { value: 'adjustment', label: 'Ajuste', icon: RotateCcw },
    { value: 'return', label: 'Devolução', icon: RotateCcw },
    { value: 'loss', label: 'Perda/Avaria', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
          <p className="text-muted-foreground">Registre entradas, saídas, ajustes e transferências</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => { setActiveTab('new'); setMovementType('in'); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Histórico
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'new'}
          onClick={() => setActiveTab('new')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'new' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Nova Movimentação
        </button>
      </div>

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Input placeholder="Buscar produto..." className="w-64" />
              <Select
                options={[
                  { value: '', label: 'Todos os tipos' },
                  ...MOVEMENT_TYPES.map(t => ({ value: t.value, label: t.label }))
                ]}
                placeholder="Tipo"
              />
              <Select
                options={[
                  { value: '', label: 'Todos os depósitos' },
                  ...(locations?.map(l => ({ value: l.id, label: l.name })) || [])
                ]}
                placeholder="Depósito"
              />
              <div className="flex gap-2">
                <Input type="date" placeholder="Data inicial" className="w-40" />
                <Input type="date" placeholder="Data final" className="w-40" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Saldo Antes → Depois</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <EmptyState
                  icon={<ArrowUpDown className="h-12 w-12" />}
                  title="Nenhuma movimentação encontrada"
                  description="Registre a primeira movimentação para começar o histórico"
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'new' && (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap" role="tablist">
            {movementTypeOptions.map(opt => (
              <button
                key={opt.value}
                role="tab"
                aria-selected={movementType === opt.value}
                onClick={() => setMovementType(opt.value as any)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  movementType === opt.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {opt.label}
              </button>
            ))}
            <button
              role="tab"
              aria-selected={movementType === 'transfer'}
              onClick={() => setMovementType('transfer')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                movementType === 'transfer' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Truck className="h-4 w-4 mr-1 inline" />
              Transferência
            </button>
          </div>

          {movementType !== 'transfer' && (
            <Card>
              <CardHeader>
                <CardTitle>{MOVEMENT_TYPES.find(t => t.value === movementType)?.label} de Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={movementForm.handleSubmit(handleMovementSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Produto *"
                      options={products?.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })) || []}
                      {...movementForm.register('product_id')}
                      required
                    />
                    <Select
                      label="Depósito *"
                      options={locations?.map(l => ({ value: l.id, label: l.name })) || []}
                      {...movementForm.register('location_id')}
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      label="Quantidade *"
                      type="number"
                      step="0.001"
                      min="0.001"
                      {...movementForm.register('quantity', { valueAsNumber: true })}
                      required
                    />
                    {movementType === 'adjustment' && (
                      <Select
                        label="Direção *"
                        options={[
                          { value: 'increase', label: 'Aumento (+)' },
                          { value: 'decrease', label: 'Diminuição (-)' }
                        ]}
                        {...movementForm.register('direction')}
                        required
                      />
                    )}
                    {['in', 'return'].includes(movementType) && (
                      <Input
                        label="Custo Unitário"
                        type="number"
                        step="0.01"
                        min="0"
                        {...movementForm.register('unit_cost', { valueAsNumber: true })}
                      />
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {['in', 'return'].includes(movementType) && (
                      <Select
                        label="Fornecedor"
                        options={[
                          { value: '', label: 'Sem fornecedor' },
                          ...(suppliers?.map(s => ({ value: s.id, label: s.company_name })) || [])
                        ]}
                        {...movementForm.register('supplier_id')}
                      />
                    )}
                    <Input label="Documento/Referência" {...movementForm.register('document_ref')} />
                  </div>
                  <Select
                    label="Motivo"
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...(MOVEMENT_REASONS[movementType as keyof typeof MOVEMENT_REASONS] || []).map(r => ({ value: r, label: r }))
                    ]}
                    {...movementForm.register('reason')}
                  />
                  <Input label="Observações" {...movementForm.register('notes')} />
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="submit" disabled={applyMovement.isPending}>
                      Registrar {MOVEMENT_TYPES.find(t => t.value === movementType)?.label}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {movementType === 'transfer' && (
            <Card>
              <CardHeader>
                <CardTitle>Transferência entre Depósitos</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={transferForm.handleSubmit(handleTransferSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Select
                      label="Produto *"
                      options={products?.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })) || []}
                      {...transferForm.register('product_id')}
                      required
                    />
                    <Select
                      label="Depósito de Origem *"
                      options={locations?.map(l => ({ value: l.id, label: l.name })) || []}
                      {...transferForm.register('from_location_id')}
                      required
                    />
                    <Select
                      label="Depósito de Destino *"
                      options={locations?.map(l => ({ value: l.id, label: l.name })) || []}
                      {...transferForm.register('to_location_id')}
                      required
                    />
                  </div>
                  <Input
                    label="Quantidade *"
                    type="number"
                    step="0.001"
                    min="0.001"
                    {...transferForm.register('quantity', { valueAsNumber: true })}
                    required
                  />
                  <Select
                    label="Motivo"
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...(MOVEMENT_REASONS['transfer_out'] || []).map(r => ({ value: r, label: r }))
                    ]}
                    {...transferForm.register('reason')}
                  />
                  <Input label="Observações" {...transferForm.register('notes')} />
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="submit" disabled={applyTransfer.isPending}>
                      <Truck className="h-4 w-4 mr-2" />
                      Realizar Transferência
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

const MOVEMENT_REASONS: Record<string, string[]> = {
  in: ['compra', 'devolução de cliente', 'ajuste de inventário', 'transferência entrada', 'outro'],
  out: ['venda', 'consumo interno', 'doação', 'transferência saída', 'outro'],
  adjustment: ['inventário físico', 'correção de erro', 'ajuste de sistema', 'outro'],
  return: ['devolução de cliente', 'devolução para fornecedor', 'outro'],
  loss: ['avaria', 'vencimento', 'roubo/furto', 'quebra', 'deterioração', 'outro'],
  transfer_out: ['transferência entre depósitos', 'outro'],
  transfer_in: ['transferência entre depósitos', 'outro'],
}