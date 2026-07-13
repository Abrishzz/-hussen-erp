import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { BottomTabBar } from './BottomTabBar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-16 lg:pb-0">
        <Navbar />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
