"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import { checkSubscription, cancelSubscription, checkExpiredSubscription } from "@/lib/subscription";

const SubscriptionInfo = ({ label, children, className = "" }) => (
  <div className={className}>
    <span className="text-sm text-gray-500 block">{label}</span>
    {children}
  </div>
);

const planDetails = {
  basic: {
    name: "Basic Plan",
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  premium: {
    name: "Premium Plan",
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
  },
  promax: {
    name: "Beyond Plan",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
  },
};

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadSubscription = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        await checkExpiredSubscription(user.uid);
        const data = await checkSubscription(user.uid);
        setSubscription(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [router]);

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const user = auth.currentUser;
      const result = await cancelSubscription(user.uid, subscription.stripeSubscriptionId);
      
      if (result.success) {
        setSubscription(prev => ({
          ...prev,
          cancelAtPeriodEnd: true,
          cancelAt: result.cancelAt
        }));
      } else {
        alert('Failed to cancel subscription: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while cancelling the subscription');
    } finally {
      setCancelling(false);
    }
  };

  const getSubscriptionStatus = (subscription) => {
    if (!subscription?.isSubscribed) return 'Free Plan';
    if (subscription?.status === 'cancelled' || subscription?.cancelAtPeriodEnd) return 'Cancelled';
    return 'Active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Cancelled': return 'bg-red-500';
      case 'Active': return 'bg-green-500';
      default: return 'bg-yellow-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595]"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan ? planDetails[subscription.plan] : planDetails.basic;
  const price = subscription?.billing === 'yearly' 
    ? currentPlan.yearlyPrice 
    : currentPlan.monthlyPrice;

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      <main className="container mx-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 relative inline-block">
              Your Subscription
              <div className="absolute -bottom-1 left-0 w-full h-1 bg-[#58b595] transform -rotate-1"></div>
            </h1>
          </div>

          <div className="bg-white border-2 border-[#58b595] rounded-lg p-6">
            <div className="grid gap-6">
              <SubscriptionInfo label="Current Plan">
                <span className="text-2xl font-bold text-gray-900">
                  {currentPlan.name}
                </span>
              </SubscriptionInfo>
              
              <SubscriptionInfo label="Status">
                <div className="flex items-center">
                  <span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusColor(getSubscriptionStatus(subscription))}`}></span>
                  <span className="text-gray-900 capitalize">
                    {getSubscriptionStatus(subscription)}
                  </span>
                </div>
              </SubscriptionInfo>
              
              {subscription?.isSubscribed && (
                <>
                  <SubscriptionInfo label="Billing Cycle">
                    <span className="text-gray-900 capitalize">
                      {subscription.billing || 'Monthly'}
                    </span>
                  </SubscriptionInfo>

                  <SubscriptionInfo label="Price">
                    <span className="text-xl font-medium text-gray-900">
                      ${price} / {subscription.billing === 'yearly' ? 'year' : 'month'}
                    </span>
                  </SubscriptionInfo>

                  <SubscriptionInfo label="Next Billing Date">
                    <span className="text-gray-900">
                      {subscription.expiryDate?.toLocaleDateString() || 'N/A'}
                    </span>
                  </SubscriptionInfo>
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
              <button 
                onClick={() => router.push('/pricing')}
                className="w-full px-4 py-2 bg-[#58b595] text-white hover:bg-[#48a585] rounded-lg transition-colors"
              >
                {subscription?.isSubscribed ? 'Change Plan' : 'Upgrade Plan'}
              </button>

              {subscription?.isSubscribed && 
               subscription.planId !== 'basic' && 
               !subscription.cancelAtPeriodEnd && (
                <button 
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="w-full px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="text-center space-y-2">
                  <p className="text-red-500 font-medium">
                    Subscription Cancelled
                  </p>
                  <p className="text-sm text-gray-500">
                    Access will end on {new Date(subscription.cancelAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}