import * as React from "react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-auto h-screen w-full items-stretch justify-center">
      {children}
    </div>
  )
}