import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type StockMovement = Database['public']['Tables']['stock_movements']['Row']
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert']

export interface MovementFilters {
  product_id?: string
  location_id?: string
  type?: Database['public']['Enums']['movement_type']
  start_date?: string
  end_date?: string
  created_by?: string
}

export interface MovementListResult {
  movements: Array<StockMovement & {
    product?: Database['public']['Tables']['products']['Row'] | null
    location?: Database['public']['Tables']['stock_locations']['Row'] | null
    created_by_profile?: Database['public']['Tables']['profiles']['Row'] | null
    supplier?: Database['public']['Tables']['suppliers']['Row'] | null
  }>
  total: number
  page: number
  pageSize: number
}

export const movementRepository = {
  async applyMovement(params: {
    product_id: string
    location_id: string
    type: Database['public']['Enums']['movement_type']
    quantity: number
    reason: string | null
    notes: string | null
    supplier_id: string | null
    unit_cost: number | null
    document_ref: string | null
    transfer_group_id: string | null
    direction: Database['public']['Enums']['movement_direction'] | null
    idempotency_key: string
    created_by: string
  }): Promise<{ movement_id: string; balance_after: number }> {
    const { data, error } = await supabase.rpc('apply_stock_movement', {
      p_product_id: params.product_id,
      p_location_id: params.location_id,
      p_type: params.type,
      p_quantity: params.quantity,
      p_reason: params.reason,
      p_notes: params.notes,
      p_supplier_id: params.supplier_id,
      p_unit_cost: params.unit_cost,
      p_document_ref: params.document_ref,
      p_transfer_group_id: params.transfer_group_id,
      p_direction: params.direction,
      p_idempotency_key: params.idempotency_key,
      p_created_by: params.created_by,
    })

    if (error) {
      if (error.message.includes('insufficient')) {
        throw new Error('Saldo insuficiente para esta operação')
      }
      if (error.message.includes('duplicate')) {
        throw new Error('Operação duplicada detectada')
      }
      throw new Error(`Erro ao registrar movimentação: ${error.message}`)
    }

    return data[0] as { movement_id: string; balance_after: number }
  },

  async applyTransfer(params: {
    product_id: string
    from_location_id: string
    to_location_id: string
    quantity: number
    reason: string | null
    notes: string | null
    idempotency_key: string
    created_by: string
  }): Promise<{ out_movement_id: string; in_movement_id: string }> {
    const { data, error } = await supabase.rpc('apply_stock_transfer', {
      p_product_id: params.product_id,
      p_from_location_id: params.from_location_id,
      p_to_location_id: params.to_location_id,
      p_quantity: params.quantity,
      p_reason: params.reason,
      p_notes: params.notes,
      p_idempotency_key: params.idempotency_key,
      p_created_by: params.created_by,
    })

    if (error) {
      if (error.message.includes('insufficient')) {
        throw new Error('Saldo insuficiente no depósito de origem')
      }
      if (error.message.includes('duplicate')) {
        throw new Error('Operação duplicada detectada')
      }
      throw new Error(`Erro ao registrar transferência: ${error.message}`)
    }

    return data as { out_movement_id: string; in_movement_id: string }
  },

  async reverseMovement(
    movementId: string,
    reason: string,
    createdBy: string,
    idempotencyKey: string
  ): Promise<{ movement_id: string; balance_after: number }> {
    const { data: original, error: getError } = await supabase
      .from('stock_movements')
      .select()
      .eq('id', movementId)
      .single()

    if (getError) throw new Error(`Movimentação original não encontrada: ${getError.message}`)

    const reverseTypeMap: Record<string, string> = {
      in: 'out',
      out: 'in',
      return: 'loss',
      loss: 'in',
      adjustment: 'adjustment',
      transfer_out: 'transfer_in',
      transfer_in: 'transfer_out',
    }

    const reverseType = reverseTypeMap[original.type] || 'adjustment'
    const reverseDirection = original.type === 'adjustment' 
      ? (original.direction === 'increase' ? 'decrease' : 'increase')
      : null

    return this.applyMovement({
      product_id: original.product_id,
      location_id: original.location_id,
      type: reverseType as any,
      quantity: original.quantity,
      reason: `Estorno: ${reason}`,
      notes: `Estorno da movimentação ${movementId}. ${original.notes || ''}`,
      supplier_id: null,
      unit_cost: original.unit_cost,
      document_ref: `REVERSE-${original.document_ref || movementId}`,
      transfer_group_id: original.transfer_group_id,
      direction: reverseDirection,
      idempotency_key: idempotencyKey,
      created_by: createdBy,
    })
  },

  async getById(id: string): Promise<StockMovement | null> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name, sku),
        location:stock_locations(name, code),
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name),
        supplier:suppliers!stock_movements_supplier_id_fkey(company_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar movimentação: ${error.message}`)
    }
    return data
  },

  async list(
    organizationId: string,
    filters: MovementFilters = {},
    page = 1,
    pageSize = 50
  ): Promise<MovementListResult> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name, sku),
        location:stock_locations(name, code),
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name),
        supplier:suppliers!stock_movements_supplier_id_fkey(company_name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id)
    }

    if (filters.location_id) {
      query = query.eq('location_id', filters.location_id)
    }

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw new Error(`Erro ao listar movimentações: ${error.message}`)

    return {
      movements: data || [],
      total: count || 0,
      page,
      pageSize,
    }
  },

  async getProductStock(productId: string, locationId?: string): Promise<Array<{
    product_id: string
    location_id: string
    location_name: string
    quantity: number
  }>> {
    const { data, error } = await supabase.rpc('get_product_stock', {
      p_product_id: productId,
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar estoque: ${error.message}`)
    return data || []
  },
}