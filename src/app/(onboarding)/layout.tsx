import * as React from "react"

interface LandingAllLayoutProps {
  children: React.ReactNode
}

export default function LandingAllLayout({
  children,
}: LandingAllLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col overflow-hidden">
      <main className="flex-1">{children}</main>
    </div>
  )
}
