import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia',
});

// Create a PaymentIntent for holding funds in Escrow
router.post('/create-escrow', async (req, res) => {
  try {
    const { amount, dealId } = req.body;

    // Platform fee is 5%
    const platformFee = Math.round(amount * 0.05);
    const transferAmount = amount - platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses cents
      currency: 'usd',
      payment_method_types: ['card'],
      capture_method: 'manual', // Hold the funds (Escrow), don't capture immediately
      metadata: {
        dealId,
        type: 'escrow_hold'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      escrowAmount: amount,
      platformFee,
      providerPayout: transferAmount,
      status: 'requires_payment_method'
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: 'Failed to create escrow hold' });
  }
});

// Release funds when milestone is approved
router.post('/release-escrow', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Capture the funds that were held in escrow
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    res.json({ success: true, paymentIntent });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: 'Failed to release funds' });
  }
});

export default router;
