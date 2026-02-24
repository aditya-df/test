import * as React from 'react'



export default async function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex h-auto min-h-screen w-full items-center justify-center">
      <div className="max-sm:flex  max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:rounded-none max-sm:border-none sm:min-w-[370px] sm:max-w-[368px]">
      <div className="max-sm:w-full max-sm:max-w-[340px] max-sm:px-10">{children}</div>
      </div>
  </div>
  )
}
