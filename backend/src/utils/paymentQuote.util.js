const PAYMENT_PLANS = ["deposit_30", "full_100"];

const normalizePaymentPlan = (plan) =>
  PAYMENT_PLANS.includes(plan) ? plan : "deposit_30";

const roundVnd = (value) => Math.max(0, Math.round(Number(value) || 0));

const calculatePaymentQuote = (plan, totalPrice) => {
  const normalizedPlan = normalizePaymentPlan(plan);
  const base = roundVnd(totalPrice);

  if (normalizedPlan === "full_100") {
    const discount = roundVnd(base * 0.1);
    return {
      plan: normalizedPlan,
      base,
      discount,
      payNow: roundVnd(base - discount),
      remaining: 0,
    };
  }

  const payNow = roundVnd(base * 0.3);
  return {
    plan: normalizedPlan,
    base,
    discount: 0,
    payNow,
    remaining: roundVnd(base - payNow),
  };
};

module.exports = {
  PAYMENT_PLANS,
  normalizePaymentPlan,
  calculatePaymentQuote,
};
