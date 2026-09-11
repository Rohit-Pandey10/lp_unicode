const { loadCustomers, loadProducts, loadOrders } = require('../dataLoader');
const {
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateTotal,
  generateOrderSummary,
  getOrderById,
  getOrdersByCustomer
} = require('./orderEngine');

function runStage1() {
  const customers = loadCustomers();
  const products = loadProducts();
  const orders = loadOrders();

  const sampleOrder = orders[0];
  console.log(`Order ${sampleOrder.id} (Customer: ${sampleOrder.customerId})`);

  const subtotal = calculateSubtotal(sampleOrder, products);
  const discount = calculateDiscount(subtotal);
  const discountedSubtotal = subtotal - discount;
  const tax = calculateTax(discountedSubtotal);
  const total = calculateTotal(sampleOrder, products);

  console.log(`Subtotal: ₹${subtotal}`);
  console.log(`Discount: ₹${discount}`);
  console.log(`Discounted Subtotal: ₹${discountedSubtotal}`);
  console.log(`Tax (18%): ₹${tax}`);
  console.log(`Total: ₹${total}`);

  console.log();
  console.log('Order Summary:');
  const summary = generateOrderSummary(sampleOrder, customers, products);
  console.dir(summary, { depth: null, colors: true });

  console.log();
  console.log('Helper Lookups:');
  console.log('getOrderById(1002):', getOrderById(1002, orders)?.id ? 'Found' : 'Not Found');
  console.log('getOrdersByCustomer(1): Found', getOrdersByCustomer(1, orders).length, 'order(s)');
}

if (require.main === module) {
  runStage1();
}

module.exports = { runStage1 };