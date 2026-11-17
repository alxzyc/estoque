'use client'

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { MainLayout } from '@/components/layout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { LocationsPage } from '@/features/locations/LocationsPage'
import { MovementsPage } from '@/features/movements/MovementsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { UsersPage } from '@/features/users/UsersPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUser({ ...user, ...profile })
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser({ ...session.user, ...profile })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout user={user}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/locations" element={<LocationsPage />} />
                  <Route path="/movements" element={<MovementsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </QueryClientProvider>
  )
}