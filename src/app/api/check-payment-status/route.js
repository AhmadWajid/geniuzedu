import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 66) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Clean up session ID
    const cleanSessionId = sessionId.split('?')[0];

    console.log('Checking session:', cleanSessionId);

    const session = await stripe.checkout.sessions.retrieve(cleanSessionId, {
      expand: ['payment_intent', 'subscription']
    });

    console.log('Session status:', session.status); // Debug log
    console.log('Payment status:', session.payment_status); // Debug log

    if (session.payment_status === 'paid' && session.status === 'complete') {
      return NextResponse.json({
        status: 'complete',
        planId: session.metadata?.planId,
        billingPeriod: session.metadata?.billing_period,
        customerId: session.customer,
        subscriptionId: session.subscription // Just pass the subscription ID
      });
    } else if (session.status === 'expired') {
      return NextResponse.json({ status: 'failed' });
    }

    return NextResponse.json({ status: 'processing' });

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      type: error.type
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to check payment status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
