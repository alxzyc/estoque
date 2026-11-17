import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Supplier = Database['public']['Tables']['suppliers']['Row']
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

export const supplierRepository = {
  async create(data: SupplierInsert): Promise<Supplier> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Fornecedor com este CNPJ já existe')
      }
      throw new Error(`Erro ao criar fornecedor: ${error.message}`)
    }
    return supplier
  },

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`)
    }
    return data
  },

  async getByOrganization(organizationId: string, activeOnly = false): Promise<Supplier[]> {
    let query = supabase
      .from('suppliers')
      .select()
      .eq('organization_id', organizationId)
      .order('company_name')

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar fornecedores: ${error.message}`)
    return data
  },

  async getWithProductCount(organizationId: string): Promise<Array<Supplier & { product_count: number }>> {
    const { data, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        product_suppliers:product_suppliers(count)
      `)
      .eq('organization_id', organizationId)
      .order('company_name')

    if (error) throw new Error(`Erro ao buscar fornecedores: ${error.message}`)
    
    return (data || []).map(sup => ({
      ...sup,
      product_count: sup.product_suppliers?.[0]?.count || 0,
    }))
  },

  async update(id: string, data: SupplierUpdate): Promise<Supplier> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Fornecedor com este CNPJ já existe')
      }
      throw new Error(`Erro ao atualizar fornecedor: ${error.message}`)
    }
    return supplier
  },

  async deactivate(id: string): Promise<Supplier> {
    return this.update(id, { active: false })
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir fornecedor com entradas vinculadas. Desative o fornecedor em vez de excluir.')
      }
      throw new Error(`Erro ao excluir fornecedor: ${error.message}`)
    }
  },
}