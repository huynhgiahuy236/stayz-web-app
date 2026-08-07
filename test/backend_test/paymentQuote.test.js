const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculatePaymentQuote,
  normalizePaymentPlan,
} = require("../src/utils/paymentQuote.util");

test("deposit plan charges 30 percent and leaves 70 percent", () => {
  assert.deepEqual(calculatePaymentQuote("deposit_30", 10000), {
    plan: "deposit_30",
    base: 10000,
    discount: 0,
    payNow: 3000,
    remaining: 7000,
  });
});

test("full plan applies the 10 percent discount", () => {
  assert.deepEqual(calculatePaymentQuote("full_100", 10000), {
    plan: "full_100",
    base: 10000,
    discount: 1000,
    payNow: 9000,
    remaining: 0,
  });
});

test("VND values are rounded consistently", () => {
  assert.deepEqual(calculatePaymentQuote("deposit_30", 10001), {
    plan: "deposit_30",
    base: 10001,
    discount: 0,
    payNow: 3000,
    remaining: 7001,
  });
});

test("unknown plans safely default to deposit", () => {
  assert.equal(normalizePaymentPlan("unknown"), "deposit_30");
});
