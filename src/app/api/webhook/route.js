import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateSubscription } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.NODE_ENV === 'development' 
  ? process.env.STRIPE_LOCAL_WEBHOOK_SECRET 
  : process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed:`, err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      await updateSubscription(
        session.client_reference_id, // userId
        session.metadata.planId,
        session.metadata.billing_period,
        subscription.id // Pass the Stripe subscription ID
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
