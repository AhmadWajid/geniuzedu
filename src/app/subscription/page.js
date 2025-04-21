"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase/config";
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function SubscriptionPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pricingPlans, setPricingPlans] = useState([]);
  const [isYearly, setIsYearly] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        await fetchUserData(currentUser.uid);
      } else {
        router.push('/');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserData = async (userId) => {
    try {
      // Fetch user subscription data
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSubscription(userData.subscription);
        setIsYearly(userData.subscription?.billing === "yearly");
        
        // Fetch billing history
        const billingRef = collection(db, "users", userId, "billing_history");
        const billingQuery = query(billingRef, orderBy("date", "desc"), limit(5));
        const billingSnapshot = await getDocs(billingQuery);
        
        const history = [];
        billingSnapshot.forEach(doc => {
          history.push({ id: doc.id, ...doc.data() });
        });
        setBillingHistory(history);
      }

      // Fetch available pricing plans
      // For simplicity, we're using the same plans defined in the pricing page
      // In a real app, you'd fetch these from your backend/database
      setPricingPlans([
        {
          id: "standard",
          name: "Standard",
          description: "Great for regular users who need more features",
          monthlyPrice: 9.99,
          yearlyPrice: 99.99,
          features: [
            "30 document uploads per month",
            "Advanced AI analysis",
            "20 AI questions per document",
            "Priority email support",
            "Document history (30 days)"
          ],
          color: "#58B595" // Your main green
        },
        {
          id: "pro",
          name: "Pro",
          popular: true,
          description: "Best value for professionals and educators",
          monthlyPrice: 19.99,
          yearlyPrice: 199.99,
          features: [
            "100 document uploads per month",
            "Premium AI analysis",
            "Unlimited AI questions",
            "Priority support",
            "Document history (90 days)",
            "Advanced document analytics",
            "Team sharing (up to 3 users)"
          ],
          color: "#e68a30" // Your accent orange
        },
        {
          id: "business",
          name: "Business",
          description: "Perfect for small teams and businesses",
          monthlyPrice: 49.99,
          yearlyPrice: 499.99,
          features: [
            "500 document uploads per month",
            "Enterprise-grade AI analysis",
            "Unlimited AI questions",
            "24/7 priority support",
            "Unlimited document history",
            "Advanced analytics & reporting",
            "Team sharing (up to 10 users)",
            "API access"
          ],
          color: "#4A7C7B" // Teal
        }
      ]);
      
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleChangePlan = async (newPlan) => {
    if (!user || processing) return;
    
    setProcessing(true);
    
    try {
      // Create a checkout session for changing the plan
      const docRef = await addDoc(collection(db, "users", user.uid, "checkout_sessions"), {
        price: newPlan.id,
        success_url: window.location.origin + "/subscription?success=true",
        cancel_url: window.location.origin + "/subscription?canceled=true",
        mode: "subscription",
        billing_period: isYearly ? "yearly" : "monthly",
        action: "update" // Indicate this is an update to an existing subscription
      });

      // Wait for the CheckoutSession to get attached by the extension
      onSnapshot(doc(db, "users", user.uid, "checkout_sessions", docRef.id), async (snap) => {
        const { sessionId } = snap.data();
        if (sessionId) {
          // We have a session, redirect to Checkout
          const stripe = await stripePromise;
          stripe.redirectToCheckout({ sessionId });
        }
      });

    } catch (error) {
      console.error("Error changing subscription plan:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || processing) return;
    
    setProcessing(true);
    
    try {
      // Cancel the subscription
      await updateDoc(doc(db, "users", user.uid), {
        "subscription.status": "canceled",
        "subscription.cancelReason": cancelReason,
        "subscription.canceledAt": new Date()
      });

      // In a real implementation, you'd also need to cancel the subscription with Stripe
      // This would typically be done through a Cloud Function or API endpoint

      alert("Your subscription has been canceled. It will remain active until the end of your current billing period.");
      setShowCancelModal(false);
      
      // Refresh subscription data
      fetchUserData(user.uid);
      
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleBillingCycle = async () => {
    if (!user || processing || !subscription) return;
    
    setProcessing(true);
    
    try {
      // Create a checkout session for changing the billing cycle
      const currentPlan = pricingPlans.find(plan => plan.id === subscription.plan);
      if (!currentPlan) throw new Error("Current plan not found");

      const newBillingPeriod = isYearly ? "monthly" : "yearly";
      
      const docRef = await addDoc(collection(db, "users", user.uid, "checkout_sessions"), {
        price: currentPlan.id,
        success_url: window.location.origin + "/subscription?success=true",
        cancel_url: window.location.origin + "/subscription?canceled=true",
        mode: "subscription",
        billing_period: newBillingPeriod,
        action: "update"
      });

      onSnapshot(doc(db, "users", user.uid, "checkout_sessions", docRef.id), async (snap) => {
        const { sessionId } = snap.data();
        if (sessionId) {
          const stripe = await stripePromise;
          stripe.redirectToCheckout({ sessionId });
        }
      });

    } catch (error) {
      console.error("Error changing billing cycle:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58b595]"></div>
      </div>
    );
  }

  const currentPlan = subscription ? pricingPlans.find(plan => plan.id === subscription.plan) : null;

  return (
    <div className="min-h-screen bg-[#f8f7f2] ">
      <main className="container mx-auto px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900  mb-2 relative inline-block">
              Manage Your Subscription
              <div className="absolute -bottom-1 left-0 w-full h-1 bg-[#58b595] transform -rotate-1"></div>
            </h1>
            <p className="text-gray-600 ">
              View and manage your current subscription, billing details, and payment history.
            </p>
          </div>

          {subscription ? (
            <>
              {/* Current Subscription Card */}
              <div className="bg-white   border-2 border-[#58b595] rounded-lg p-6 mb-8 sketchy-box">
                <h2 className="text-xl font-bold text-gray-900  mb-4">Current Subscription</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Plan</span>
                      <span className="text-lg font-medium text-gray-900 ">{subscription.name}</span>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Status</span>
                      <div className="flex items-center">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          subscription.status === 'active' ? 'bg-green-500' :
                          subscription.status === 'canceled' ? 'bg-red-500' : 'bg-yellow-500'
                        } mr-2`}></span>
                        <span className="text-gray-900  capitalize">{subscription.status}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Billing Cycle</span>
                      <span className="text-gray-900  capitalize">{subscription.billing}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Price</span>
                      <span className="text-lg font-medium text-gray-900 ">
                        ${subscription.price.toFixed(2)} / {subscription.billing === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Start Date</span>
                      <span className="text-gray-900 ">{formatDate(subscription.startDate)}</span>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-sm text-gray-500  block">Next Billing Date</span>
                      <span className="text-gray-900 ">{formatDate(subscription.nextBillingDate)}</span>
                    </div>
                  </div>
                </div>
                
                {subscription.status !== 'canceled' ? (
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 border-2 border-red-500 text-red-500 hover:bg-red-50 focus:ring-2 focus:ring-red-200 rounded"
                      disabled={processing}
                    >
                      Cancel Subscription
                    </button>
                    
                    <button
                      onClick={toggleBillingCycle}
                      className="px-4 py-2 border-2 border-[#58b595] text-[#58b595] hover:bg-[#58b595] hover:text-white focus:ring-2 focus:ring-[#58b595] rounded"
                      disabled={processing}
                    >
                      Switch to {isYearly ? 'Monthly' : 'Yearly'} Billing
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-red-50  border border-red-100 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">
                      Your subscription has been canceled and will end on {formatDate(subscription.endDate)}.
                    </p>
                    
                    <button
                      onClick={() => router.push('/pricing')}
                      className="mt-2 px-4 py-2 bg-[#58b595] text-white hover:bg-[#48a585] rounded"
                    >
                      Resubscribe
                    </button>
                  </div>
                )}
              </div>

              {/* Billing History */}
              <div className="bg-white   border-2 border-[#58b595] rounded-lg p-6 mb-8 sketchy-box">
                <h2 className="text-xl font-bold text-gray-900  mb-4">Billing History</h2>
                
                {billingHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50  ">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white  divide-y divide-gray-200 dark:divide-gray-800">
                        {billingHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">{formatDate(item.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">${item.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                item.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 ">No billing history available.</p>
                )}
              </div>

              {/* Change Plan */}
              {subscription.status !== 'canceled' && (
                <div className="bg-white   border-2 border-[#58b595] rounded-lg p-6 mb-8 sketchy-box">
                  <h2 className="text-xl font-bold text-gray-900  mb-4">Change Plan</h2>
                  
                  <div className="mb-6 flex items-center justify-center space-x-3">
                    <span className={`text-sm ${!isYearly ? "font-bold text-gray-900 " : "text-gray-500 "}`}>
                      Monthly
                    </span>
                    <button 
                      onClick={() => setIsYearly(!isYearly)}
                      className="relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#58b595] focus:ring-offset-2  "
                      role="switch"
                      aria-checked={isYearly}
                    >
                      <span 
                        aria-hidden="true" 
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isYearly ? "translate-x-6" : "translate-x-0"}`}
                      />
                    </button>
                    <span className={`text-sm ${isYearly ? "font-bold text-gray-900 " : "text-gray-500 "}`}>
                      Yearly <span className="text-xs text-[#e68a30] ml-1">Save 15-20%</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pricingPlans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-4 border-2 rounded-lg ${
                          plan.id === subscription.plan 
                            ? 'border-[#e68a30] bg-[#e68a30]/10 ' 
                            : 'border-gray-200 '
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 ">{plan.name}</h3>
                            <p className="text-xs text-gray-500 ">${isYearly ? plan.yearlyPrice : plan.monthlyPrice} / {isYearly ? 'year' : 'month'}</p>
                          </div>
                          
                          {plan.id === subscription.plan && (
                            <span className="bg-[#e68a30] text-white text-xs px-2 py-1 rounded">Current</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleChangePlan(plan)}
                          disabled={processing || plan.id === subscription.plan}
                          className={`w-full mt-2 px-3 py-1.5 text-sm rounded ${
                            plan.id === subscription.plan
                              ? 'bg-gray-200 text-gray-500   cursor-not-allowed'
                              : 'bg-[#58b595] text-white hover:bg-[#48a585]'
                          }`}
                        >
                          {plan.id === subscription.plan ? 'Current Plan' : 'Switch to this plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white   border-2 border-[#58b595] rounded-lg sketchy-box">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400  mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900  mb-2">No Active Subscription</h2>
              <p className="text-gray-600  mb-6">You don't have an active subscription. Subscribe to one of our plans to access premium features.</p>
              <button 
                onClick={() => router.push('/pricing')}
                className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#48a585] rounded sketchy-button transform hover:rotate-1"
              >
                View Pricing Plans
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white   rounded-lg p-6 max-w-md w-full sketchy-box border-2 border-[#58b595]">
            <h3 className="text-xl font-bold text-gray-900  mb-4">Cancel Your Subscription</h3>
            
            <p className="text-gray-600  mb-4">
              We're sorry to see you go. Your subscription will remain active until the end of your current billing period.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 text-gray-700  mb-1">
                Please tell us why you're canceling (optional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-[#58b595] focus:border-[#58b595] bg-white "
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-200   text-gray-800  rounded hover:bg-gray-300 "
                disabled={processing}
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sketchy-box {
          border-radius: 8px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.05);
          position: relative;
        }
        
        .sketchy-button {
          border-radius: 4px;
          position: relative;
          overflow: visible;
        }
        
        .sketchy-button:after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
          z-index: -1;
        }
      `}</style>
    </div>
  );
}
