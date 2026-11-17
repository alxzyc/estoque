import { z } from 'zod'

export const cnpjSchema = z.string().transform((val) => val.replace(/\D/g, '')).pipe(
  z.string().length(14, 'CNPJ deve ter 14 dígitos').refine((val) => {
    if (/^(\d)\1+$/.test(val)) return false
    let sum = 0
    let weight = 2
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(val[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (parseInt(val[12]) !== digit) return false
    sum = 0
    weight = 2
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(val[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return parseInt(val[13]) === digit
  }, 'CNPJ inválido')
)

export const ean13Schema = z.string().transform((val) => val.replace(/\D/g, '')).pipe(
  z.string().length(13, 'Código de barras deve ter 13 dígitos').refine((val) => {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(val[i]) * (i % 2 === 0 ? 1 : 3)
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return parseInt(val[12]) === checkDigit
  }, 'Dígito verificador inválido')
)

export const skuSchema = z.string().min(1, 'SKU é obrigatório').max(50, 'SKU deve ter no máximo 50 caracteres').regex(/^[A-Za-z0-9\-_]+$/, 'SKU pode conter apenas letras, números, hífen e underscore')

export const organizationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  cnpj: cnpjSchema.optional().or(z.literal('')),
})

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100).optional().nullable(),
  role: z.enum(['admin', 'manager', 'operator']),
  active: z.boolean().default(true),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional().nullable(),
})

export const supplierSchema = z.object({
  company_name: z.string().min(2, 'Razão social é obrigatória').max(200),
  cnpj: cnpjSchema.optional().or(z.literal('')),
  contact_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')).nullable(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
  }).optional().nullable(),
  active: z.boolean().default(true),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  sku: skuSchema,
  barcode: ean13Schema.optional().or(z.literal('')).nullable(),
  description: z.string().max(1000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  primary_supplier_id: z.string().uuid().optional().nullable(),
  cost_price: z.number().min(0, 'Preço de custo não pode ser negativo').max(99999999.99),
  sale_price: z.number().min(0, 'Preço de venda não pode ser negativo').max(99999999.99),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'm', 'cx', 'pct']),
  min_stock: z.number().int().min(0, 'Estoque mínimo não pode ser negativo').default(0),
  image_path: z.string().optional().nullable(),
  expires_tracking: z.boolean().default(false),
})

export const stockLocationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  code: z.string().min(1, 'Código é obrigatório').max(20).regex(/^[A-Z0-9_-]+$/, 'Código deve conter apenas letras maiúsculas, números, hífen e underscore'),
  active: z.boolean().default(true),
  is_default: z.boolean().default(false),
})

export const movementSchema = z.object({
  product_id: z.string().uuid('Produto é obrigatório'),
  location_id: z.string().uuid('Depósito é obrigatório'),
  type: z.enum(['in', 'out', 'adjustment', 'return', 'loss', 'transfer_out', 'transfer_in']),
  direction: z.enum(['increase', 'decrease']).nullable().optional(),
  quantity: z.number().positive('Quantidade deve ser positiva').max(999999.999),
  reason: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  unit_cost: z.number().min(0).max(99999999.99).optional().nullable(),
  document_ref: z.string().max(100).optional().nullable(),
  transfer_group_id: z.string().uuid().optional().nullable(),
  reverses_movement_id: z.string().uuid().optional().nullable(),
  idempotency_key: z.string().uuid(),
})

export const adjustmentSchema = movementSchema.extend({
  type: z.literal('adjustment'),
  direction: z.enum(['increase', 'decrease']),
  reason: z.string().min(1, 'Motivo é obrigatório para ajustes'),
})

export const transferSchema = z.object({
  product_id: z.string().uuid('Produto é obrigatório'),
  from_location_id: z.string().uuid('Depósito de origem é obrigatório'),
  to_location_id: z.string().uuid('Depósito de destino é obrigatório'),
  quantity: z.number().positive('Quantidade deve ser positiva').max(999999.999),
  reason: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  idempotency_key: z.string().uuid(),
})

export const lossSchema = movementSchema.extend({
  type: z.literal('loss'),
  reason: z.string().min(1, 'Motivo da perda/avaria é obrigatório'),
})

export const settingsSchema = z.object({
  allow_negative_stock: z.boolean().default(false),
  expiring_threshold_days: z.number().int().min(1).max(365).default(30),
  unusual_qty_threshold_pct: z.number().int().min(1).max(1000).default(200),
  currency: z.string().length(3).default('BRL'),
  timezone: z.string().default('America/Sao_Paulo'),
})

export const inviteUserSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['manager', 'operator']),
})

export const csvImportSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  supplier: z.string().optional(),
  cost_price: z.string().transform((val) => parseFloat(val.replace(',', '.'))).pipe(z.number().min(0)),
  sale_price: z.string().transform((val) => parseFloat(val.replace(',', '.'))).pipe(z.number().min(0)),
  unit: z.enum(['un', 'kg', 'g', 'l', 'ml', 'm', 'cx', 'pct']),
  min_stock: z.string().transform((val) => parseInt(val)).pipe(z.number().int().min(0)).optional(),
  expires_tracking: z.string().transform((val) => val.toLowerCase() === 'true' || val === '1').optional(),
})

export type OrganizationForm = z.infer<typeof organizationSchema>
export type ProfileForm = z.infer<typeof profileSchema>
export type CategoryForm = z.infer<typeof categorySchema>
export type SupplierForm = z.infer<typeof supplierSchema>
export type ProductForm = z.infer<typeof productSchema>
export type StockLocationForm = z.infer<typeof stockLocationSchema>
export type MovementForm = z.infer<typeof movementSchema>
export type AdjustmentForm = z.infer<typeof adjustmentSchema>
export type TransferForm = z.infer<typeof transferSchema>
export type LossForm = z.infer<typeof lossSchema>
export type SettingsForm = z.infer<typeof settingsSchema>
export type InviteUserForm = z.infer<typeof inviteUserSchema>
export type CSVImportRow = z.infer<typeof csvImportSchema>