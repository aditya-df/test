'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function TrialExpired() {
  const router = useRouter();

  useEffect(() => {
    // Sign out the expired trial user
    signOut({ redirect: false });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Trial Period Expired
        </h1>
        <p className="text-gray-600 mb-6">
          Your trial period has ended. To continue using our platform, please upgrade to a paid plan.
        </p>
        <div className="space-y-3">
          {/* <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
          >
            View Pricing Plans
          </button> */}
          <button
            onClick={() => router.push('/signin')}
            className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
          >
            Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
}