import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export interface NotificationFilters {
  kind?: Database['public']['Enums']['notification_kind']
  read?: boolean
  product_id?: string
  limit?: number
}

export const notificationRepository = {
  async create(data: NotificationInsert): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return supabase
          .from('notifications')
          .select()
          .eq('dedupe_key', data.dedupe_key)
          .single()
          .then(({ data, error }) => {
            if (error) throw new Error(`Erro ao buscar notificação existente: ${error.message}`)
            return data
          })
      }
      throw new Error(`Erro ao criar notificação: ${error.message}`)
    }
    return notification
  },

  async getById(id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar notificação: ${error.message}`)
    }
    return data
  },

  async list(
    organizationId: string,
    filters: NotificationFilters = {},
    page = 1,
    pageSize = 50
  ): Promise<{ notifications: Notification[]; total: number; page: number; pageSize: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('notifications')
      .select(`
        *,
        product:products(name, sku),
        user:profiles!notifications_user_id_fkey(full_name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters.kind) {
      query = query.eq('kind', filters.kind)
    }

    if (filters.read !== undefined) {
      if (filters.read) {
        query = query.not('read_at', 'is', null)
      } else {
        query = query.is('read_at', null)
      }
    }

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) throw new Error(`Erro ao listar notificações: ${error.message}`)

    return {
      notifications: data || [],
      total: count || 0,
      page,
      pageSize,
    }
  },

  async markAsRead(id: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao marcar como lida: ${error.message}`)
    return data
  },

  async markMultipleAsRead(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)

    if (error) throw new Error(`Erro ao marcar como lidas: ${error.message}`)
  },

  async markAllAsRead(organizationId: string, userId?: string): Promise<void> {
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .is('read_at', null)

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { error } = await query
    if (error) throw new Error(`Erro ao marcar todas como lidas: ${error.message}`)
  },

  async getUnreadCount(organizationId: string, userId?: string): Promise<number> {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('read_at', null)

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { count, error } = await query
    if (error) throw new Error(`Erro ao contar não lidas: ${error.message}`)
    return count || 0
  },

  async resolveAlert(kind: string, productId: string, locationId?: string): Promise<void> {
    const dedupeKey = locationId 
      ? `${kind}:${productId}:${locationId}`
      : `${kind}:${productId}`

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('dedupe_key', dedupeKey)
      .is('read_at', null)

    if (error) throw new Error(`Erro ao resolver alerta: ${error.message}`)
  },
}