'use client'

import { useState } from 'react'
import { Building2, Shield, Palette, Bell, Database, Save, Loader2 } from 'lucide-react'
import { useSettings, useUpdateSettings, useOrganization } from '@/lib/query/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const { data: organization } = useOrganization()
  const { data: settings, isLoading } = useSettings('')
  const updateMutation = useUpdateSettings()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    // Organization
    name: '',
    cnpj: '',
    // Settings
    allow_negative_stock: false,
    expiring_threshold_days: 30,
    unusual_qty_threshold_pct: 200,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    // Notifications
    email_notifications: true,
    low_stock_alerts: true,
    expiring_alerts: true,
    unusual_movement_alerts: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMutation.mutateAsync({
        organizationId: '',
        data: {
          allow_negative_stock: formData.allow_negative_stock,
          expiring_threshold_days: formData.expiring_threshold_days,
          unusual_qty_threshold_pct: formData.unusual_qty_threshold_pct,
          currency: formData.currency,
          timezone: formData.timezone,
        }
      })
      toast.addToast({ type: 'success', title: 'Configurações salvas' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações da sua organização</p>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua organização</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organization"><Building2 className="h-4 w-4 mr-2" /> Organização</TabsTrigger>
          <TabsTrigger value="inventory"><Database className="h-4 w-4 mr-2" /> Estoque</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notificações</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-2" /> Aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Organização</CardTitle>
              <CardDescription>Informações básicas da sua organização</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <CardContent className="space-y-4">
                <Input label="Nome da Organização" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} defaultValue={organization?.name} />
                <Input label="CNPJ" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0000-00" defaultValue={organization?.cnpj} />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Estoque</CardTitle>
              <CardDescription>Regras e parâmetros para controle de estoque</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Comportamento do Estoque</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Checkbox
                      id="allow_negative_stock"
                      checked={formData.allow_negative_stock}
                      onCheckedChange={(checked) => setFormData({...formData, allow_negative_stock: checked})}
                    >
                      <label htmlFor="allow_negative_stock" className="text-sm">
                        Permitir estoque negativo
                      </label>
                      <p className="text-xs text-muted-foreground ml-6">Permite saídas mesmo quando o saldo for insuficiente</p>
                    </Checkbox>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">Alertas de Validade</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Dias de antecedência para alerta de validade"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.expiring_threshold_days}
                      onChange={(e) => setFormData({...formData, expiring_threshold_days: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">Movimentações Incomuns</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Limite percentual (%)"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.unusual_qty_threshold_pct}
                      onChange={(e) => setFormData({...formData, unusual_qty_threshold_pct: parseInt(e.target.value)})}
                    />
                    <p className="text-sm text-muted-foreground col-span-2">
                      Alertar quando quantidade exceder esta % da média móvel de 30 dias
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-medium">Localização e Moeda</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Moeda"
                      options={[
                        { value: 'BRL', label: 'Real Brasileiro (BRL)' },
                        { value: 'USD', label: 'Dólar Americano (USD)' },
                        { value: 'EUR', label: 'Euro (EUR)' }
                      ]}
                      value={formData.currency}
                      onValueChange={(v) => setFormData({...formData, currency: v})}
                    />
                    <Select
                      label="Fuso Horário"
                      options={[
                        { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
                        { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
                        { value: 'America/Recife', label: 'Recife (UTC-3)' },
                        { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
                        { value: 'UTC', label: 'UTC' }
                      ]}
                      value={formData.timezone}
                      onValueChange={(v) => setFormData({...formData, timezone: v})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Configurações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Configure quais alertas você deseja receber</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Checkbox
                  id="email_notifications"
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData({...formData, email_notifications: checked})}
                >
                  <label htmlFor="email_notifications">Receber notificações por e-mail</label>
                </Checkbox>
                <Checkbox
                  id="low_stock_alerts"
                  checked={formData.low_stock_alerts}
                  onCheckedChange={(checked) => setFormData({...formData, low_stock_alerts: checked})}
                >
                  <label htmlFor="low_stock_alerts">Alertas de estoque baixo</label>
                </Checkbox>
                <Checkbox
                  id="expiring_alerts"
                  checked={formData.expiring_alerts}
                  onCheckedChange={(checked) => setFormData({...formData, expiring_alerts: checked})}
                >
                  <label htmlFor="expiring_alerts">Alertas de produtos vencendo</label>
                </Checkbox>
                <Checkbox
                  id="unusual_movement_alerts"
                  checked={formData.unusual_movement_alerts}
                  onCheckedChange={(checked) => setFormData({...formData, unusual_movement_alerts: checked})}
                >
                  <label htmlFor="unusual_movement_alerts">Alertas de movimentação incomum</label>
                </Checkbox>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a interface do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border rounded-lg p-4">
                  <div className="w-full h-20 bg-white border rounded mb-2" />
                  <Button variant="outline" className="w-full">Claro</Button>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="w-full h-20 bg-gray-900 border rounded mb-2" />
                  <Button variant="outline" className="w-full">Escuro</Button>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="w-full h-20 bg-white border rounded mb-2" />
                  <Button variant="outline" className="w-full">Sistema</Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">A preferência de tema é salva automaticamente no seu navegador.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}