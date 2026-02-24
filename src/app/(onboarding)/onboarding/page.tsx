"use client"

import React from 'react'
import Step from '@/components/onboarding/Step'
import PersonalInfo from '@/components/onboarding/sections/PersonalInfo'
import CompanyInfo from '@/components/onboarding/sections/CompanyInfo'
import useStore from '@/stores/onboarding/useStore'
import TOSOnboarding from '@/components/onboarding/sections/Tos-Onboarding'

export default function Home() {
  const { step } = useStore((state) => state);

  return (
    <main className="bg-background">
      <section className="relative h-[172px] w-full bg-[url('/images/bg-sidebar-mobile.svg')] bg-no-repeat bg-cover lg:hidden">
        <div className="flex justify-center pt-[37px] pb-[34px]">
          <Step stepNumber={1} />
          <Step stepNumber={2} />
          <Step stepNumber={3} />
          {/* <Step stepNumber={4} /> */}
        </div>
      </section>
      {step === 1 && <PersonalInfo />}
      {step === 2 && <CompanyInfo />}
      {step === 3 && <TOSOnboarding />}
      {/* {step === 4 && <Summary />} */}
    </main>
  );
}
