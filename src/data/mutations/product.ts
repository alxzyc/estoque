import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ProductInsert = Database['public']['Tables']['products']['Insert']

export interface CSVImportResult {
  success: number
  errors: Array<{ row: number; sku: string; errors: string[] }>
  created: string[]
  updated: string[]
}

export const productMutations = {
  async createInitialStock(
    productId: string,
    locationId: string,
    quantity: number,
    createdBy: string,
    idempotencyKey: string
  ): Promise<{ movement_id: string; balance_after: number }> {
    const { data, error } = await supabase.rpc('apply_stock_movement', {
      p_product_id: productId,
      p_location_id: locationId,
      p_type: 'adjustment',
      p_quantity: quantity,
      p_reason: 'Saldo inicial',
      p_notes: 'Cadastro inicial do produto',
      p_supplier_id: null,
      p_unit_cost: null,
      p_document_ref: 'INITIAL_STOCK',
      p_transfer_group_id: null,
      p_direction: 'increase',
      p_idempotency_key: idempotencyKey,
      p_created_by: createdBy,
    })

    if (error) throw new Error(`Erro ao registrar saldo inicial: ${error.message}`)
    return data[0] as { movement_id: string; balance_after: number }
  },

  async bulkImport(
    organizationId: string,
    rows: Array<Omit<ProductInsert, 'organization_id' | 'created_by' | 'version'>>,
    createdBy: string,
    mode: 'create_only' | 'update_by_sku' | 'both' = 'both'
  ): Promise<CSVImportResult> {
    const results: CSVImportResult = {
      success: 0,
      errors: [],
      created: [],
      updated: [],
    }

    const existingSkus = new Set<string>()
    if (mode !== 'create_only') {
      const { data: existing } = await supabase
        .from('products')
        .select('sku, id')
        .eq('organization_id', organizationId)
      
      for (const p of existing || []) {
        existingSkus.add(p.sku)
      }
    }

    const batchSize = 500
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        const rowNum = i + j + 1
        const rowErrors: string[] = []

        if (mode === 'create_only' && existingSkus.has(row.sku)) {
          rowErrors.push('SKU já existe (modo criar apenas)')
        }

        if (rowErrors.length > 0) {
          results.errors.push({ row: rowNum, sku: row.sku, errors: rowErrors })
          continue
        }

        try {
          const isUpdate = existingSkus.has(row.sku) && mode !== 'create_only'
          
          if (isUpdate) {
            const { data: existing } = await supabase
              .from('products')
              .select('id, version')
              .eq('sku', row.sku)
              .eq('organization_id', organizationId)
              .single()

            if (existing) {
              const { error } = await supabase
                .from('products')
                .update({ 
                  ...row, 
                  organization_id: organizationId,
                  created_by: createdBy,
                  version: existing.version + 1,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .eq('version', existing.version)

              if (error) throw error
              results.updated.push(row.sku)
            }
          } else {
            const { data, error } = await supabase
              .from('products')
              .insert({
                ...row,
                organization_id: organizationId,
                created_by: createdBy,
                version: 1,
              })
              .select('id')
              .single()

              if (error) throw error
              results.created.push(row.sku)
              existingSkus.add(row.sku)
          }
          results.success++
        } catch (err: any) {
          rowErrors.push(err.message || 'Erro desconhecido')
          results.errors.push({ row: rowNum, sku: row.sku, errors: rowErrors })
        }
      }
    }

    return results
  },

  async uploadImage(file: File, productId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedTypes = ['jpg', 'jpeg', 'png', 'webp']
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.')
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Imagem deve ter no máximo 2MB')
    }

    const fileName = `${productId}-${Date.now()}.${fileExt}`
    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) throw new Error(`Erro ao fazer upload: ${uploadError.message}`)

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  },

  async deleteImage(imagePath: string): Promise<void> {
    const fileName = imagePath.split('/').pop()
    if (!fileName) return

    const filePath = `products/${fileName}`
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) throw new Error(`Erro ao excluir imagem: ${error.message}`)
  },
}