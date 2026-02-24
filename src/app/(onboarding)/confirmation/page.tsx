"use client"

import React from 'react'
import ThankYou from '@/components/onboarding/sections/ThankYou';

export default function Home() {
  return (
    <main className="bg-background rounded-xl shadow-xs">
      <section className="flex h-[172px] bg-[url('/images/bg-sidebar-mobile.svg')] bg-no-repeat bg-cover rounded-t-xl">
        <div className="flex justify-center">
        </div>
      </section>
      <div className='p-6'>
        <ThankYou/>
      </div>
    </main>
  );
}
