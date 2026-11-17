import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export const organizationRepository = {
  async create(data: OrganizationInsert): Promise<Organization> {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar organização: ${error.message}`)
    return org
  },

  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar organização: ${error.message}`)
    }
    return data
  },

  async update(id: string, data: OrganizationUpdate): Promise<Organization> {
    const { data: org, error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao atualizar organização: ${error.message}`)
    return org
  },
}