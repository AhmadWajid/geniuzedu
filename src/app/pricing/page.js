"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase/config";
import { createCheckoutSession } from '@/lib/stripe';
import { checkSubscription, updateSubscription } from '@/lib/subscription';

export default function PricePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          const subscriptionStatus = await checkSubscription(currentUser.uid);
          if (subscriptionStatus.isSubscribed) {
            setUserSubscription({
              planId: subscriptionStatus.plan,
              billing: subscriptionStatus.billing,
              expiryDate: subscriptionStatus.expiryDate,
              cancelAtPeriodEnd: subscriptionStatus.cancelAtPeriodEnd,
              stripeSubscriptionId: subscriptionStatus.stripeSubscriptionId
            });
            setIsYearly(subscriptionStatus.billing === "yearly");
          }
        } catch (error) {
          console.error("Error fetching subscription:", error);
        }
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Define pricing plans
  const pricingPlans = [
    {
      id: "basic",
      name: "Basic",
      description: "A free tier for light usage or to get acquainted with the platform.",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        {
          category: "Document Processing",
          items: [
            "Process up to 2 PDFs or TXT files each week",
            "20MB max file size",
            "1 lecture recording per month"
          ]
        },
        {
          category: "AI Features",
          items: [
            "Smart summaries, flashcards, notes & tests"
          ]
        },
        {
          category: "Chat & Analysis",
          items: [
            "3 messages per day (extra messages: $0.02 each)",
            "1 area selection per week (extra selections: $0.05 each)",
            "1 standard voice generation per month"
          ]
        }
      ],
      color: "#58B595"
    },
    {
      id: "premium",
      name: "Premium",
      popular: true,
      description: "A balanced plan for everyday users who need more flexibility.",
      monthlyPrice: 4.99,
      yearlyPrice: 49.99,
      features: [
        {
          category: "Document Processing",
          items: [
            "Process up to 10 PDFs or YouTube videos each week",
            "30MB max file size",
            "10 lecture recordings per month"
          ]
        },
        {
          category: "AI Features",
          items: [
            "Everything from Basic + upgraded voice options"
          ]
        },
        {
          category: "Chat & Analysis",
          items: [
            "30 messages per day (extra messages: $0.02 each)",
            "15 area selections per week (extra selections: $0.05 each)",
            "5 standard + 2 premium voice generations per month"
          ]
        }
      ],
      color: "#e68a30"
    },
    {
      id: "promax",
      name: "Beyond",
      description: "Ideal for power users or professionals seeking top-tier capabilities.",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      features: [
        {
          category: "Document Processing",
          items: [
            "Unlimited PDFs or YouTube videos",
            "40MB max file size",
            "45 lecture recordings per month"
          ]
        },
        {
          category: "AI Features",
          items: [
            "Everything from Premium + priority support and faster processing"
          ]
        },
        {
          category: "Chat & Analysis",
          items: [
            "Unlimited messages",
            "50 area selections per week (extra selections: $0.05 each)",
            "15 standard + 7 premium voice generations per month"
          ]
        }
      ],
      color: "#4A7C7B"
    }
  ];

  const handleSubscribe = async (plan) => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is trying to downgrade while having an active paid subscription
    if (userSubscription?.planId && 
        (userSubscription.planId === 'premium' || userSubscription.planId === 'promax') &&
        plan.id === 'basic') {
      if (userSubscription.cancelAtPeriodEnd) {
        alert('You already have an active paid subscription until ' + 
              new Date(userSubscription.expiryDate).toLocaleDateString() + 
              '. Please wait until your current subscription ends.');
      } else {
        alert('Please cancel your current subscription first before switching to the free plan.');
      }
      return;
    }

    // Prevent unnecessary plan changes
    if (userSubscription?.planId === plan.id) {
      alert('You are already on this plan.');
      return;
    }

    // Ask for confirmation when upgrading from a cancelled subscription
    if (userSubscription?.cancelAtPeriodEnd) {
      const confirm = window.confirm(
        'You have a subscription that will end on ' + 
        new Date(userSubscription.expiryDate).toLocaleDateString() + 
        '. Switching plans now will end your current subscription immediately. Do you want to continue?'
      );
      if (!confirm) return;
    }

    const billingPeriod = isYearly ? 'yearly' : 'monthly';

    try {
      // For free plan, update subscription directly
      if (plan.id === 'basic') {
        const { success, error } = await updateSubscription(
          user.uid,
          plan.id,
          billingPeriod
        );

        if (!success) {
          throw new Error(error || 'Failed to update subscription');
        }
        
        router.push('/dashboard');
        return;
      }

      // For paid plans, handle checkout
      if (plan.id !== 'basic') {
        const { error: checkoutError } = await createCheckoutSession({
          planId: plan.id,
          price: isYearly ? plan.yearlyPrice : plan.monthlyPrice,
          userId: user.uid,
          billingPeriod,
          currentSubscriptionId: userSubscription?.stripeSubscriptionId
        });

        if (checkoutError) {
          throw new Error(checkoutError);
        }
        return;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    }
  };

  const getSubscriptionButtonProps = (plan) => {
    const isCurrentPlan = userSubscription?.planId === plan.id;
    const hasActivePaidPlan = userSubscription?.planId && 
      (userSubscription.planId === 'premium' || userSubscription.planId === 'promax');
    const isCancelled = userSubscription?.cancelAtPeriodEnd;

    let buttonText = "Subscribe";
    let isDisabled = false;
    let tooltipText = "";

    if (isCurrentPlan) {
      buttonText = "Current Plan";
      isDisabled = true;
    } else if (plan.id === 'basic') {
      buttonText = "Get Started Free";
      if (hasActivePaidPlan) {
        isDisabled = true;
        tooltipText = isCancelled 
          ? "Wait for current subscription to end"
          : "Cancel current subscription first";
      }
    }

    return { buttonText, isDisabled, tooltipText };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
        <div className="w-16 h-16 border-4 border-[#58b595] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Loading pricing options...</p>
        <div className="mt-8 w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      <main className="container mx-auto px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 relative inline-block">
              Simple, Transparent Pricing
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-[#58b595] transform -rotate-1"></div>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the perfect plan for your needs. All plans include core features.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center space-x-3">
              <span className={`text-sm ${!isYearly ? "font-bold text-gray-900" : "text-gray-500"}`}>
                Monthly
              </span>
              <button 
                onClick={() => setIsYearly(!isYearly)}
                className="relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#58b595] focus:ring-offset-2"
                role="switch"
                aria-checked={isYearly}
              >
                <span 
                  aria-hidden="true" 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isYearly ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
              <span className={`text-sm ${isYearly ? "font-bold text-gray-900" : "text-gray-500"}`}>
                Yearly <span className="text-xs text-[#e68a30] ml-1">Save up to $20</span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white border-2 ${
                  plan.popular 
                    ? "border-[#e68a30] relative transform scale-105 md:scale-105 z-10" 
                    : "border-[#58b595]"
                } rounded-lg overflow-hidden transition-transform hover:scale-105`}
              >
                <div 
                  className="p-1"
                  style={{ backgroundColor: plan.color + "22" }}
                >
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  </div>
                </div>
                
                <div className="px-4 pt-3 pb-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-500 h-12 min-h-[3rem] line-clamp-2 mb-2">{plan.description}</p>
                    <div className="mt-3 flex items-baseline justify-center">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {plan.monthlyPrice === 0 && !isYearly ? "Free" : `$${isYearly ? plan.yearlyPrice : plan.monthlyPrice}`}
                      </span>
                      {(plan.monthlyPrice > 0 || isYearly) && (
                        <span className="ml-1 text-sm text-gray-500">
                          {isYearly ? "/year" : "/month"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {plan.features.map((featureGroup, groupIndex) => (
                      <div key={groupIndex}>
                        <h4 className="font-semibold text-gray-800 text-sm mb-1 border-b border-gray-200 pb-1">
                          {featureGroup.category}
                        </h4>
                        <ul className="space-y-0.5">
                          {featureGroup.items.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <svg className="text-[#58b595] w-4 h-4 mr-1 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-gray-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={getSubscriptionButtonProps(plan).isDisabled}
                      className={`w-full px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:rotate-1 ${
                        getSubscriptionButtonProps(plan).isDisabled
                          ? "bg-gray-400 cursor-not-allowed"
                          : plan.id === "basic"
                          ? "bg-[#58b595] hover:bg-[#48a585] focus:ring-[#58b595]"
                          : plan.popular
                          ? "bg-[#e68a30] hover:bg-[#d87920] focus:ring-[#e68a30]"
                          : "bg-[#4A7C7B] hover:bg-[#3a6c6b] focus:ring-[#4A7C7B]"
                      }`}
                    >
                      {getSubscriptionButtonProps(plan).buttonText}
                    </button>
                    {getSubscriptionButtonProps(plan).tooltipText && (
                      <div className="absolute -bottom-8 left-0 right-0 text-xs text-red-500 text-center">
                        {getSubscriptionButtonProps(plan).tooltipText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-16 bg-white p-6 border-2 border-[#58b595] relative">
            <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 transform -rotate-2">
              <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
            </div>

            <div className="mt-6 pt-2 grid gap-6 md:grid-cols-2">
              <div className="bg-[#fbfbf8] p-5 border-l-4 border-[#58b595]">
                <h3 className="font-bold text-lg text-gray-900">Can I change plans later?</h3>
                <p className="mt-2 text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes will be applied at the start of your next billing cycle.
                </p>
              </div>
              
              <div className="bg-[#fbfbf8] p-5 border-l-4 border-[#58b595]">
                <h3 className="font-bold text-lg text-gray-900">Is there a free trial?</h3>
                <p className="mt-2 text-gray-600">
                  Yes, you can try our Basic plan features for free for 7 days before committing to a subscription.
                </p>
              </div>
              
              <div className="bg-[#fbfbf8] p-5 border-l-4 border-[#58b595]">
                <h3 className="font-bold text-lg text-gray-900">What payment methods do you accept?</h3>
                <p className="mt-2 text-gray-600">
                  We accept all major credit cards, including Visa, Mastercard, American Express, and Discover.
                </p>
              </div>
              
              <div className="bg-[#fbfbf8] p-5 border-l-4 border-[#58b595]">
                <h3 className="font-bold text-lg text-gray-900">Can I cancel anytime?</h3>
                <p className="mt-2 text-gray-600">
                  Absolutely! You can cancel your subscription at any time from your account settings page.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Need help choosing the right plan?</h2>
            <p className="text-gray-600 mb-6">Contact our team for personalized recommendations.</p>
            <button className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              Contact Sales
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}