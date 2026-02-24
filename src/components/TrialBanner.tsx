'use client';

import { useTrialStatus } from '@/hooks/useTrialStatus';

export default function TrialBanner() {
  const { isTrialUser, daysRemaining } = useTrialStatus();

  if (!isTrialUser) {
    return null;
  }

  const isExpiringSoon = daysRemaining <= 3;

  return (
    <div className={`p-3 text-center text-sm font-medium ${
      isExpiringSoon 
        ? 'bg-red-100 text-red-800 border-b border-red-200' 
        : 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
    }`}>
      <div className="flex items-center justify-center space-x-4">
        <span>
          {isExpiringSoon ? '⚠️' : 'ℹ️'} Trial Mode: {daysRemaining} days remaining
        </span>
        {/* <button
          onClick={() => router.push('/pricing')}
          className={`px-3 py-1 rounded text-xs font-semibold ${
            isExpiringSoon
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          Upgrade Now
        </button> */}
      </div>
    </div>
  );
}