import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import * as repositories from '@/data/repositories'
import * as queries from '@/data/queries'
import * as mutations from '@/data/mutations'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type Product = Database['public']['Tables']['products']['Row']
type StockLocation = Database['public']['Tables']['stock_locations']['Row']
type Settings = Database['public']['Tables']['settings']['Row']

export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(`Erro ao buscar perfil: ${error.message}`)
      }
      return data
    },
    enabled: false,
  })
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile) return null
      
      const { data, error } = await supabase
        .from('organizations')
        .select()
        .eq('id', profile.organization_id)
        .single()
      
      if (error) throw new Error(`Erro ao buscar organização: ${error.message}`)
      return data
    },
    enabled: false,
  })
}

export function useCategories(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['categories', organizationId],
    queryFn: () => repositories.categoryRepository.getByOrganization(organizationId!),
    enabled: !!organizationId,
  })
}

export function useCategoriesWithCount(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['categories', 'with-count', organizationId],
    queryFn: () => repositories.categoryRepository.getWithProductCount(organizationId!),
    enabled: !!organizationId,
  })
}

export function useSuppliers(organizationId: string | undefined, activeOnly = false) {
  return useQuery({
    queryKey: ['suppliers', organizationId, activeOnly],
    queryFn: () => repositories.supplierRepository.getByOrganization(organizationId!, activeOnly),
    enabled: !!organizationId,
  })
}

export function useSuppliersWithCount(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['suppliers', 'with-count', organizationId],
    queryFn: () => repositories.supplierRepository.getWithProductCount(organizationId!),
    enabled: !!organizationId,
  })
}

export function useStockLocations(organizationId: string | undefined, activeOnly = false) {
  return useQuery({
    queryKey: ['stock-locations', organizationId, activeOnly],
    queryFn: () => repositories.stockLocationRepository.getByOrganization(organizationId!, activeOnly),
    enabled: !!organizationId,
  })
}

export function useDefaultStockLocation(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['stock-locations', 'default', organizationId],
    queryFn: () => repositories.stockLocationRepository.getDefault(organizationId!),
    enabled: !!organizationId,
  })
}

export function useProducts(
  organizationId: string | undefined,
  filters: repositories.ProductFilters = {},
  page = 1,
  pageSize = 25
) {
  return useQuery({
    queryKey: ['products', organizationId, filters, page, pageSize],
    queryFn: () => repositories.productRepository.list(organizationId!, filters, page, pageSize),
    enabled: !!organizationId,
    placeholderData: (previous) => previous,
  })
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => repositories.productRepository.getById(productId!),
    enabled: !!productId,
  })
}

export function useProductStock(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-stock', productId],
    queryFn: () => repositories.productRepository.getStockByLocation(productId!),
    enabled: !!productId,
  })
}

export function useProductMovements(
  productId: string | undefined,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ['product-movements', productId, limit, offset],
    queryFn: () => repositories.productRepository.getMovements(productId!, limit, offset),
    enabled: !!productId,
  })
}

export function useDashboardMetrics(locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'metrics', locationId],
    queryFn: () => queries.dashboardQueries.getMetrics(locationId),
  })
}

export function useRecentMovements(limit = 10, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'recent-movements', limit, locationId],
    queryFn: () => queries.dashboardQueries.getRecentMovements(limit, locationId),
  })
}

export function useTopSellingProducts(days = 30, limit = 10, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'top-selling', days, limit, locationId],
    queryFn: () => queries.dashboardQueries.getTopSellingProducts(days, limit, locationId),
  })
}

export function useMovementChartData(days = 30, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'movement-chart', days, locationId],
    queryFn: () => queries.dashboardQueries.getMovementChartData(days, locationId),
  })
}

export function useStockEvolution(days = 30, productId?: string, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'stock-evolution', days, productId, locationId],
    queryFn: () => queries.dashboardQueries.getStockEvolution(days, productId, locationId),
  })
}

