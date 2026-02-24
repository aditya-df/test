import * as React from 'react'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export default async function OnboardingLayout({ children }: OnboardingLayoutProps): Promise<React.ReactElement> {
  return (
    <div className="flex  h-auto min-h-screen w-full items-center justify-center">
      <div className="max-sm:w-full max-sm:max-w-[340px] max-sm:px-10">{children}</div>
    </div>
  )
}
