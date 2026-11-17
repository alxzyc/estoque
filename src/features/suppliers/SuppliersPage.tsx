'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Building, Truck, Package } from 'lucide-react'
import { useSuppliersWithCount, useCreateSupplier, useUpdateSupplier, useDeactivateSupplier } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatCNPJ } from '@/utils/format'
import { cn } from '@/utils/cn'

export function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliersWithCount()
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<typeof suppliers[0] | null>(null)
  const [formData, setFormData] = useState({
    company_name: '',
    cnpj: '',
    contact_name: '',
    phone: '',
    email: '',
    address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' },
    active: true
  })

  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deactivateMutation = useDeactivateSupplier()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        await updateMutation.mutateAsync({ id: editingSupplier.id, data: formData })
        toast.addToast({ type: 'success', title: 'Fornecedor atualizado' })
      } else {
        await createMutation.mutateAsync({ ...formData, organization_id: '' })
        toast.addToast({ type: 'success', title: 'Fornecedor criado' })
      }
      setIsModalOpen(false)
      setEditingSupplier(null)
      resetForm()
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleEdit = (supplier: typeof suppliers[0]) => {
    setEditingSupplier(supplier)
    setFormData({
      company_name: supplier.company_name,
      cnpj: supplier.cnpj || '',
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' },
      active: supplier.active
    })
    setIsModalOpen(true)
  }

  const handleDeactivate = async (supplier: typeof suppliers[0]) => {
    if (!confirm(`Desativar o fornecedor "${supplier.company_name}"?`)) return
    try {
      await deactivateMutation.mutateAsync(supplier.id)
      toast.addToast({ type: 'success', title: 'Fornecedor desativado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const resetForm = () => {
    setFormData({
      company_name: '',
      cnpj: '',
      contact_name: '',
      phone: '',
      email: '',
      address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' },
      active: true
    })
  }

  const openCreateModal = () => {
    setEditingSupplier(null)
    resetForm()
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
            <p className="text-muted-foreground">Gerencie seus fornecedores</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers && suppliers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="w-32">Produtos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.company_name}</TableCell>
                    <TableCell>{supplier.cnpj ? formatCNPJ(supplier.cnpj) : '-'}</TableCell>
                    <TableCell>
                      <div>
                        {supplier.contact_name && <div className="font-medium">{supplier.contact_name}</div>}
                        {supplier.phone && <div className="text-sm text-muted-foreground">{supplier.phone}</div>}
                        {supplier.email && <div className="text-sm text-muted-foreground">{supplier.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 px-2 py-1">
                        <Package className="h-4 w-4 mr-1" />
                        {supplier.product_count}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        supplier.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {supplier.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>}
                        content={
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {supplier.active ? (
                              <DropdownMenuItem onClick={() => handleDeactivate(supplier)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: supplier.id, data: { active: true } })}>
                                Ativar
                              </DropdownMenuItem>
                            )}
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
              icon={<Building className="h-12 w-12" />}
              title="Nenhum fornecedor cadastrado"
              description="Cadastre fornecedores para vincular aos seus produtos"
              action={{ label: 'Cadastrar fornecedor', onClick: openCreateModal }}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title={editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Razão Social" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required />
            <Input label="CNPJ" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Nome do Contato" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
            <Input label="Telefone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="E-mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Input label="CEP" value={formData.address.zip_code} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zip_code: e.target.value } })} />
            <Input label="Endereço" value={formData.address.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })} />
            <Input label="Número" value={formData.address.number} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, number: e.target.value } })} />
            <Input label="Complemento" value={formData.address.complement} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, complement: e.target.value } })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input label="Bairro" value={formData.address.neighborhood} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, neighborhood: e.target.value } })} />
            <Input label="Cidade" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} />
            <Input label="Estado" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value.toUpperCase() }})} maxLength={2} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
            <label htmlFor="active">Ativo</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingSupplier ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}