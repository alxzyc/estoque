import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export interface ReportFilters {
  start_date: string
  end_date: string
  location_id?: string
  category_id?: string
}

export interface StockPositionItem {
  product_id: string
  product_name: string
  product_sku: string
  category_name: string | null
  location_name: string
  quantity: number
  cost_price: number
  sale_price: number
  total_cost: number
  total_value: number
  min_stock: number
  status: 'normal' | 'low' | 'out'
}

export interface MovementHistoryItem {
  id: string
  date: string
  product_name: string
  product_sku: string
  type: string
  quantity: number
  balance_before: number
  balance_after: number
  location_name: string
  reason: string | null
  notes: string | null
  created_by_name: string
  unit_cost: number | null
  document_ref: string | null
}

export interface TopMovingProduct {
  product_id: string
  product_name: string
  product_sku: string
  total_in: number
  total_out: number
  total_movements: number
  net_movement: number
}

export interface InventoryValueSummary {
  total_cost: number
  total_sale_value: number
  total_quantity: number
  by_category: Array<{
    category_name: string
    total_cost: number
    total_quantity: number
    product_count: number
  }>
  by_location: Array<{
    location_name: string
    total_cost: number
    total_quantity: number
  }>
}

export interface ProductWithoutMovement {
  product_id: string
  product_name: string
  product_sku: string
  category_name: string | null
  total_stock: number
  last_movement_date: string | null
  days_without_movement: number
}

export interface LossAdjustmentHistoryItem {
  id: string
  date: string
  product_name: string
  product_sku: string
  type: 'loss' | 'adjustment'
  quantity: number
  reason: string | null
  notes: string | null
  location_name: string
  created_by_name: string
}

