import React from 'react'
import { Sidebar } from '../ui/sidebar'

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return <Sidebar>{children}</Sidebar>
}
