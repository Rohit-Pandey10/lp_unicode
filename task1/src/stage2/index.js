const { loadCustomers, loadProducts, loadOrders } = require("../dataLoader");
const {
  getAllOrderTotals,
  calculateTotalRevenue,
  calculateAverageOrderValue,
  getHighestValueOrder,
  hasHighValueOrder,
  areAllOrdersValid,
  updateOrder,
} = require("./dataAnalysis");

function runStage2() {
  const customers = loadCustomers();
  const products = loadProducts();
  const orders = loadOrders();

  console.log("All Order Totals:");
  const allTotals = getAllOrderTotals(orders, products);
  console.table(allTotals);

  console.log("Total Revenue: ₹" + calculateTotalRevenue(orders, products));
  console.log(
    "Average Order Value: ₹" + calculateAverageOrderValue(orders, products),
  );

  const highest = getHighestValueOrder(orders, products);
  console.log(`Highest Value Order: Order #${highest.id} (₹${highest.total})`);

  console.log("Has Order >= ₹5000:", hasHighValueOrder(orders, products, 5000));
  console.log(
    "Has Order >= ₹50000:",
    hasHighValueOrder(orders, products, 50000),
  );
  console.log(
    "Are All Orders Valid:",
    areAllOrdersValid(orders, customers, products),
  );

  console.log();
  console.log("Immutable Order Update:");
  const originalOrder = orders[0];
  const updated = updateOrder(originalOrder, { status: "delivered" });
  console.log(`Original order status: ${originalOrder.status}`);
  console.log(`Updated order status: ${updated.status}`);
  console.log(
    `Is original object unchanged? ${originalOrder !== updated && originalOrder.status === "confirmed"}`,
  );
}

if (require.main === module) {
  runStage2();
}

module.exports = { runStage2 };
