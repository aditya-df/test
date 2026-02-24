'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useTrialStatus() {
  const { data: session } = useSession();
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.userType === 'TRIAL' && session.user.trialEndDate) {
      const trialEnd = new Date(session.user.trialEndDate);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      setDaysRemaining(Math.max(0, diffDays));
      
      if (diffDays <= 0) {
        setIsExpired(true);
        router.push('/trial/expired');
      }
    }
  }, [session, router]);

  return {
    isTrialUser: session?.user?.userType === 'TRIAL',
    daysRemaining,
    isExpired,
    trialEndDate: session?.user?.trialEndDate ? new Date(session.user.trialEndDate) : null,
  };
}