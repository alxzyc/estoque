import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type StockLocation = Database['public']['Tables']['stock_locations']['Row']
type StockLocationInsert = Database['public']['Tables']['stock_locations']['Insert']
type StockLocationUpdate = Database['public']['Tables']['stock_locations']['Update']

export const stockLocationRepository = {
  async create(data: StockLocationInsert): Promise<StockLocation> {
    const { data: location, error } = await supabase
      .from('stock_locations')
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Código de depósito já existe')
      }
      throw new Error(`Erro ao criar depósito: ${error.message}`)
    }
    return location
  },

  async getById(id: string): Promise<StockLocation | null> {
    const { data, error } = await supabase
      .from('stock_locations')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar depósito: ${error.message}`)
    }
    return data
  },

  async getByOrganization(organizationId: string, activeOnly = false): Promise<StockLocation[]> {
    let query = supabase
      .from('stock_locations')
      .select()
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('name')

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar depósitos: ${error.message}`)
    return data
  },

  async getDefault(organizationId: string): Promise<StockLocation | null> {
    const { data, error } = await supabase
      .from('stock_locations')
      .select()
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar depósito padrão: ${error.message}`)
    }
    return data
  },

  async update(id: string, data: StockLocationUpdate): Promise<StockLocation> {
    if (data.is_default === true) {
      await supabase
        .from('stock_locations')
        .update({ is_default: false })
        .eq('organization_id', (await this.getById(id))?.organization_id || '')
        .neq('id', id)
    }

    const { data: location, error } = await supabase
      .from('stock_locations')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Código de depósito já existe')
      }
      throw new Error(`Erro ao atualizar depósito: ${error.message}`)
    }
    return location
  },

  async deactivate(id: string): Promise<StockLocation> {
    const location = await this.getById(id)
    if (!location) throw new Error('Depósito não encontrado')

    const { count, error: stockError } = await supabase
      .from('product_stock')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', id)
      .gt('quantity', 0)

    if (stockError) throw new Error(`Erro ao verificar estoque: ${stockError.message}`)
    if ((count || 0) > 0) {
      throw new Error('Não é possível desativar depósito com estoque positivo. Transfira ou zere o estoque primeiro.')
    }

    return this.update(id, { active: false })
  },

  async activate(id: string): Promise<StockLocation> {
    return this.update(id, { active: true })
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('stock_locations')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir depósito com dados vinculados.')
      }
      throw new Error(`Erro ao excluir depósito: ${error.message}`)
    }
  },
}