import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export interface DashboardMetrics {
  active_products: number
  total_units: number
  low_stock_count: number
  out_of_stock_count: number
  inventory_value: number
}

export interface RecentMovement {
  id: string
  product_name: string
  product_sku: string
  type: string
  quantity: number
  location_name: string
  created_by_name: string
  created_at: string
}

export interface TopSellingProduct {
  product_id: string
  product_name: string
  product_sku: string
  total_quantity: number
}

export interface MovementChartData {
  date: string
  entries: number
  exits: number
}

export interface StockEvolutionData {
  date: string
  balance: number
}

export const dashboardQueries = {
  async getMetrics(locationId?: string): Promise<DashboardMetrics> {
    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar métricas: ${error.message}`)
    return data[0] as DashboardMetrics
  },

  async getRecentMovements(limit = 10, locationId?: string): Promise<RecentMovement[]> {
    const { data, error } = await supabase.rpc('get_recent_movements', {
      p_limit: limit,
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar movimentações recentes: ${error.message}`)
    return data as RecentMovement[]
  },

  async getTopSellingProducts(days = 30, limit = 10, locationId?: string): Promise<TopSellingProduct[]> {
    const { data, error } = await supabase.rpc('get_top_selling_products', {
      p_days: days,
      p_limit: limit,
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar produtos mais vendidos: ${error.message}`)
    return data as TopSellingProduct[]
  },

  async getMovementChartData(days = 30, locationId?: string): Promise<MovementChartData[]> {
    const { data, error } = await supabase.rpc('get_movement_chart_data', {
      p_days: days,
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar dados do gráfico: ${error.message}`)
    return data as MovementChartData[]
  },

  async getStockEvolution(days = 30, productId?: string, locationId?: string): Promise<StockEvolutionData[]> {
    const { data, error } = await supabase.rpc('get_stock_evolution', {
      p_days: days,
      p_product_id: productId || null,
      p_location_id: locationId || null,
    })

    if (error) throw new Error(`Erro ao buscar evolução do estoque: ${error.message}`)
    return data as StockEvolutionData[]
  },

  async getLowStockProducts(organizationId: string, locationId?: string): Promise<Array<{
    id: string
    name: string
    sku: string
    min_stock: number
    total_stock: number
    location_name: string
  }>> {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        min_stock,
        stock:product_stock!inner(location_id, quantity, stock_locations!inner(name))
      `)
      .eq('organization_id', organizationId)
      .is('archived_at', null)

    if (locationId) {
      query = query.eq('stock.location_id', locationId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar produtos com estoque baixo: ${error.message}`)

    return (data || [])
      .map(p => {
        const stocks = p.stock as any[]
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)
        const locationName = stocks[0]?.stock_locations?.name || ''
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          min_stock: p.min_stock,
          total_stock: totalStock,
          location_name: locationName,
        }
      })
      .filter(p => p.total_stock > 0 && p.total_stock <= p.min_stock)
      .sort((a, b) => a.total_stock / a.min_stock - b.total_stock / b.min_stock)
  },

  async getOutOfStockProducts(organizationId: string, locationId?: string): Promise<Array<{
    id: string
    name: string
    sku: string
    location_name: string
  }>> {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock:product_stock!inner(location_id, quantity, stock_locations!inner(name))
      `)
      .eq('organization_id', organizationId)
      .is('archived_at', null)

    if (locationId) {
      query = query.eq('stock.location_id', locationId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar produtos sem estoque: ${error.message}`)

    return (data || [])
      .map(p => {
        const stocks = p.stock as any[]
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)
        const locationName = stocks[0]?.stock_locations?.name || ''
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          location_name: locationName,
        }
      })
      .filter(p => p.total_stock <= 0)
  },

  async getExpiringProducts(organizationId: string, days = 30, locationId?: string): Promise<Array<{
    product_id: string
    product_name: string
    product_sku: string
    lot_code: string
    quantity: number
    expires_on: string
    location_name: string
    days_until_expiry: number
  }>> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + days)

    let query = supabase
      .from('stock_batches')
      .select(`
        product_id,
        lot_code,
        quantity,
        expires_on,
        location_id,
        products!inner(name, sku, organization_id),
        stock_locations!inner(name)
      `)
      .eq('products.organization_id', organizationId)
      .gte('expires_on', today.toISOString().split('T')[0])
      .lte('expires_on', futureDate.toISOString().split('T')[0])
      .gt('quantity', 0)
      .order('expires_on', { ascending: true })

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar produtos vencendo: ${error.message}`)

    return (data || []).map(item => {
      const expiresOn = new Date(item.expires_on)
      const diffDays = Math.ceil((expiresOn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        product_id: item.product_id,
        product_name: item.products.name,
        product_sku: item.products.sku,
        lot_code: item.lot_code,
        quantity: item.quantity,
        expires_on: item.expires_on,
        location_name: item.stock_locations.name,
        days_until_expiry: diffDays,
      }
    })
  },
}