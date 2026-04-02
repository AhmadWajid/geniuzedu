import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export const createCheckoutSession = async ({ planId, price, userId, billingPeriod, currentSubscriptionId }) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        planId,
        price,
        billing_period: billingPeriod,
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/pricing`,
        currentSubscriptionId,
      }),
    });

    const { sessionId, error } = await response.json();
    
    if (error) throw new Error(error);

    const stripe = await stripePromise;
    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
    
    if (stripeError) throw new Error(stripeError.message);
    
    return { success: true };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return { error: error.message };
  }
};
