'use client'

import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';

export default function ThankYou() {
  const [countdown, setCountdown] = useState(10)
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCount) => prevCount - 1)
    }, 1000)

    const redirect = setTimeout(async () => {
      // await signOut({ redirect: false })
      router.push('/dashboard')
    }, 10000)

    return () => {
      clearInterval(timer)
      clearTimeout(redirect)
    }
  }, [router])

  return (
    <section className="flex flex-col items-center justify-center h-full text-center">
      <div className="relative w-14 h-14 mb-6">
        <Image src="/images/icon-thank-you.svg" alt="checkmark inside a circle" fill />
      </div>
      <h3 className="text-2xl lg:text-[32px] text-c-primary-marine-blue mb-[9px]">Thank you!</h3>
      <p className="text-c-neutral-cool-gray text-base mb-4">

          <b>Thank you for joining KnowgenAI!</b> <br/> 
          We value your trust in our platform. If you ever need assistance, <br/> 
          please don&apos;t hesitate to contact our support team at support@metrodata.co.id
      </p>
      <p className="text-c-primary-marine-blue">Redirecting to dashboard in {countdown} seconds...</p>
    </section>
  )
}