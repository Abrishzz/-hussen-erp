import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Pos from '@/pages/Pos'
import Inventory from '@/pages/Inventory'
import Production from '@/pages/Production'
import HR from '@/pages/HR'
import Finance from '@/pages/Finance'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['owner']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute allowedRoles={['owner', 'cashier']}><Pos /></ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['owner', 'staff']}><Inventory /></ProtectedRoute>
        } />
        <Route path="/production" element={
          <ProtectedRoute allowedRoles={['owner', 'staff']}><Production /></ProtectedRoute>
        } />
        <Route path="/hr" element={
          <ProtectedRoute allowedRoles={['owner']}><HR /></ProtectedRoute>
        } />
        <Route path="/finance" element={
          <ProtectedRoute allowedRoles={['owner']}><Finance /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['owner']}><Reports /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['owner']}><Settings /></ProtectedRoute>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
