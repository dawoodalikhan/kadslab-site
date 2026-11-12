// Public tools on KADS Lab. Price and quota shown on the page; the real
// charge comes from the Stripe price (STRIPE_PRICE_ID) and the real quota
// from ADS_MONTHLY_QUOTA in wrangler.jsonc. Keep all three in step.
export const AD_TOOL = {
  name: 'AI Ad Generator',
  price: '$19',
  period: 'month',
  monthlyAds: 100,
  freeAds: 2,
};
