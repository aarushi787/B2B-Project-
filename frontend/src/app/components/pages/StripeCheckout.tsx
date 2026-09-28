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
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
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
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Initializing secure payment gateway...</p>
      </div>
    );
  }

  // If using a mock secret (no real stripe keys configured in backend)
  if (clientSecret === 'mock_secret') {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200">
         <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Secure Escrow Payment</h3>
            <p className="text-sm text-slate-500">Stripe Test Mode</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6">Since real Stripe API keys are not provided, click below to simulate a successful escrow deposit.</p>
        <button onClick={() => {
           toast.success('Mock funds successfully secured in Escrow!');
           onComplete();
        }} className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold">
           Simulate Escrow Deposit ($${amount.toLocaleString()})
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 max-w-md mx-auto">
      {/* Header section with Trust Indicators */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center shadow-inner border border-blue-100/50">
          <Shield className="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Secure Escrow</h3>
          <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> 256-bit Encrypted
          </p>
        </div>
      </div>
      
      {/* Stripe Elements Form */}
      <div className="mb-6">
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#4f46e5', borderRadius: '12px' } } }}>
          <CheckoutForm dealId={dealId} amount={amount} onSuccess={onComplete} />
        </Elements>
      </div>
      
      {/* Footer Trust copy */}
      <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/50 -mx-8 -mb-8 p-6 rounded-b-3xl">
        <p className="text-xs text-slate-500 text-center font-medium leading-relaxed max-w-[280px] mx-auto">
          Your funds are held securely by Stripe. They will only be released to the provider upon your explicit approval of completed milestones.
        </p>
        <div className="flex justify-center gap-3 mt-4 opacity-40 grayscale">
          {/* Mock trusted logos */}
          <div className="h-4 w-12 bg-slate-400 rounded-sm"></div>
          <div className="h-4 w-12 bg-slate-400 rounded-sm"></div>
          <div className="h-4 w-12 bg-slate-400 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}
