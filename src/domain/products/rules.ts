import { skuSchema, ean13Schema, cnpjSchema } from '@/lib/validations/schemas'

export interface ProductValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: string[]
}

export function validateProduct(data: {
  name: string
  sku: string
  barcode?: string | null
  costPrice: number
  salePrice: number
  minStock: number
  categoryId?: string | null
  primarySupplierId?: string | null
  existingSkus?: string[]
  existingBarcodes?: string[]
}): ProductValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  if (!data.name?.trim()) {
    errors.name = 'Nome é obrigatório'
  } else if (data.name.length > 200) {
    errors.name = 'Nome deve ter no máximo 200 caracteres'
  }

  const skuResult = skuSchema.safeParse(data.sku)
  if (!skuResult.success) {
    errors.sku = skuResult.error.errors[0]?.message || 'SKU inválido'
  } else if (data.existingSkus?.includes(data.sku)) {
    errors.sku = 'SKU já cadastrado'
  }

  if (data.barcode?.trim()) {
    const barcodeResult = ean13Schema.safeParse(data.barcode)
    if (!barcodeResult.success) {
      errors.barcode = barcodeResult.error.errors[0]?.message || 'Código de barras inválido'
    } else if (data.existingBarcodes?.includes(data.barcode.replace(/\D/g, ''))) {
      errors.barcode = 'Código de barras já cadastrado'
    }
  }

  if (data.costPrice < 0) {
    errors.costPrice = 'Preço de custo não pode ser negativo'
  }

  if (data.salePrice < 0) {
    errors.salePrice = 'Preço de venda não pode ser negativo'
  }

  if (data.salePrice < data.costPrice) {
    warnings.push('Preço de venda é menor que o preço de custo')
  }

  if (data.minStock < 0) {
    errors.minStock = 'Estoque mínimo não pode ser negativo'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

export function validateSupplier(data: {
  companyName: string
  cnpj?: string | null
  email?: string | null
  existingCnpjs?: string[]
}): ProductValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  if (!data.companyName?.trim()) {
    errors.companyName = 'Razão social é obrigatória'
  } else if (data.companyName.length > 200) {
    errors.companyName = 'Razão social deve ter no máximo 200 caracteres'
  }

  if (data.cnpj?.trim()) {
    const cnpjResult = cnpjSchema.safeParse(data.cnpj)
    if (!cnpjResult.success) {
      errors.cnpj = cnpjResult.error.errors[0]?.message || 'CNPJ inválido'
    } else if (data.existingCnpjs?.includes(data.cnpj.replace(/\D/g, ''))) {
      errors.cnpj = 'CNPJ já cadastrado'
    }
  }

  if (data.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      errors.email = 'E-mail inválido'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

export function validateCategory(data: {
  name: string
  existingNames?: string[]
}): ProductValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  if (!data.name?.trim()) {
    errors.name = 'Nome é obrigatório'
  } else if (data.name.length > 100) {
    errors.name = 'Nome deve ter no máximo 100 caracteres'
  } else if (data.existingNames?.some(n => n.toLowerCase() === data.name.toLowerCase())) {
    errors.name = 'Categoria com este nome já existe'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

export function canDeleteProduct(hasMovements: boolean): boolean {
  return !hasMovements
}

export function canArchiveProduct(): boolean {
  return true
}

export function getProductStatus(archivedAt: string | null): 'active' | 'archived' {
  return archivedAt ? 'archived' : 'active'
}

export const PRODUCT_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
] as const

export const MOVEMENT_TYPES = [
  { value: 'in', label: 'Entrada' },
  { value: 'out', label: 'Saída' },
  { value: 'adjustment', label: 'Ajuste' },
  { value: 'return', label: 'Devolução' },
  { value: 'loss', label: 'Perda/Avaria' },
  { value: 'transfer_out', label: 'Transferência (Saída)' },
  { value: 'transfer_in', label: 'Transferência (Entrada)' },
] as const

export const USER_ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'operator', label: 'Operador' },
] as const