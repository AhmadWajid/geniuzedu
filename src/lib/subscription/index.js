import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export const checkSubscription = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { isSubscribed: false };
    }

    const userData = userDoc.data();
    const subscription = userData.subscription;

    if (!subscription) {
      return { isSubscribed: false };
    }

    // Check if subscription is active and not expired
    const now = new Date();
    const expiryDate = subscription.expiryDate?.toDate();
    
    return {
      isSubscribed: expiryDate ? now < expiryDate : false,
      plan: subscription.planId,
      expiryDate: expiryDate,
      billing: subscription.billing,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelAt: subscription.cancelAt?.toDate()
    };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { isSubscribed: false, error: error.message };
  }
};

export const updateSubscription = async (userId, planId, billing, stripeSubscriptionId = null, force = false) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    // Check existing subscription only if not forced
    if (!force && userDoc.exists()) {
      const currentSub = userDoc.data().subscription;
      if (currentSub && 
          (currentSub.planId === 'premium' || currentSub.planId === 'promax') &&
          planId === 'basic' &&
          !currentSub.cancelAtPeriodEnd) {
        throw new Error('Cannot downgrade to basic while having an active paid subscription');
      }
    }

    // Calculate expiry date based on billing cycle
    const now = new Date();
    const expiryDate = new Date(now);
    if (billing === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscriptionData = {
      planId,
      billing,
      startDate: now,
      expiryDate,
      status: 'active',
      stripeSubscriptionId: stripeSubscriptionId?.id || stripeSubscriptionId,
      cancelAtPeriodEnd: false,
      cancelAt: null
    };

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        subscription: subscriptionData,
        createdAt: now,
        updatedAt: now
      });
    } else {
      await updateDoc(userRef, {
        subscription: subscriptionData,
        updatedAt: now
      });
    }

    return { success: true, subscription: subscriptionData };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return { success: false, error: error.message };
  }
};

export const cancelSubscription = async (userId, stripeSubscriptionId) => {
  if (!stripeSubscriptionId) {
    throw new Error('Subscription ID is required');
  }

  try {
    // Call the cancel subscription API
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId: stripeSubscriptionId }),
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);

    // Update the subscription status in Firebase
    const userRef = doc(db, "users", userId);
    const cancelAt = new Date(data.cancelAt * 1000);
    
    await updateDoc(userRef, {
      'subscription.cancelAtPeriodEnd': true,
      'subscription.cancelAt': cancelAt,
      'subscription.status': 'cancelled',
      updatedAt: new Date()
    });

    return { 
      success: true, 
      cancelAt,
      status: 'cancelled'
    };
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return { success: false, error: error.message };
  }
};

export const checkExpiredSubscription = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const subscription = userData.subscription;

    if (!subscription) return;

    const now = new Date();
    const expiryDate = subscription.expiryDate?.toDate();

    // If subscription has expired, reset to basic plan
    if (expiryDate && now >= expiryDate) {
      await updateDoc(userRef, {
        subscription: {
          planId: 'basic',
          status: 'inactive',
          updatedAt: now
        }
      });
    }
  } catch (error) {
    console.error("Error checking expired subscription:", error);
  }
};
