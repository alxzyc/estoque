import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export const profileRepository = {
  async create(data: ProfileInsert): Promise<Profile> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar perfil: ${error.message}`)
    return profile
  },

  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar perfil: ${error.message}`)
    }
    return data
  },

  async getByOrganization(organizationId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Erro ao buscar perfis: ${error.message}`)
    return data
  },

  async update(id: string, data: ProfileUpdate): Promise<Profile> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`)
    return profile
  },

  async deactivate(id: string): Promise<Profile> {
    return this.update(id, { active: false })
  },

  async activate(id: string): Promise<Profile> {
    return this.update(id, { active: true })
  },
}