export type AlertKind = 'low_stock' | 'out_of_stock' | 'expiring' | 'unusual_movement' | 'reorder'

export interface AlertConfig {
  expiringThresholdDays: number
  unusualQtyThresholdPct: number
  reorderDaysThreshold: number
}

export interface StockAlertData {
  productId: string
  productName: string
  productSku: string
  totalStock: number
  minStock: number
  locationId?: string
  locationName?: string
}

export interface BatchAlertData {
  productId: string
  productName: string
  productSku: string
  lotCode: string
  quantity: number
  expiresOn: string
  locationId: string
  locationName: string
}

export interface MovementAlertData {
  productId: string
  productName: string
  productSku: string
  type: string
  quantity: number
  averageQuantity: number
  thresholdPct: number
  locationId: string
  locationName: string
}

export function generateDedupeKey(kind: AlertKind, productId: string, locationId?: string): string {
  const loc = locationId ? `:${locationId}` : ''
  return `${kind}:${productId}${loc}`
}

export function checkLowStock(data: StockAlertData, config: AlertConfig): { shouldAlert: boolean; dedupeKey: string } {
  const { totalStock, minStock, productId, locationId } = data
  const shouldAlert = totalStock > 0 && totalStock <= minStock
  return { shouldAlert, dedupeKey: generateDedupeKey('low_stock', productId, locationId) }
}

export function checkOutOfStock(data: StockAlertData, config: AlertConfig): { shouldAlert: boolean; dedupeKey: string } {
  const { totalStock, productId, locationId } = data
  const shouldAlert = totalStock <= 0
  return { shouldAlert, dedupeKey: generateDedupeKey('out_of_stock', productId, locationId) }
}

export function checkExpiring(data: BatchAlertData, config: AlertConfig): { shouldAlert: boolean; dedupeKey: string } {
  const { expiresOn, productId, locationId, lotCode } = data
  if (!expiresOn) return { shouldAlert: false, dedupeKey: '' }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiresOn)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  const shouldAlert = diffDays >= 0 && diffDays <= config.expiringThresholdDays
  return { shouldAlert, dedupeKey: generateDedupeKey('expiring', productId, locationId) }
}

export function checkUnusualMovement(
  data: MovementAlertData,
  config: AlertConfig
): { shouldAlert: boolean; dedupeKey: string } {
  const { quantity, averageQuantity, productId, locationId, thresholdPct } = data
  const effectiveThreshold = thresholdPct || config.unusualQtyThresholdPct
  const shouldAlert = averageQuantity > 0 && quantity > averageQuantity * (effectiveThreshold / 100)
  return { shouldAlert, dedupeKey: generateDedupeKey('unusual_movement', productId, locationId) }
}

export function checkReorder(
  data: StockAlertData,
  config: AlertConfig,
  lowStockSince?: string
): { shouldAlert: boolean; dedupeKey: string } {
  const { totalStock, minStock, productId, locationId } = data
  if (totalStock > minStock || minStock === 0) return { shouldAlert: false, dedupeKey: '' }
  if (!lowStockSince) return { shouldAlert: false, dedupeKey: '' }
  
  const since = new Date(lowStockSince)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24))
  
  const shouldAlert = diffDays >= config.reorderDaysThreshold
  return { shouldAlert, dedupeKey: generateDedupeKey('reorder', productId, locationId) }
}

export function getAlertLabel(kind: AlertKind): string {
  const labels: Record<AlertKind, string> = {
    low_stock: 'Estoque Baixo',
    out_of_stock: 'Sem Estoque',
    expiring: 'Próximo ao Vencimento',
    unusual_movement: 'Movimentação Incomum',
    reorder: 'Ponto de Reposição',
  }
  return labels[kind]
}

export function getAlertColor(kind: AlertKind): 'yellow' | 'red' | 'orange' | 'purple' | 'blue' {
  const colors: Record<AlertKind, 'yellow' | 'red' | 'orange' | 'purple' | 'blue'> = {
    low_stock: 'yellow',
    out_of_stock: 'red',
    expiring: 'orange',
    unusual_movement: 'purple',
    reorder: 'blue',
  }
  return colors[kind]
}

export function getAlertPriority(kind: AlertKind): number {
  const priorities: Record<AlertKind, number> = {
    out_of_stock: 5,
    expiring: 4,
    low_stock: 3,
    reorder: 2,
    unusual_movement: 1,
  }
  return priorities[kind]
}