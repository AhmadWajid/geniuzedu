"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoadingUI() {
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch("/api/check-payment-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.status === "complete") {
          router.push("/dashboard");
        } else if (data.status === "failed") {
          router.push("/pricing");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 2000);
    return () => clearInterval(interval);
  }, [sessionId, router]);

  return <LoadingUI />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
