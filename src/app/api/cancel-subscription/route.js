import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAt: subscription.cancel_at,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({ 
        success: false,
        message: 'Invalid subscription ID',
        error: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message 
    }, { status: 500 });
  }
}