export function useLowStockProducts(organizationId: string | undefined, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'low-stock', organizationId, locationId],
    queryFn: () => queries.dashboardQueries.getLowStockProducts(organizationId!, locationId),
    enabled: !!organizationId,
  })
}

export function useOutOfStockProducts(organizationId: string | undefined, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'out-of-stock', organizationId, locationId],
    queryFn: () => queries.dashboardQueries.getOutOfStockProducts(organizationId!, locationId),
    enabled: !!organizationId,
  })
}

export function useExpiringProducts(organizationId: string | undefined, days = 30, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'expiring', organizationId, days, locationId],
    queryFn: () => queries.dashboardQueries.getExpiringProducts(organizationId!, days, locationId),
    enabled: !!organizationId,
  })
}

export function useSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['settings', organizationId],
    queryFn: () => repositories.settingsRepository.get(organizationId!),
    enabled: !!organizationId,
  })
}

export function useNotifications(
  organizationId: string | undefined,
  filters: repositories.NotificationFilters = {},
  page = 1,
  pageSize = 50
) {
  return useQuery({
    queryKey: ['notifications', organizationId, filters, page, pageSize],
    queryFn: () => repositories.notificationRepository.list(organizationId!, filters, page, pageSize),
    enabled: !!organizationId,
  })
}

export function useUnreadNotificationCount(organizationId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: ['notifications', 'unread-count', organizationId, userId],
    queryFn: () => repositories.notificationRepository.getUnreadCount(organizationId!, userId),
    enabled: !!organizationId,
    refetchInterval: 30000,
  })
}

// Mutations
export function useCreateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string; organization_id: string }) => 
      repositories.categoryRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => 
      repositories.categoryRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.categoryRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Database['public']['Tables']['suppliers']['Insert']) => 
      repositories.supplierRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Database['public']['Tables']['suppliers']['Update']> }) => 
      repositories.supplierRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.supplierRepository.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useCreateStockLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Database['public']['Tables']['stock_locations']['Insert']) => 
      repositories.stockLocationRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
    },
  })
}

export function useUpdateStockLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Database['public']['Tables']['stock_locations']['Update'] }) => 
      repositories.stockLocationRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
    },
  })
}

export function useDeactivateStockLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.stockLocationRepository.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Database['public']['Tables']['products']['Insert']) => 
      repositories.productRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      id, 
      data, 
      expectedVersion 
    }: { 
      id: string; 
      data: Database['public']['Tables']['products']['Update']; 
      expectedVersion: number 
    }) => repositories.productRepository.update(id, data, expectedVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useArchiveProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.productRepository.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useRestoreProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.productRepository.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.productRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useApplyMovement() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: Parameters<typeof repositories.movementRepository.applyMovement>[0]) => 
      repositories.movementRepository.applyMovement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useApplyTransfer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: Parameters<typeof repositories.movementRepository.applyTransfer>[0]) => 
      repositories.movementRepository.applyTransfer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useReverseMovement() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      movementId, 
      reason, 
      createdBy, 
      idempotencyKey 
    }: { 
      movementId: string; 
      reason: string; 
      createdBy: string; 
      idempotencyKey: string 
    }) => repositories.movementRepository.reverseMovement(movementId, reason, createdBy, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => repositories.notificationRepository.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ organizationId, userId }: { organizationId: string; userId?: string }) => 
      repositories.notificationRepository.markAllAsRead(organizationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: Database['public']['Tables']['settings']['Update'] }) => 
      repositories.settingsRepository.update(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useBulkImportProducts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      organizationId, 
      rows, 
      createdBy, 
      mode 
    }: { 
      organizationId: string; 
      rows: any[]; 
      createdBy: string; 
      mode: 'create_only' | 'update_by_sku' | 'both'
    }) => mutations.productMutations.bulkImport(organizationId, rows, createdBy, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}