import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, planId, price, billing_period, success_url, cancel_url, currentSubscriptionId } = body;

    let session;
    const sessionConfig = {
      payment_method_types: ['card'],
      metadata: {
        userId,
        planId,
        billing_period
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              metadata: {
                plan: planId,
                billing: billing_period
              }
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            recurring: price > 0 ? {
              interval: billing_period === 'yearly' ? 'year' : 'month'
            } : undefined,
          },
          quantity: 1,
        },
      ],
      mode: price > 0 ? 'subscription' : 'payment',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
      client_reference_id: userId,
    };

    // If there's an existing subscription, add subscription management
    if (currentSubscriptionId) {
      sessionConfig.subscription_behavior = 'create_new';
      sessionConfig.payment_method_collection = 'always';
      sessionConfig.metadata.old_subscription_id = currentSubscriptionId;
    }

    session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}