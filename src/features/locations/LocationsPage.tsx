'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Home, Shield } from 'lucide-react'
import { useStockLocations, useDefaultStockLocation, useCreateStockLocation, useUpdateStockLocation, useDeactivateStockLocation } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

export function LocationsPage() {
  const { data: locations, isLoading } = useStockLocations()
  const { data: defaultLocation } = useDefaultStockLocation()
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<typeof locations[0] | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '', active: true, isDefault: false })

  const createMutation = useCreateStockLocation()
  const updateMutation = useUpdateStockLocation()
  const deactivateMutation = useDeactivateStockLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLocation) {
        await updateMutation.mutateAsync({ id: editingLocation.id, data: formData })
        toast.addToast({ type: 'success', title: 'Depósito atualizado' })
      } else {
        await createMutation.mutateAsync({ ...formData, organization_id: '' })
        toast.addToast({ type: 'success', title: 'Depósito criado' })
      }
      setIsModalOpen(false)
      setEditingLocation(null)
      setFormData({ name: '', code: '', active: true, isDefault: false })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleEdit = (location: typeof locations[0]) => {
    setEditingLocation(location)
    setFormData({ name: location.name, code: location.code, active: location.active, isDefault: location.is_default })
    setIsModalOpen(true)
  }

  const handleDeactivate = async (location: typeof locations[0]) => {
    if (!confirm(`Desativar o depósito "${location.name}"?`)) return
    try {
      await deactivateMutation.mutateAsync(location.id)
      toast.addToast({ type: 'success', title: 'Depósito desativado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleSetDefault = async (location: typeof locations[0]) => {
    try {
      await updateMutation.mutateAsync({ id: location.id, data: { is_default: true } })
      toast.addToast({ type: 'success', title: 'Depósito padrão alterado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const openCreateModal = () => {
    setEditingLocation(null)
    setFormData({ name: '', code: '', active: true, isDefault: false })
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Depósitos</h1>
            <p className="text-muted-foreground">Gerencie os depósitos da sua organização</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-3/4" />
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
          <h1 className="text-3xl font-bold tracking-tight">Depósitos</h1>
          <p className="text-muted-foreground">Gerencie os depósitos da sua organização</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Depósito
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Depósitos</CardTitle>
        </CardHeader>
        <CardContent>
          {locations && locations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {location.is_default && <Home className="h-4 w-4 text-primary" title="Depósito padrão" />}
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell><code className="text-sm">{location.code}</code></TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        location.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {location.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        trigger={<Button variant="ghost" size="icon"><Shield className="h-4 w-4" /></Button>}
                        content={
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(location)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {!location.is_default && (
                              <DropdownMenuItem onClick={() => handleSetDefault(location)}>
                                <Home className="h-4 w-4 mr-2" />
                                Definir como padrão
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {location.active ? (
                              <DropdownMenuItem onClick={() => handleDeactivate(location)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: location.id, data: { active: true } })}>
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
              icon={<Shield className="h-12 w-12" />}
              title="Nenhum depósito cadastrado"
              description="Crie o primeiro depósito para começar a gerenciar seu estoque"
              action={{ label: 'Criar depósito', onClick: openCreateModal }}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title={editingLocation ? 'Editar Depósito' : 'Novo Depósito'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Código" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="EX: PRINCIPAL" required />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} />
            <label htmlFor="isDefault">Definir como depósito padrão</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingLocation ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}