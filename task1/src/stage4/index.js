const { processOrder, safeProcessOrder } = require("./asyncAwait");

async function runStage4() {
  console.log("Processing order 1003:");
  try {
    const result = await processOrder(1003);
    console.log(
      `Order ${result.order.id} confirmed. Total: ₹${result.order.total}`,
    );
  } catch (err) {
    console.error("Order processing failed:", err.message);
  }

  console.log();
  console.log("Error handling scenarios:");

  // Customer not found
  console.log("Customer not found:");
  const res1 = await safeProcessOrder({
    customerId: 9999,
    items: [{ productId: 101, quantity: 1 }],
  });
  console.log(`${res1.error.name}: ${res1.error.message}`);

  // Product not found
  console.log();
  console.log("Product not found:");
  const res2 = await safeProcessOrder({
    customerId: 1,
    items: [{ productId: 9999, quantity: 1 }],
  });
  console.log(`${res2.error.name}: ${res2.error.message}`);

  // Insufficient stock
  console.log();
  console.log("Insufficient stock:");
  const res3 = await safeProcessOrder({
    customerId: 1,
    items: [{ productId: 104, quantity: 50 }],
  });
  console.log(`${res3.error.name}: ${res3.error.message}`);

  // Invalid order
  console.log();
  console.log("Invalid order payload:");
  const res4 = await safeProcessOrder({
    customerId: 1,
    items: [{ productId: 101, quantity: -5 }],
  });
  console.log(`${res4.error.name}: ${res4.error.message}`);

  // Non-existent order id
  console.log();
  console.log("Non-existent order id:");
  const res5 = await safeProcessOrder(9999);
  console.log(`${res5.error.name}: ${res5.error.message}`);
}

if (require.main === module) {
  runStage4().catch(console.error);
}

module.exports = { runStage4 };
