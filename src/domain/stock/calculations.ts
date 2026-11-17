export type MovementType = 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
export type MovementDirection = 'increase' | 'decrease'

export interface StockBalance {
  productId: string
  locationId: string
  quantity: number
}

export interface MovementEffect {
  type: MovementType
  direction: MovementDirection | null
  quantity: number
}

export const MOVEMENT_EFFECTS: Record<MovementType, { direction: MovementDirection | null; multiplier: number }> = {
  in: { direction: 'increase', multiplier: 1 },
  out: { direction: 'decrease', multiplier: -1 },
  return: { direction: 'increase', multiplier: 1 },
  loss: { direction: 'decrease', multiplier: -1 },
  adjustment: { direction: null, multiplier: 0 },
  transfer_out: { direction: 'decrease', multiplier: -1 },
  transfer_in: { direction: 'increase', multiplier: 1 },
}

export function getMovementEffect(type: MovementType, direction?: MovementDirection | null): number {
  const effect = MOVEMENT_EFFECTS[type]
  if (type === 'adjustment') {
    return direction === 'increase' ? 1 : -1
  }
  return effect.multiplier
}

export function calculateNewBalance(
  currentBalance: number,
  type: MovementType,
  quantity: number,
  direction?: MovementDirection | null
): number {
  const multiplier = getMovementEffect(type, direction)
  return currentBalance + quantity * multiplier
}

export function validateMovementBalance(
  currentBalance: number,
  type: MovementType,
  quantity: number,
  direction?: MovementDirection | null,
  allowNegative = false
): { valid: boolean; newBalance: number; error?: string } {
  const newBalance = calculateNewBalance(currentBalance, type, quantity, direction)
  
  if (!allowNegative && newBalance < 0) {
    return {
      valid: false,
      newBalance,
      error: `Saldo insuficiente. Saldo atual: ${currentBalance}, solicitado: ${quantity}`,
    }
  }
  
  return { valid: true, newBalance }
}

export function calculateInventoryValue(
  stocks: Array<{ quantity: number; costPrice: number }>
): number {
  return stocks.reduce((sum, item) => sum + item.quantity * item.costPrice, 0)
}

export function calculateWeightedAverageCost(
  currentStock: number,
  currentCost: number,
  incomingQuantity: number,
  incomingCost: number
): number {
  if (currentStock + incomingQuantity === 0) return incomingCost
  return (currentStock * currentCost + incomingQuantity * incomingCost) / (currentStock + incomingQuantity)
}

export function isLowStock(totalStock: number, minStock: number): boolean {
  return totalStock > 0 && totalStock <= minStock
}

export function isOutOfStock(totalStock: number): boolean {
  return totalStock <= 0
}

export function getStockStatus(totalStock: number, minStock: number): 'normal' | 'low' | 'out' {
  if (totalStock <= 0) return 'out'
  if (totalStock <= minStock) return 'low'
  return 'normal'
}