'use client'

import { useState } from 'react'
import { Plus, Mail, UserX, Shield, RotateCcw, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { useProfiles, useInviteUser, useUpdateProfile, useDeactivateProfile } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { formatRelativeTime, cn } from '@/utils/cn'
import { USER_ROLES } from '@/domain/products/rules'

export function UsersPage() {
  const { data: users, isLoading } = useProfiles()
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null)
  const [formData, setFormData] = useState({ email: '', role: 'operator' as const, full_name: '' })

  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateProfile()
  const deactivateMutation = useDeactivateProfile()

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await inviteMutation.mutateAsync({ email: formData.email, role: formData.role })
      toast.addToast({ type: 'success', title: 'Convite enviado', message: `Convite enviado para ${formData.email}` })
      setIsModalOpen(false)
      setFormData({ email: '', role: 'operator' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleEdit = (user: typeof users[0]) => {
    setEditingUser(user)
    setFormData({ email: user.full_name || '', role: user.role, full_name: user.full_name || '' })
    setIsModalOpen(true)
  }

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await updateMutation.mutateAsync({ id: userId, data: { role: role as any } })
      toast.addToast({ type: 'success', title: 'Perfil atualizado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleDeactivate = async (user: typeof users[0]) => {
    if (!confirm(`Desativar o usuário "${user.full_name || user.id}"?`)) return
    try {
      await deactivateMutation.mutateAsync(user.id)
      toast.addToast({ type: 'success', title: 'Usuário desativado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  const handleResendInvite = async (userId: string) => {
    // Implement re-send invite
    toast.addToast({ type: 'info', title: 'Reenviando convite...' })
  }

  const openInviteModal = () => {
    setEditingUser(null)
    setFormData({ email: '', role: 'operator', full_name: '' })
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gerencie os usuários da sua organização</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
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
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários da sua organização</p>
        </div>
        <Button onClick={openInviteModal}>
          <Plus className="h-4 w-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                    <TableCell>{user.id}</TableCell> {/* Email would come from auth */}
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      )}>
                        {USER_ROLES.find(r => r.value === user.role)?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>{formatRelativeTime(user.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu
                        trigger={<Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>}
                        content={
                          <>
                            <DropdownMenuLabel>Alterar perfil</DropdownMenuLabel>
                            {USER_ROLES.filter(r => r.value !== 'admin' || user.role === 'admin').map(role => (
                              <DropdownMenuItem
                                key={role.value}
                                onClick={() => handleUpdateRole(user.id, role.value)}
                                className={user.role === role.value ? 'font-medium' : ''}
                              >
                                {role.label} {user.role === role.value && '(atual)'}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {user.active ? (
                              <DropdownMenuItem onClick={() => handleDeactivate(user)} className="text-red-600">
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: user.id, data: { active: true } })}>
                                Ativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleResendInvite(user.id)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Reenviar convite
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
              icon={<UserX className="h-12 w-12" />}
              title="Nenhum usuário cadastrado"
              description="Convide membros da equipe para colaborar na gestão de estoque"
              action={{ label: 'Convidar primeiro usuário', onClick: openInviteModal }}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title={editingUser ? 'Editar Usuário' : 'Convidar Usuário'}>
        <form onSubmit={handleInvite} className="space-y-4">
          <Input label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <Select
            label="Perfil"
            options={USER_ROLES.filter(r => r.value !== 'admin').map(r => ({ value: r.value, label: r.label }))}
            value={formData.role}
            onValueChange={(v) => setFormData({...formData, role: v as any})}
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {editingUser ? 'Salvar' : 'Enviar Convite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}