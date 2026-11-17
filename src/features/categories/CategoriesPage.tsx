'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Package, ArrowRightLeft } from 'lucide-react'
import { useCategoriesWithCount, useCreateCategory, useUpdateCategory, useDeleteCategory, useReassignProducts } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategoriesWithCount()
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<typeof categories[0] | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null)

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const reassignMutation = useReassignProducts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: formData })
        toast.addToast({ type: 'success', title: 'Categoria atualizada' })
      } else {
        await createMutation.mutateAsync({ ...formData, organization_id: '' })
        toast.addToast({ type: 'success', title: 'Categoria criada' })
      }
      setIsModalOpen(false)
      setEditingCategory(null)
      setFormData({ name: '', description: '' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleEdit = (category: typeof categories[0]) => {
    setEditingCategory(category)
    setFormData({ name: category.name, description: category.description || '' })
    setIsModalOpen(true)
  }

  const handleDelete = async (category: typeof categories[0]) => {
    if (category.product_count > 0) {
      setReassignTargetId(category.id)
      setShowReassignModal(true)
      return
    }
    
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(category.id)
      toast.addToast({ type: 'success', title: 'Categoria excluída' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleReassignAndDelete = async (newCategoryId: string | null) => {
    try {
      await reassignMutation.mutateAsync({ categoryId: reassignTargetId!, newCategoryId })
      await deleteMutation.mutateAsync(reassignTargetId!)
      toast.addToast({ type: 'success', title: 'Produtos reatribuídos e categoria excluída' })
      setShowReassignModal(false)
      setReassignTargetId(null)
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '' })
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground">Organize seus produtos por categorias</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Organize seus produtos por categorias</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Produtos</TableHead>
                  <TableHead className="w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 py-1"
                        onClick={() => {}}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        {category.product_count}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
                        content={
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(category)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        }
                        align="end"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Nenhuma categoria cadastrada"
              description="Crie categorias para organizar melhor seus produtos"
              action={{ label: 'Criar categoria', onClick: openCreateModal }}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Descrição" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showReassignModal} onOpenChange={setShowReassignModal} title="Reatribuir Produtos">
        <div className="space-y-4">
          <p>Esta categoria possui produtos vinculados. Para excluí-la, você deve reatribuir os produtos para outra categoria.</p>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          >
            <option value="">-- Selecione uma categoria --</option>
            {categories?.filter(c => c.id !== reassignTargetId).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="null">-- Remover categoria (deixar sem categoria) --</option>
          </select>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowReassignModal(false); setReassignTargetId(null); }}>Cancelar</Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => handleReassignAndDelete(formData.description || null)}
              disabled={!formData.description}
            >
              Reatribuir e Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}