export const reportsQueries = {
  async getStockPosition(filters: ReportFilters): Promise<StockPositionItem[]> {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        cost_price,
        sale_price,
        min_stock,
        category:categories(name),
        stock:product_stock!inner(
          quantity,
          location:stock_locations(name)
        )
      `)
      .is('archived_at', null)

    if (filters.location_id) {
      query = query.eq('stock.location_id', filters.location_id)
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar posição de estoque: ${error.message}`)

    return (data || []).map(p => {
      const stocks = p.stock as any[]
      const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0)
      const locationName = stocks[0]?.location?.name || 'N/A'
      const categoryName = p.category?.name || null
      
      let status: 'normal' | 'low' | 'out' = 'normal'
      if (totalQuantity <= 0) status = 'out'
      else if (totalQuantity <= (p.min_stock || 0)) status = 'low'

      return {
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        category_name: categoryName,
        location_name: locationName,
        quantity: totalQuantity,
        cost_price: p.cost_price,
        sale_price: p.sale_price,
        total_cost: totalQuantity * p.cost_price,
        total_value: totalQuantity * p.sale_price,
        min_stock: p.min_stock,
        status,
      }
    })
  },

  async getMovementHistory(filters: ReportFilters, page = 1, pageSize = 100): Promise<{
    movements: MovementHistoryItem[]
    total: number
  }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('stock_movements')
      .select(`
        id,
        created_at,
        type,
        quantity,
        balance_before,
        balance_after,
        reason,
        notes,
        unit_cost,
        document_ref,
        product:products(name, sku),
        location:stock_locations(name),
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name)
      `, { count: 'exact' })
      .gte('created_at', filters.start_date)
      .lte('created_at', filters.end_date)
      .order('created_at', { ascending: false })

    if (filters.location_id) {
      query = query.eq('location_id', filters.location_id)
    }

    if (filters.category_id) {
      query = query.eq('product.category_id', filters.category_id)
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw new Error(`Erro ao buscar histórico de movimentações: ${error.message}`)

    return {
      movements: (data || []).map(m => ({
        id: m.id,
        date: m.created_at,
        product_name: m.product?.name || '',
        product_sku: m.product?.sku || '',
        type: m.type,
        quantity: m.quantity,
        balance_before: m.balance_before,
        balance_after: m.balance_after,
        location_name: m.location?.name || '',
        reason: m.reason,
        notes: m.notes,
        created_by_name: m.created_by_profile?.full_name || '',
        unit_cost: m.unit_cost,
        document_ref: m.document_ref,
      })),
      total: count || 0,
    }
  },

  async getTopMovingProducts(filters: ReportFilters, limit = 20): Promise<TopMovingProduct[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        product_id,
        type,
        quantity,
        products!inner(id, name, sku, category_id)
      `)
      .gte('created_at', filters.start_date)
      .lte('created_at', filters.end_date)
      .in('type', ['in', 'out'])

    if (filters.location_id) {
      query = query.eq('location_id', filters.location_id)
    }

    if (filters.category_id) {
      query = query.eq('products.category_id', filters.category_id)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar produtos mais movimentados: ${error.message}`)

    const aggregated = new Map<string, TopMovingProduct>()
    
    for (const m of data || []) {
      const key = m.product_id
      const existing = aggregated.get(key) || {
        product_id: m.product_id,
        product_name: m.products.name,
        product_sku: m.products.sku,
        total_in: 0,
        total_out: 0,
        total_movements: 0,
        net_movement: 0,
      }

      if (m.type === 'in') {
        existing.total_in += m.quantity
        existing.net_movement += m.quantity
      } else {
        existing.total_out += m.quantity
        existing.net_movement -= m.quantity
      }
      existing.total_movements += 1

      aggregated.set(key, existing)
    }

    return Array.from(aggregated.values())
      .sort((a, b) => b.total_movements - a.total_movements)
      .slice(0, limit)
  },

  async getInventoryValueSummary(filters: ReportFilters): Promise<InventoryValueSummary> {
    let query = supabase
      .from('products')
      .select(`
        cost_price,
        sale_price,
        category:categories(name),
        stock:product_stock!inner(
          quantity,
          location:stock_locations(name)
        )
      `)
      .is('archived_at', null)

    if (filters.location_id) {
      query = query.eq('stock.location_id', filters.location_id)
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar valor do inventário: ${error.message}`)

    let totalCost = 0
    let totalSaleValue = 0
    let totalQuantity = 0
    const byCategory = new Map<string, { totalCost: number; totalQuantity: number; productCount: Set<string> }>()
    const byLocation = new Map<string, { totalCost: number; totalQuantity: number }>()

    for (const p of data || []) {
      const stocks = p.stock as any[]
      
      for (const s of stocks) {
        const qty = s.quantity
        const cost = qty * p.cost_price
        const sale = qty * p.sale_price
        
        totalCost += cost
        totalSaleValue += sale
        totalQuantity += qty

        const catName = p.category?.name || 'Sem categoria'
        const cat = byCategory.get(catName) || { totalCost: 0, totalQuantity: 0, productCount: new Set() }
        cat.totalCost += cost
        cat.totalQuantity += qty
        cat.productCount.add(p.id)
        byCategory.set(catName, cat)

        const locName = s.location?.name || 'Sem depósito'
        const loc = byLocation.get(locName) || { totalCost: 0, totalQuantity: 0 }
        loc.totalCost += cost
        loc.totalQuantity += qty
        byLocation.set(locName, loc)
      }
    }

    return {
      total_cost: totalCost,
      total_sale_value: totalSaleValue,
      total_quantity: totalQuantity,
      by_category: Array.from(byCategory.entries()).map(([name, v]) => ({
        category_name: name,
        total_cost: v.totalCost,
        total_quantity: v.totalQuantity,
        product_count: v.productCount.size,
      })),
      by_location: Array.from(byLocation.entries()).map(([name, v]) => ({
        location_name: name,
        total_cost: v.totalCost,
        total_quantity: v.totalQuantity,
      })),
    }
  },

  async getProductsWithoutMovement(filters: ReportFilters, days = 90): Promise<ProductWithoutMovement[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        category:categories(name),
        stock:product_stock!inner(quantity)
      `)
      .is('archived_at', null)
      .eq('organization_id', filters.category_id ? '' : (await supabase.auth.getUser()).data.user?.id || '')

    if (prodError) throw new Error(`Erro ao buscar produtos: ${prodError.message}`)

    const productIds = (products || []).map(p => p.id)
    if (productIds.length === 0) return []

    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('product_id, created_at')
      .in('product_id', productIds)
      .gte('created_at', cutoffDate.toISOString())

    if (movError) throw new Error(`Erro ao buscar movimentações: ${movError.message}`)

    const productsWithMovement = new Set((movements || []).map(m => m.product_id))

    return (products || [])
      .filter(p => !productsWithMovement.has(p.id))
      .map(p => {
        const stocks = p.stock as any[]
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)
        
        let lastMovementDate: string | null = null
        const productMovements = (movements || []).filter(m => m.product_id === p.id)
        if (productMovements.length > 0) {
          lastMovementDate = productMovements.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].created_at
        }

        const daysWithout = lastMovementDate
          ? Math.floor((new Date().getTime() - new Date(lastMovementDate).getTime()) / (1000 * 60 * 60 * 24))
          : days

        return {
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          category_name: p.category?.name || null,
          total_stock: totalStock,
          last_movement_date: lastMovementDate,
          days_without_movement: daysWithout,
        }
      })
      .sort((a, b) => b.days_without_movement - a.days_without_movement)
  },

  async getLossAdjustmentHistory(filters: ReportFilters, page = 1, pageSize = 100): Promise<{
    items: LossAdjustmentHistoryItem[]
    total: number
  }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('stock_movements')
      .select(`
        id,
        created_at,
        type,
        quantity,
        reason,
        notes,
        product:products(name, sku),
        location:stock_locations(name),
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name)
      `, { count: 'exact' })
      .in('type', ['loss', 'adjustment'])
      .gte('created_at', filters.start_date)
      .lte('created_at', filters.end_date)
      .order('created_at', { ascending: false })

    if (filters.location_id) {
      query = query.eq('location_id', filters.location_id)
    }

    if (filters.category_id) {
      query = query.eq('product.category_id', filters.category_id)
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw new Error(`Erro ao buscar histórico de perdas/ajustes: ${error.message}`)

    return {
      items: (data || []).map(m => ({
        id: m.id,
        date: m.created_at,
        product_name: m.product?.name || '',
        product_sku: m.product?.sku || '',
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        notes: m.notes,
        location_name: m.location?.name || '',
        created_by_name: m.created_by_profile?.full_name || '',
      })),
      total: count || 0,
    }
  },
}