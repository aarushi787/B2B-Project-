import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Shield, Lock, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Initialize Stripe (Replace with your actual public key)
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

const CheckoutForm = ({ dealId, amount, onSuccess }: { dealId: string, amount: number, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    
    // In a real app, confirm the payment here
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required' // For SPA without redirecting
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setLoading(false);
    } else {
      toast.success('Funds successfully secured in Escrow!');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PaymentElement />
      <button
        disabled={!stripe || loading}
        style={{
          width: "100%",
          padding: "14px",
          background: "linear-gradient(to right, #4f46e5, #9333ea)",
          color: "white",
          borderRadius: 12,
          fontWeight: 700,
          boxShadow: "0 10px 15px -3px rgba(147,51,234,0.2), 0 4px 6px -4px rgba(147,51,234,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "none",
          cursor: (!stripe || loading) ? "not-allowed" : "pointer",
          opacity: (!stripe || loading) ? 0.5 : 1,
          transition: "all 0.2s"
        }}
      >
        {loading ? <Loader2 size={20} /> : <Lock size={20} />}
        {loading ? 'Processing...' : `Fund Escrow ($${amount.toLocaleString()})`}
      </button>
    </form>
  );
};

export default function StripeCheckout({ dealId, amount, onComplete }: { dealId: string, amount: number, onComplete: () => void }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Fetch Intent from backend
    fetch('http://localhost:5000/api/payments/create-escrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, dealId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          // Fallback if Stripe backend is mocked
          setClientSecret('mock_secret'); 
        }
      })
      .catch(err => {
        console.error('Error fetching secret:', err);
        setClientSecret('mock_secret'); // Fallback for demo
      });
  }, [amount, dealId]);

  if (!clientSecret) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <Loader2 size={32} style={{ color: "#a855f7", marginBottom: 16 }} />
        <p style={{ color: "#64748b", fontWeight: 500, margin: 0 }}>Initializing secure payment gateway...</p>
      </div>
    );
  }

  // If using a mock secret (no real stripe keys configured in backend)
  if (clientSecret === 'mock_secret') {
    return (
      <div style={{ padding: 24, backgroundColor: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
         <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={20} style={{ color: "#2563eb" }} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>Secure Escrow Payment</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Stripe Test Mode</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 24, lineHeight: 1.5 }}>Since real Stripe API keys are not provided, click below to simulate a successful escrow deposit.</p>
        <button onClick={() => {
           toast.success('Mock funds successfully secured in Escrow!');
           onComplete();
        }} style={{ width: "100%", padding: "14px", background: "linear-gradient(to right, #4f46e5, #9333ea)", color: "white", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
           Simulate Escrow Deposit ($${amount.toLocaleString()})
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: 24, border: "1px solid #e2e8f0", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", padding: 32, maxWidth: 448, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Header section with Trust Indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(to top right, #eff6ff, #e0e7ff)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(219,234,254,0.5)" }}>
          <Shield size={28} style={{ color: "#2563eb" }} />
        </div>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.025em" }}>Secure Escrow</h3>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={14} /> 256-bit Encrypted
          </p>
        </div>
      </div>
      
      {/* Stripe Elements Form */}
      <div style={{ marginBottom: 24 }}>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5', borderRadius: '12px' } } }}>
          <CheckoutForm dealId={dealId} amount={amount} onSuccess={onComplete} />
        </Elements>
      </div>
      
      {/* Footer Trust copy */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #f1f5f9", backgroundColor: "rgba(248,250,252,0.5)", margin: "0 -32px -32px", padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 500, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Your funds are held securely by Stripe. They will only be released to the provider upon your explicit approval of completed milestones.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, opacity: 0.4, filter: "grayscale(100%)" }}>
          {/* Mock trusted logos */}
          <div style={{ height: 16, width: 48, backgroundColor: "#94a3b8", borderRadius: 2 }}></div>
          <div style={{ height: 16, width: 48, backgroundColor: "#94a3b8", borderRadius: 2 }}></div>
          <div style={{ height: 16, width: 48, backgroundColor: "#94a3b8", borderRadius: 2 }}></div>
        </div>
      </div>
    </div>
  );
}
