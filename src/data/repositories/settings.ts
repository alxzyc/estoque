import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Settings = Database['public']['Tables']['settings']['Row']
type SettingsInsert = Database['public']['Tables']['settings']['Insert']
type SettingsUpdate = Database['public']['Tables']['settings']['Update']

export const settingsRepository = {
  async get(organizationId: string): Promise<Settings> {
    const { data, error } = await supabase
      .from('settings')
      .select()
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return this.createDefaults(organizationId)
      }
      throw new Error(`Erro ao buscar configurações: ${error.message}`)
    }
    return data
  },

  async createDefaults(organizationId: string): Promise<Settings> {
    const defaults: SettingsInsert = {
      organization_id: organizationId,
      allow_negative_stock: false,
      expiring_threshold_days: 30,
      unusual_qty_threshold_pct: 200,
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
    }

    const { data, error } = await supabase
      .from('settings')
      .insert(defaults)
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar configurações padrão: ${error.message}`)
    return data
  },

  async update(organizationId: string, data: SettingsUpdate): Promise<Settings> {
    const { data: settings, error } = await supabase
      .from('settings')
      .update(data)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw new Error(`Erro ao atualizar configurações: ${error.message}`)
    return settings
  },
}