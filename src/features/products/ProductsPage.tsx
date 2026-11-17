'use client'

import { useState, useCallback } from 'react'
import { Plus, Search, Filter, Download, Upload, FileText, Archive, RotateCcw, Trash2, Eye, Edit } from 'lucide-react'
import { useProducts, useProduct, useCreateProduct, useUpdateProduct, useArchiveProduct, useRestoreProduct, useDeleteProduct, useBulkImportProducts, useCategories, useSuppliers, useStockLocations } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, DataTable } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { productSchema } from '@/lib/validations/schemas'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PRODUCT_UNITS } from '@/domain/products/rules'

type ProductFormData = {
  name: string
  sku: string
  barcode: string
  description: string
  category_id: string
  brand: string
  primary_supplier_id: string
  cost_price: number
  sale_price: number
  unit: string
  min_stock: number
  expires_tracking: boolean
}

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    category_id: '',
    supplier_id: '',
    location_id: '',
    availability: 'all' as const,
    price_min: '',
    price_max: '',
    archived: false
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [viewingProduct, setViewingProduct] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'create_only' | 'update_by_sku' | 'both'>('both')
  const [previewData, setPreviewData] = useState<any[]>([])

  const { data: productsResult, isLoading } = useProducts(
    '', // organizationId will come from context
    { ...filters, search, archived: filters.archived },
    page,
    pageSize
  )
  const { data: categories } = useCategories('')
  const { data: suppliers } = useSuppliers('', true)
  const { data: locations } = useStockLocations('', true)

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const archiveMutation = useArchiveProduct()
  const restoreMutation = useRestoreProduct()
  const deleteMutation = useDeleteProduct()
  const importMutation = useBulkImportProducts()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category_id: '',
      brand: '',
      primary_supplier_id: '',
      cost_price: 0,
      sale_price: 0,
      unit: 'un',
      min_stock: 0,
      expires_tracking: false,
    }
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const handleOpenCreate = () => {
    setEditingProduct(null)
    form.reset()
    setIsModalOpen(true)
  }

  const handleEdit = async (productId: string) => {
    setEditingProduct(productId)
    // Fetch product data
    const { data: product } = await useProduct(productId).promise
    if (product) {
      form.setValue('name', product.name)
      form.setValue('sku', product.sku)
      form.setValue('barcode', product.barcode || '')
      form.setValue('description', product.description || '')
      form.setValue('category_id', product.category_id || '')
      form.setValue('brand', product.brand || '')
      form.setValue('primary_supplier_id', product.primary_supplier_id || '')
      form.setValue('cost_price', product.cost_price)
      form.setValue('sale_price', product.sale_price)
      form.setValue('unit', product.unit)
      form.setValue('min_stock', product.min_stock)
      form.setValue('expires_tracking', product.expires_tracking)
    }
    setIsModalOpen(true)
  }

  const handleView = (productId: string) => {
    setViewingProduct(productId)
  }

  const handleArchive = async (productId: string) => {
    if (!confirm('Arquivar este produto? Ele não aparecerá nas listagens padrão.')) return
    try {
      await archiveMutation.mutateAsync(productId)
      toast.addToast({ type: 'success', title: 'Produto arquivado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleRestore = async (productId: string) => {
    try {
      await restoreMutation.mutateAsync(productId)
      toast.addToast({ type: 'success', title: 'Produto restaurado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return
    try {
      await deleteMutation.mutateAsync(productId)
      toast.addToast({ type: 'success', title: 'Produto excluído' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    try {
      const orgId = '' // Get from context
      if (editingProduct) {
        // Get current version for optimistic locking
        const { data: product } = await useProduct(editingProduct).promise
        if (product) {
          await updateMutation.mutateAsync({ id: editingProduct, data, expectedVersion: product.version })
        }
        toast.addToast({ type: 'success', title: 'Produto atualizado' })
      } else {
        await createMutation.mutateAsync({ ...data, organization_id: orgId, created_by: '', version: 1 })
        toast.addToast({ type: 'success', title: 'Produto criado' })
      }
      setIsModalOpen(false)
      form.reset()
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleImportFile = (file: File) => {
    setImportFile(file)
    // Parse CSV for preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const preview = lines.slice(1, 21).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {})
      })
      setPreviewData(preview)
    }
    reader.readAsText(file)
  }

  const handleImportSubmit = async () => {
    if (!importFile) return
    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {})
      })

      await importMutation.mutateAsync({ organizationId: '', rows, createdBy: '', mode: importMode })
      toast.addToast({ type: 'success', title: 'Importação concluída' })
      setImportModalOpen(false)
      setImportFile(null)
      setPreviewData([])
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro na importação', message: error.message })
    }
  }

  const handleExport = () => {
    // Export logic here
    toast.addToast({ type: 'info', title: 'Exportação', message: 'Funcionalidade em desenvolvimento' })
  }

  const toast = useToast()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const products = productsResult?.products || []
  const total = productsResult?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Nome' },
    { key: 'category', header: 'Categoria', render: (row: any) => row.category?.name || '-' },
    { key: 'brand', header: 'Marca', render: (row: any) => row.brand || '-' },
    { key: 'total_stock', header: 'Estoque Total', render: (row: any) => formatNumber(row.total_stock) },
    { key: 'cost_price', header: 'Custo', render: (row: any) => formatCurrency(row.cost_price) },
    { key: 'sale_price', header: 'Venda', render: (row: any) => formatCurrency(row.sale_price) },
    { key: 'status', header: 'Status', render: (row: any) => (
      <span className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        row.archived_at ? 'bg-gray-100 text-gray-800' :
        row.total_stock <= 0 ? 'bg-red-100 text-red-800' :
        row.total_stock <= (row.min_stock || 0) ? 'bg-yellow-100 text-yellow-800' :
        'bg-green-100 text-green-800'
      )}>
        {row.archived_at ? 'Arquivado' : row.total_stock <= 0 ? 'Sem estoque' : row.total_stock <= (row.min_stock || 0) ? 'Estoque baixo' : 'Normal'}
      </span>
    )},
    { key: 'actions', header: 'Ações', render: (row: any) => (
      <DropdownMenu
        trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
        content={
          <>
            <DropdownMenuItem onClick={() => handleView(row.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.archived_at ? (
              <DropdownMenuItem onClick={() => handleRestore(row.id)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => handleArchive(row.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </>
        }
        align="end"
      />
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou código de barras..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'Todas as categorias' },
                ...(categories?.map(c => ({ value: c.id, label: c.name })) || [])
              ]}
              value={filters.category_id}
              onValueChange={(v) => handleFilterChange('category_id', v)}
              placeholder="Categoria"
            />
            <Select
              options={[
                { value: '', label: 'Todos fornecedores' },
                ...(suppliers?.map(s => ({ value: s.id, label: s.company_name })) || [])
              ]}
              value={filters.supplier_id}
              onValueChange={(v) => handleFilterChange('supplier_id', v)}
              placeholder="Fornecedor"
            />
            <Select
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'in_stock', label: 'Em estoque' },
                { value: 'low_stock', label: 'Estoque baixo' },
                { value: 'out_of_stock', label: 'Sem estoque' }
              ]}
              value={filters.availability}
              onValueChange={(v) => handleFilterChange('availability', v)}
              placeholder="Disponibilidade"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => handleFilterChange('archived', e.target.checked)}
                className="rounded border-input"
              />
              Incluir arquivados
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <>
              <DataTable
                columns={columns}
                data={products}
                keyExtractor={(row) => row.id}
                emptyMessage="Nenhum produto encontrado"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages} — {total} produtos
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Nenhum produto encontrado"
              description={search || filters.category_id ? 'Tente ajustar os filtros de busca' : 'Cadastre seu primeiro produto para começar'}
              action={{ label: 'Cadastrar produto', onClick: handleOpenCreate }}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title={editingProduct ? 'Editar Produto' : 'Novo Produto'} size="xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" {...form.register('name')} error={form.formState.errors.name?.message} required />
            <Input label="SKU" {...form.register('sku')} error={form.formState.errors.sku?.message} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Código de Barras (EAN-13)" {...form.register('barcode')} error={form.formState.errors.barcode?.message} />
            <Select
              label="Unidade"
              options={PRODUCT_UNITS.map(u => ({ value: u.value, label: u.label }))}
              {...form.register('unit')}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Preço de Custo" type="number" step="0.01" min="0" {...form.register('cost_price', { valueAsNumber: true })} error={form.formState.errors.cost_price?.message} />
            <Input label="Preço de Venda" type="number" step="0.01" min="0" {...form.register('sale_price', { valueAsNumber: true })} error={form.formState.errors.sale_price?.message} />
            <Input label="Estoque Mínimo" type="number" min="0" step="1" {...form.register('min_stock', { valueAsNumber: true })} error={form.formState.errors.min_stock?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Categoria"
              options={[
                { value: '', label: 'Sem categoria' },
                ...(categories?.map(c => ({ value: c.id, label: c.name })) || [])
              ]}
              {...form.register('category_id')}
            />
            <Select
              label="Fornecedor Principal"
              options={[
                { value: '', label: 'Sem fornecedor' },
                ...(suppliers?.map(s => ({ value: s.id, label: s.company_name })) || [])
              ]}
              {...form.register('primary_supplier_id')}
            />
          </div>
          <Input label="Marca" {...form.register('brand')} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="expires_tracking" {...form.register('expires_tracking')} />
              <label htmlFor="expires_tracking">Controlar validade (lotes)</label>
            </div>
          </div>
          <Textarea label="Descrição" {...form.register('description')} rows={3} />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={importModalOpen} onOpenChange={setImportModalOpen} title="Importar Produtos (CSV)" size="lg">
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg">Arraste o arquivo CSV aqui ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-2">Máx. 2MB • UTF-8 com BOM • Separador detectado automaticamente</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()} className="mt-4">
              Selecionar arquivo
            </Button>
          </div>

          {importFile && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{importFile.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setImportFile(null)}>Remover</Button>
              </div>
              <Select
                label="Modo de importação"
                options={[
                  { value: 'create_only', label: 'Criar apenas novos (ignorar SKUs existentes)' },
                  { value: 'update_by_sku', label: 'Atualizar por SKU (criar se não existir)' },
                  { value: 'both', label: 'Criar novos e atualizar existentes' }
                ]}
                value={importMode}
                onValueChange={setImportMode}
              />
            </div>
          )}

          {previewData.length > 0 && (
            <div className="max-h-60 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    {Object.keys(previewData[0]).map(key => (
                      <th key={key} className="p-2 text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="p-2 border-t">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { setImportModalOpen(false); setImportFile(null); setPreviewData([]); }}>Cancelar</Button>
            <Button onClick={handleImportSubmit} disabled={!importFile || importMutation.isPending}>
              Importar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}