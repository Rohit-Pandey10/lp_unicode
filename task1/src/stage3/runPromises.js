const { processOrderWithPromises } = require("./orderPromises");

function runPromises() {
  console.log("Testing promise flow:");
  const promiseReq = {
    customerId: 3,
    items: [
      { productId: 105, quantity: 1 },
      { productId: 101, quantity: 1 },
    ],
  };

  return processOrderWithPromises(promiseReq)
    .then((order) => {
      console.log(
        `Promise flow completed. Order ID: ${order.id}, Total: ₹${order.total}`,
      );
      return order;
    })
    .catch((err) => {
      console.error("Promise flow failed:", err.message);
      throw err;
    });
}

if (require.main === module) {
  runPromises().catch(console.error);
}

module.exports = { runPromises };
