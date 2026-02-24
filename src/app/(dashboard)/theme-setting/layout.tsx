import * as React from "react"
import { redirect } from "next/navigation"

import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults"
import { auth } from "@/auth.config"

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default async function DashboardLayout({
    children,
}: DashboardLayoutProps) {
    const session = await auth()
    if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT)

    return <div>{children}</div>
}