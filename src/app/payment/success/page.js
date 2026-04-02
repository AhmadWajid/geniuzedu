"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/firebase/config';
import { updateSubscription } from '@/lib/subscription';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595] mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Processing your payment...</h1>
        <p className="text-gray-600">Please wait while we confirm your subscription.</p>
      </div>
    </div>
  );
}

function PaymentSuccessContent() {
  const [status, setStatus] = useState('loading');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const checkPayment = async () => {
      if (!sessionId) {
        router.push('/pricing');
        return;
      }

      try {
        const response = await fetch('/api/check-payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.status === 'complete') {
          const user = auth.currentUser;
          if (user) {
            // If there was an old subscription, it will be automatically cancelled by Stripe
            await updateSubscription(
              user.uid,
              data.planId,
              data.billingPeriod,
              data.subscriptionId,
              true // Force update to override any existing subscription
            );
          }
          setStatus('success');
          setTimeout(() => router.push('/subscription'), 2000);
        } else if (data.status === 'failed') {
          setStatus('failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
      }
    };

    checkPayment();
  }, [sessionId, router]);

  if (status === 'error' || status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-4">
            {status === 'failed' ? 'Payment failed' : 'An error occurred during payment verification'}
          </p>
          <p className="text-sm text-gray-500">Redirecting to pricing page...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-green-500 text-4xl mb-4">✔️</div>
          <h1 className="text-xl font-semibold mb-2">Payment Successful</h1>
          <p className="text-gray-600">Redirecting to your subscription page...</p>
        </div>
      </div>
    );
  }

  return <LoadingFallback />;
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
