import { Router, raw } from "express";
import Stripe from "stripe";
import { prisma } from "../../prisma";
import { config } from "../../config";

const router = Router();
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

// Stripe webhook must receive the raw body. Mounted before express.json in index.ts.
router.post("/stripe", raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !config.stripe.webhookSecret) {
    return res.status(503).send("Stripe not configured");
  }
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({
      where: { gatewayReference: intent.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }
  res.json({ received: true });
});

export default router;
