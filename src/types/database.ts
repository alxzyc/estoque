export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          full_name: string | null
          role: 'admin' | 'manager' | 'operator'
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'operator'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'operator'
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          organization_id: string
          company_name: string
          cnpj: string | null
          contact_name: string | null
          phone: string | null
          email: string | null
          address: Json | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          company_name: string
          cnpj?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          company_name?: string
          cnpj?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: Json | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      product_suppliers: {
        Row: {
          product_id: string
          supplier_id: string
          supplier_sku: string | null
          last_cost: number | null
          is_preferred: boolean
        }
        Insert: {
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
          last_cost?: number | null
          is_preferred?: boolean
        }
        Update: {
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
          last_cost?: number | null
          is_preferred?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'product_suppliers_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_suppliers_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          }
        ]
      }
      stock_locations: {
        Row: {
          id: string
          organization_id: string
          name: string
          code: string
          active: boolean
          is_default: boolean
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          code: string
          active?: boolean
          is_default?: boolean
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          code?: string
          active?: boolean
          is_default?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'stock_locations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      products: {
        Row: {
          id: string
          organization_id: string
          name: string
          sku: string
          barcode: string | null
          description: string | null
          category_id: string | null
          brand: string | null
          primary_supplier_id: string | null
          cost_price: number
          sale_price: number
          unit: 'un' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cx' | 'pct'
          min_stock: number
          image_path: string | null
          expires_tracking: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
          created_by: string
          version: number
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          sku: string
          barcode?: string | null
          description?: string | null
          category_id?: string | null
          brand?: string | null
          primary_supplier_id?: string | null
          cost_price?: number
          sale_price?: number
          unit?: 'un' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cx' | 'pct'
          min_stock?: number
          image_path?: string | null
          expires_tracking?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          version?: number
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          sku?: string
          barcode?: string | null
          description?: string | null
          category_id?: string | null
          brand?: string | null
          primary_supplier_id?: string | null
          cost_price?: number
          sale_price?: number
          unit?: 'un' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cx' | 'pct'
          min_stock?: number
          image_path?: string | null
          expires_tracking?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'products_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_primary_supplier_id_fkey'
            columns: ['primary_supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      product_stock: {
        Row: {
          product_id: string
          location_id: string
          organization_id: string
          quantity: number
        }
        Insert: {
          product_id: string
          location_id: string
          organization_id: string
          quantity?: number
        }
        Update: {
          product_id?: string
          location_id?: string
          organization_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: 'product_stock_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_stock_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_stock_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      stock_batches: {
        Row: {
          id: string
          product_id: string
          location_id: string
          organization_id: string
          lot_code: string
          quantity: number
          expires_on: string | null
          received_at: string
        }
        Insert: {
          id?: string
          product_id: string
          location_id: string
          organization_id: string
          lot_code: string
          quantity: number
          expires_on?: string | null
          received_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          location_id?: string
          organization_id?: string
          lot_code?: string
          quantity?: number
          expires_on?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stock_batches_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_batches_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_batches_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      stock_movements: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          location_id: string
          type: 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
          direction: 'increase' | 'decrease' | null
          quantity: number
          balance_before: number
          balance_after: number
          reason: string | null
          notes: string | null
          transfer_group_id: string | null
          supplier_id: string | null
          unit_cost: number | null
          document_ref: string | null
          reverses_movement_id: string | null
          idempotency_key: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          location_id: string
          type: 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
          direction?: 'increase' | 'decrease' | null
          quantity: number
          balance_before: number
          balance_after: number
          reason?: string | null
          notes?: string | null
          transfer_group_id?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          document_ref?: string | null
          reverses_movement_id?: string | null
          idempotency_key: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          location_id?: string
          type?: 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
          direction?: 'increase' | 'decrease' | null
          quantity?: number
          balance_before?: number
          balance_after?: number
          reason?: string | null
          notes?: string | null
          transfer_group_id?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          document_ref?: string | null
          reverses_movement_id?: string | null
          idempotency_key?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stock_movements_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_reverses_movement_id_fkey'
            columns: ['reverses_movement_id']
            isOneToOne: false
            referencedRelation: 'stock_movements'
            referencedColumns: ['id']
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string
          actor_id: string | null
          action: string
          entity: string
          entity_id: string
          before: Json | null
          after: Json | null
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          actor_id?: string | null
          action: string
          entity: string
          entity_id: string
          before?: Json | null
          after?: Json | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string
          before?: Json | null
          after?: Json | null
          ip?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          kind: 'low_stock' | 'out_of_stock' | 'expiring' | 'unusual_movement' | 'reorder'
          product_id: string | null
          payload: Json | null
          dedupe_key: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          kind: 'low_stock' | 'out_of_stock' | 'expiring' | 'unusual_movement' | 'reorder'
          product_id?: string | null
          payload?: Json | null
          dedupe_key: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          kind?: 'low_stock' | 'out_of_stock' | 'expiring' | 'unusual_movement' | 'reorder'
          product_id?: string | null
          payload?: Json | null
          dedupe_key?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      settings: {
        Row: {
          organization_id: string
          allow_negative_stock: boolean
          expiring_threshold_days: number
          unusual_qty_threshold_pct: number
          currency: string
          timezone: string
        }
        Insert: {
          organization_id: string
          allow_negative_stock?: boolean
          expiring_threshold_days?: number
          unusual_qty_threshold_pct?: number
          currency?: string
          timezone?: string
        }
        Update: {
          organization_id?: string
          allow_negative_stock?: boolean
          expiring_threshold_days?: number
          unusual_qty_threshold_pct?: number
          currency?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'settings_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      apply_stock_movement: {
        Args: {
          p_product_id: string
          p_location_id: string
          p_type: 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
          p_quantity: number
          p_reason: string | null
          p_notes: string | null
          p_supplier_id: string | null
          p_unit_cost: number | null
          p_document_ref: string | null
          p_transfer_group_id: string | null
          p_direction: 'increase' | 'decrease' | null
          p_idempotency_key: string
          p_created_by: string
        }
        Returns: {
          movement_id: string
          balance_after: number
        }[]
      }
      get_product_stock: {
        Args: { p_product_id: string; p_location_id: string | null }
        Returns: {
          product_id: string
          location_id: string
          location_name: string
          quantity: number
        }[]
      }
      get_dashboard_metrics: {
        Args: { p_location_id: string | null }
        Returns: {
          active_products: number
          total_units: number
          low_stock_count: number
          out_of_stock_count: number
          inventory_value: number
        }[]
      }
      get_recent_movements: {
        Args: { p_limit: number; p_location_id: string | null }
        Returns: {
          id: string
          product_name: string
          product_sku: string
          type: string
          quantity: number
          location_name: string
          created_by_name: string
          created_at: string
        }[]
      }
      get_top_selling_products: {
        Args: { p_days: number; p_limit: number; p_location_id: string | null }
        Returns: {
          product_id: string
          product_name: string
          product_sku: string
          total_quantity: number
        }[]
      }
      get_movement_chart_data: {
        Args: { p_days: number; p_location_id: string | null }
        Returns: {
          date: string
          entries: number
          exits: number
        }[]
      }
      get_stock_evolution: {
        Args: { p_days: number; p_product_id: string | null; p_location_id: string | null }
        Returns: {
          date: string
          balance: number
        }[]
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'operator'
      movement_type: 'in' | 'out' | 'adjustment' | 'return' | 'loss' | 'transfer_out' | 'transfer_in'
      movement_direction: 'increase' | 'decrease'
      notification_kind: 'low_stock' | 'out_of_stock' | 'expiring' | 'unusual_movement' | 'reorder'
      product_unit: 'un' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cx' | 'pct'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}