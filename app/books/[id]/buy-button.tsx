"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/app/actions/payments";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

function loadCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BuyButton({
  bookId,
  priceInr,
  isLoggedIn,
  label,
}: {
  bookId: string;
  priceInr: number;
  isLoggedIn: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    setPending(true);

    const scriptLoaded = await loadCheckoutScript();
    if (!scriptLoaded || !window.Razorpay) {
      setError("Couldn't load the payment window. Check your connection and try again.");
      setPending(false);
      return;
    }

    const order = await createRazorpayOrder(bookId);
    if ("error" in order) {
      setError(order.error);
      setPending(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Margin Notes",
      description: order.bookTitle,
      order_id: order.orderId,
      theme: { color: "#d4522a" },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        const result = await verifyRazorpayPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        if ("error" in result) {
          setError(result.error);
          setPending(false);
          return;
        }
        setPending(false);
        router.refresh();
      },
      modal: {
        ondismiss: () => {
          setPending(false);
          setError("Payment cancelled — you haven't been charged.");
        },
      },
    });

    rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
      setError(response.error?.description || "Payment failed. Please try again.");
      setPending(false);
    });

    rzp.open();
  }

  return (
    <div>
      <button className="btn btn-primary" type="button" onClick={handleBuy} disabled={pending}>
        {pending ? "Processing…" : label || `Buy Now — ₹${priceInr}`}
      </button>
      {error && (
        <div className="form-error" style={{ marginTop: ".6rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
