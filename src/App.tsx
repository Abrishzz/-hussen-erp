import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/toaster'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Pos from '@/pages/Pos'
import MySales from '@/pages/MySales'
import Products from '@/pages/Products'
import Inventory from '@/pages/Inventory'
import Production from '@/pages/Production'
import HR from '@/pages/HR'
import Finance from '@/pages/Finance'
import Reports from '@/pages/Reports'
import StaffReport from '@/pages/StaffReport'
import Users from '@/pages/Users'
import Branches from '@/pages/Branches'
import BranchReport from '@/pages/BranchReport'
import Distribution from '@/pages/Distribution'
import CashClose from '@/pages/CashClose'
import Settings from '@/pages/Settings'
import CustomerOrders from '@/pages/CustomerOrders'
import OwnerOrders from '@/pages/OwnerOrders'
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
      <Route path="/order" element={<CustomerOrders />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/pos" element={
          <ProtectedRoute allowedRoles={['owner', 'cashier']}><Pos /></ProtectedRoute>
        } />
        <Route path="/my-sales" element={
          <ProtectedRoute allowedRoles={['owner', 'cashier']}><MySales /></ProtectedRoute>
        } />
        <Route path="/owner/orders" element={
          <ProtectedRoute allowedRoles={['owner']}><OwnerOrders /></ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute allowedRoles={['owner']}><Products /></ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['owner', 'staff']}><Inventory /></ProtectedRoute>
        } />
        <Route path="/production" element={
          <ProtectedRoute allowedRoles={['owner', 'staff', 'manager']}><Production /></ProtectedRoute>
        } />
        <Route path="/hr" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><HR /></ProtectedRoute>
        } />
        <Route path="/finance" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><Finance /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><Reports /></ProtectedRoute>
        } />
        <Route path="/staff-report" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><StaffReport /></ProtectedRoute>
        } />
        <Route path="/distribution" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><Distribution /></ProtectedRoute>
        } />
        <Route path="/cash-close" element={
          <ProtectedRoute allowedRoles={['owner', 'manager', 'cashier']}><CashClose /></ProtectedRoute>
        } />
        <Route path="/branch-report" element={
          <ProtectedRoute allowedRoles={['owner', 'manager']}><BranchReport /></ProtectedRoute>
        } />
        <Route path="/branches" element={
          <ProtectedRoute allowedRoles={['owner']}><Branches /></ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['owner']}><Users /></ProtectedRoute>
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
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
