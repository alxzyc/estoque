import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export const categoryRepository = {
  async create(data: CategoryInsert): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Categoria com este nome já existe')
      }
      throw new Error(`Erro ao criar categoria: ${error.message}`)
    }
    return category
  },

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar categoria: ${error.message}`)
    }
    return data
  },

  async getByOrganization(organizationId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select()
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`)
    return data
  },

  async getWithProductCount(organizationId: string): Promise<Array<Category & { product_count: number }>> {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        products:products(count)
      `)
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`)
    
    return (data || []).map(cat => ({
      ...cat,
      product_count: cat.products?.[0]?.count || 0,
    }))
  },

  async update(id: string, data: CategoryUpdate): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Categoria com este nome já existe')
      }
      throw new Error(`Erro ao atualizar categoria: ${error.message}`)
    }
    return category
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        throw new Error('Não é possível excluir categoria com produtos vinculados. Reatribua os produtos primeiro.')
      }
      throw new Error(`Erro ao excluir categoria: ${error.message}`)
    }
  },

  async reassignProducts(categoryId: string, newCategoryId: string | null): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ category_id: newCategoryId })
      .eq('category_id', categoryId)

    if (error) throw new Error(`Erro ao reatribuir produtos: ${error.message}`)
  },
}