import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('error');
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey, {
      // Leave apiVersion unset so it follows your Stripe account default.
      // You can pin this later if you want strict versioning.
      typescript: true,
    });
  }

  return stripeSingleton;
}

