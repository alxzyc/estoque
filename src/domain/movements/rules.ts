import type { MovementType, MovementDirection } from '@/domain/stock/calculations'

export interface MovementValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MovementPreview {
  currentBalance: number
  newBalance: number
  willBeLowStock: boolean
  willBeOutOfStock: boolean
  willBeNegative: boolean
  minStock: number
}

export const MOVEMENT_REASONS: Record<MovementType, string[]> = {
  in: ['compra', 'devolução de cliente', 'ajuste de inventário', 'transferência entrada', 'outro'],
  out: ['venda', 'consumo interno', 'doação', 'transferência saída', 'outro'],
  adjustment: ['inventário físico', 'correção de erro', 'ajuste de sistema', 'outro'],
  return: ['devolução de cliente', 'devolução para fornecedor', 'outro'],
  loss: ['avaria', 'vencimento', 'roubo/furto', 'quebra', 'outro'],
  transfer_out: ['transferência entre depósitos', 'outro'],
  transfer_in: ['transferência entre depósitos', 'outro'],
}

export const LOSS_REASONS = [
  'avaria',
  'vencimento',
  'roubo/furto',
  'quebra',
  'deterioração',
  'outro',
]

export function validateMovement(
  type: MovementType,
  quantity: number,
  currentBalance: number,
  minStock: number,
  allowNegative: boolean,
  direction?: MovementDirection | null,
  reason?: string | null
): MovementValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (quantity <= 0) {
    errors.push('Quantidade deve ser maior que zero')
  }

  if (type === 'adjustment' && !direction) {
    errors.push('Direção (aumento/diminuição) é obrigatória para ajustes')
  }

  if (type === 'adjustment' && !reason?.trim()) {
    errors.push('Motivo é obrigatório para ajustes de inventário')
  }

  if (type === 'loss' && !reason?.trim()) {
    errors.push('Motivo é obrigatório para perdas/avarias')
  }

  if (type === 'out' || type === 'loss' || type === 'transfer_out') {
    const newBalance = currentBalance - quantity
    if (!allowNegative && newBalance < 0) {
      errors.push(`Saldo insuficiente. Disponível: ${currentBalance}, solicitado: ${quantity}`)
    }
    if (newBalance <= 0) {
      warnings.push('Produto ficará sem estoque')
    } else if (newBalance <= minStock && minStock > 0) {
      warnings.push(`Produto ficará com estoque baixo (mínimo: ${minStock})`)
    }
  }

  if (type === 'in' || type === 'return' || type === 'transfer_in') {
    const newBalance = currentBalance + quantity
    if (newBalance <= minStock && minStock > 0) {
      warnings.push(`Produto ainda estará com estoque baixo após entrada (mínimo: ${minStock})`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateTransfer(
  fromBalance: number,
  quantity: number,
  allowNegative: boolean
): MovementValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (quantity <= 0) {
    errors.push('Quantidade deve ser maior que zero')
  }

  const newBalance = fromBalance - quantity
  if (!allowNegative && newBalance < 0) {
    errors.push(`Saldo insuficiente no depósito de origem. Disponível: ${fromBalance}, solicitado: ${quantity}`)
  }
  if (newBalance <= 0) {
    warnings.push('Depósito de origem ficará sem estoque deste produto')
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function generateMovementPreview(
  currentBalance: number,
  type: MovementType,
  quantity: number,
  minStock: number,
  allowNegative: boolean,
  direction?: MovementDirection | null
): MovementPreview {
  const { calculateNewBalance } = require('@/domain/stock/calculations')
  const newBalance = calculateNewBalance(currentBalance, type, quantity, direction)
  
  return {
    currentBalance,
    newBalance,
    willBeLowStock: newBalance > 0 && newBalance <= minStock,
    willBeOutOfStock: newBalance <= 0,
    willBeNegative: newBalance < 0,
    minStock,
  }
}

export function getMovementTypeLabel(type: MovementType): string {
  const labels: Record<MovementType, string> = {
    in: 'Entrada',
    out: 'Saída',
    adjustment: 'Ajuste',
    return: 'Devolução',
    loss: 'Perda/Avaria',
    transfer_out: 'Transferência (Saída)',
    transfer_in: 'Transferência (Entrada)',
  }
  return labels[type]
}

export function getMovementTypeColor(type: MovementType): 'green' | 'red' | 'blue' | 'yellow' | 'purple' {
  const colors: Record<MovementType, 'green' | 'red' | 'blue' | 'yellow' | 'purple'> = {
    in: 'green',
    out: 'red',
    return: 'green',
    loss: 'red',
    adjustment: 'yellow',
    transfer_out: 'purple',
    transfer_in: 'blue',
  }
  return colors[type]
}