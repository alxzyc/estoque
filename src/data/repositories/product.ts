import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductFilters {
  search?: string
  category_id?: string | null
  supplier_id?: string | null
  location_id?: string | null
  availability?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  price_min?: number
  price_max?: number
  archived?: boolean
}

export interface ProductListResult {
  products: Array<Product & {
    category?: Database['public']['Tables']['categories']['Row'] | null
    primary_supplier?: Database['public']['Tables']['suppliers']['Row'] | null
    total_stock: number
    stock_by_location: Array<{
      location_id: string
      location_name: string
      quantity: number
    }>
  }>
  total: number
  page: number
  pageSize: number
}

export const productRepository = {
  async create(data: ProductInsert): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('sku')) {
          throw new Error('SKU já cadastrado')
        }
        if (error.message.includes('barcode')) {
          throw new Error('Código de barras já cadastrado')
        }
        throw new Error('Registro duplicado')
      }
      throw new Error(`Erro ao criar produto: ${error.message}`)
    }
    return product
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        primary_supplier:suppliers!products_primary_supplier_id_fkey(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar produto: ${error.message}`)
    }
    return data
  },

  async getBySku(sku: string, organizationId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select()
      .eq('sku', sku)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar produto por SKU: ${error.message}`)
    }
    return data
  },

  async getByBarcode(barcode: string, organizationId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select()
      .eq('barcode', barcode)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar produto por código de barras: ${error.message}`)
    }
    return data
  },

  async list(
    organizationId: string,
    filters: ProductFilters = {},
    page = 1,
    pageSize = 25
  ): Promise<ProductListResult> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name),
        primary_supplier:suppliers!products_primary_supplier_id_fkey(id, company_name),
        stock:product_stock(location_id, quantity, stock_locations!inner(name))
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    if (filters.archived === false) {
      query = query.is('archived_at', null)
    } else if (filters.archived === true) {
      query = query.not('archived_at', 'is', null)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.eq.${filters.search}`)
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters.supplier_id) {
      query = query.eq('primary_supplier_id', filters.supplier_id)
    }

    if (filters.price_min !== undefined) {
      query = query.gte('sale_price', filters.price_min)
    }

    if (filters.price_max !== undefined) {
      query = query.lte('sale_price', filters.price_max)
    }

    query = query.order('name').range(from, to)

    const { data, error, count } = await query

    if (error) throw new Error(`Erro ao listar produtos: ${error.message}`)

    const productsWithStock = (data || []).map(product => {
      const stockByLocation = (product.stock || []).map((s: any) => ({
        location_id: s.location_id,
        location_name: s.stock_locations?.name || '',
        quantity: s.quantity,
      }))
      const totalStock = stockByLocation.reduce((sum: number, s: any) => sum + s.quantity, 0)

      return {
        ...product,
        total_stock: totalStock,
        stock_by_location: stockByLocation,
      }
    })

    let filteredProducts = productsWithStock
    if (filters.availability && filters.availability !== 'all') {
      filteredProducts = productsWithStock.filter(p => {
        switch (filters.availability) {
          case 'in_stock':
            return p.total_stock > (p.min_stock || 0)
          case 'low_stock':
            return p.total_stock > 0 && p.total_stock <= (p.min_stock || 0)
          case 'out_of_stock':
            return p.total_stock <= 0
          default:
            return true
        }
      })
    }

    if (filters.location_id) {
      filteredProducts = filteredProducts.map(p => ({
        ...p,
        total_stock: p.stock_by_location.find(s => s.location_id === filters.location_id)?.quantity || 0,
      })).filter(p => p.total_stock > 0 || filters.availability === 'out_of_stock')
    }

    return {
      products: filteredProducts,
      total: count || 0,
      page,
      pageSize,
    }
  },

  async update(id: string, data: ProductUpdate, expectedVersion: number): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({ ...data, version: expectedVersion + 1 })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Produto foi modificado por outro usuário. Recarregue a página e tente novamente.')
      }
      if (error.code === '23505') {
        if (error.message.includes('sku')) {
          throw new Error('SKU já cadastrado')
        }
        if (error.message.includes('barcode')) {
          throw new Error('Código de barras já cadastrado')
        }
        throw new Error('Registro duplicado')
      }
      throw new Error(`Erro ao atualizar produto: ${error.message}`)
    }
    return product
  },

  async archive(id: string): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao arquivar produto: ${error.message}`)
    return product
  },

  async restore(id: string): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({ archived_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao restaurar produto: ${error.message}`)
    return product
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir produto com movimentações. Arquive o produto em vez de excluir.')
      }
      throw new Error(`Erro ao excluir produto: ${error.message}`)
    }
  },

  async checkHasMovements(productId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    if (error) throw new Error(`Erro ao verificar movimentações: ${error.message}`)
    return (count || 0) > 0
  },

  async getStockByLocation(productId: string): Promise<Array<{
    location_id: string
    location_name: string
    quantity: number
    batches?: Array<{ lot_code: string; quantity: number; expires_on: string | null }>
  }>> {
    const { data: stock, error } = await supabase
      .from('product_stock')
      .select(`
        location_id,
        quantity,
        stock_locations!inner(name)
      `)
      .eq('product_id', productId)

    if (error) throw new Error(`Erro ao buscar estoque: ${error.message}`)

    const result = await Promise.all((stock || []).map(async s => {
      const { data: batches } = await supabase
        .from('stock_batches')
        .select('lot_code, quantity, expires_on')
        .eq('product_id', productId)
        .eq('location_id', s.location_id)
        .gt('quantity', 0)
        .order('expires_on', { ascending: true, nullsLast: true })

      return {
        location_id: s.location_id,
        location_name: s.stock_locations?.name || '',
        quantity: s.quantity,
        batches: batches || [],
      }
    }))

    return result
  },

  async getMovements(
    productId: string,
    limit = 50,
    offset = 0
  ): Promise<Array<Database['public']['Tables']['stock_movements']['Row'] & {
    created_by_profile?: Database['public']['Tables']['profiles']['Row'] | null
    supplier?: Database['public']['Tables']['suppliers']['Row'] | null
  }>> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        created_by_profile:profiles!stock_movements_created_by_fkey(full_name),
        supplier:suppliers!stock_movements_supplier_id_fkey(company_name)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`)
    return data || []
  },
}