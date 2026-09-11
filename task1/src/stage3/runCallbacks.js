const { processOrderWithCallbacks } = require("./orderCallbacks");

function runCallbacks() {
  console.log("Testing callback flow:");
  return new Promise((resolve, reject) => {
    const newOrderReq = {
      customerId: 2,
      items: [
        { productId: 102, quantity: 1 },
        { productId: 103, quantity: 1 },
      ],
    };

    processOrderWithCallbacks(newOrderReq, (err, createdOrder) => {
      if (err) {
        console.error("Callback error:", err.message);
        return reject(err);
      }
      console.log(
        `Callback flow completed. Order ID: ${createdOrder.id}, Total: ₹${createdOrder.total}`,
      );
      resolve(createdOrder);
    });
  });
}

if (require.main === module) {
  runCallbacks().catch(console.error);
}

module.exports = { runCallbacks };
