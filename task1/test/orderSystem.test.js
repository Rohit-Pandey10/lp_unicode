const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { loadCustomers, loadProducts, loadOrders } = require('../src/dataLoader');

const {
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateTotal,
  generateOrderSummary,
  getOrderById,
  getOrdersByCustomer
} = require('../src/stage1/orderEngine');

const {
  getAllOrderTotals,
  calculateTotalRevenue,
  calculateAverageOrderValue,
  getHighestValueOrder,
  hasHighValueOrder,
  areAllOrdersValid,
  updateOrder
} = require('../src/stage2/dataAnalysis');

const {
  processOrderWithCallbacks
} = require('../src/stage3/orderCallbacks');

const {
  processOrderWithPromises
} = require('../src/stage3/orderPromises');

const {
  processOrder,
  safeProcessOrder,
  CustomerNotFoundError,
  ProductNotFoundError,
  InsufficientStockError,
  InvalidOrderError,
  PaymentFailedError
} = require('../src/stage4/asyncAwait');

const mockProducts = [
  { id: 101, name: 'Mechanical Keyboard', price: 1500, stock: 10, category: 'Accessories' },
  { id: 102, name: 'Wireless Mouse', price: 700, stock: 25, category: 'Accessories' },
  { id: 104, name: '27-inch Monitor', price: 12500, stock: 5, category: 'Display' }
];

const mockCustomers = [
  { id: 1, name: 'Rahul Shah', email: 'rahul@gmail.com', city: 'Mumbai' },
  { id: 2, name: 'Aarav Mehta', email: 'aarav@gmail.com', city: 'Pune' }
];

describe('Data Loading & Prerequisites', () => {
  test('should load customers, products, and orders JSON files correctly', () => {
    const customers = loadCustomers();
    const products = loadProducts();
    const orders = loadOrders();

    assert.ok(Array.isArray(customers) && customers.length > 0);
    assert.ok(Array.isArray(products) && products.length > 0);
    assert.ok(Array.isArray(orders) && orders.length > 0);
  });
});

describe('Stage 1 — Build the Order Engine', () => {
  test('calculateSubtotal calculates correct sum of items', () => {
    // 1 keyboard (1500) + 2 mice (700 * 2 = 1400) = 2900
    const items = [
      { productId: 101, quantity: 1 },
      { productId: 102, quantity: 2 }
    ];
    const subtotal = calculateSubtotal(items, mockProducts);
    assert.equal(subtotal, 2900);
  });

  test('calculateDiscount applies correct rules (<2000: 0%, 2000-4999: 5%, 5000+: 10%)', () => {
    // Under 2000
    assert.equal(calculateDiscount(1500), 0);
    assert.equal(calculateDiscount(1999), 0);

    // 2000 to 4999 (5%)
    assert.equal(calculateDiscount(2000), 100);
    assert.equal(calculateDiscount(3000), 150);
    assert.equal(calculateDiscount(4999), 249.95);

    // 5000+ (10%)
    assert.equal(calculateDiscount(5000), 500);
    assert.equal(calculateDiscount(10000), 1000);
  });

  test('calculateTax applies 18% on discounted subtotal', () => {
    assert.equal(calculateTax(1000), 180);
    assert.equal(calculateTax(2850), 513);
  });

  test('calculateTotal composes subtotal, discount, and tax correctly', () => {
    // Order: 1 keyboard (1500) + 2 mice (1400) = 2900
    // Discount: 5% of 2900 = 145
    // Discounted Subtotal: 2900 - 145 = 2755
    // Tax: 18% of 2755 = 495.90
    // Total: 2755 + 495.90 = 3250.90
    const items = [
      { productId: 101, quantity: 1 },
      { productId: 102, quantity: 2 }
    ];
    const total = calculateTotal({ items }, mockProducts);
    assert.equal(total, 3250.90);
  });

  test('generateOrderSummary creates complete structured summary', () => {
    const order = {
      id: 1001,
      customerId: 1,
      items: [{ productId: 101, quantity: 1 }],
      status: 'confirmed',
      paymentStatus: 'paid'
    };
    const summary = generateOrderSummary(order, mockCustomers, mockProducts);

    assert.equal(summary.orderId, 1001);
    assert.equal(summary.customer.name, 'Rahul Shah');
    assert.equal(summary.items[0].productName, 'Mechanical Keyboard');
    assert.equal(summary.subtotal, 1500);
    assert.equal(summary.discount, 0);
    assert.equal(summary.total, 1770); // 1500 + 18% tax (270)
  });

  test('getOrderById and getOrdersByCustomer retrieve matching orders', () => {
    const orders = [
      { id: 1001, customerId: 1 },
      { id: 1002, customerId: 2 },
      { id: 1003, customerId: 1 }
    ];

    assert.equal(getOrderById(1002, orders)?.id, 1002);
    assert.equal(getOrderById(9999, orders), null);

    const customer1Orders = getOrdersByCustomer(1, orders);
    assert.equal(customer1Orders.length, 2);
    assert.equal(getOrdersByCustomer(99, orders).length, 0);
  });
});

describe('Stage 2 — Manipulate & Analyse the Data', () => {
  const orders = [
    {
      id: 1001,
      customerId: 1,
      items: [{ productId: 101, quantity: 1 }] // Subtotal 1500 -> Total 1770
    },
    {
      id: 1002,
      customerId: 2,
      items: [{ productId: 104, quantity: 1 }] // Subtotal 12500 -> Discount 1250 -> DiscSub 11250 -> Tax 2025 -> Total 13275
    }
  ];

  test('getAllOrderTotals uses map() to return totals', () => {
    const totals = getAllOrderTotals(orders, mockProducts);
    assert.equal(totals.length, 2);
    assert.equal(totals[0].total, 1770);
    assert.equal(totals[1].total, 13275);
  });

  test('calculateTotalRevenue and calculateAverageOrderValue compute correct metrics', () => {
    const revenue = calculateTotalRevenue(orders, mockProducts);
    assert.equal(revenue, 1770 + 13275); // 15045

    const avg = calculateAverageOrderValue(orders, mockProducts);
    assert.equal(avg, 7522.5);
  });

  test('getHighestValueOrder returns the highest order', () => {
    const highest = getHighestValueOrder(orders, mockProducts);
    assert.equal(highest.id, 1002);
    assert.equal(highest.total, 13275);
  });

  test('hasHighValueOrder uses some() to check thresholds', () => {
    assert.equal(hasHighValueOrder(orders, mockProducts, 5000), true);
    assert.equal(hasHighValueOrder(orders, mockProducts, 20000), false);
  });

  test('areAllOrdersValid checks customers, products, and quantities', () => {
    assert.equal(areAllOrdersValid(orders, mockCustomers, mockProducts), true);

    // Invalid customer
    const badCustomerOrders = [{ id: 99, customerId: 999, items: [{ productId: 101, quantity: 1 }] }];
    assert.equal(areAllOrdersValid(badCustomerOrders, mockCustomers, mockProducts), false);

    // Invalid product
    const badProductOrders = [{ id: 99, customerId: 1, items: [{ productId: 9999, quantity: 1 }] }];
    assert.equal(areAllOrdersValid(badProductOrders, mockCustomers, mockProducts), false);

    // Invalid quantity
    const badQtyOrders = [{ id: 99, customerId: 1, items: [{ productId: 101, quantity: -2 }] }];
    assert.equal(areAllOrdersValid(badQtyOrders, mockCustomers, mockProducts), false);
  });

  test('updateOrder updates order immutably using destructuring and spread', () => {
    const original = orders[0];
    const updated = updateOrder(original, { status: 'shipped', tracking: 'ABC1234' });

    assert.notEqual(original, updated);
    assert.equal(updated.status, 'shipped');
    assert.equal(updated.tracking, 'ABC1234');
    assert.equal(original.status, undefined);
  });
});

describe('Stage 3 — Make the System Asynchronous (Callbacks & Promises)', () => {
  test('processOrderWithCallbacks successfully runs full flow with callbacks', (t, done) => {
    const orderRequest = {
      customerId: 1,
      items: [{ productId: 101, quantity: 1 }]
    };

    processOrderWithCallbacks(orderRequest, (err, createdOrder) => {
      assert.ifError(err);
      assert.ok(createdOrder.id);
      assert.equal(createdOrder.customerId, 1);
      assert.equal(createdOrder.status, 'confirmed');
      assert.equal(createdOrder.paymentStatus, 'paid');
      done();
    });
  });

  test('processOrderWithPromises successfully runs full flow with Promises', async () => {
    const orderRequest = {
      customerId: 2,
      items: [{ productId: 102, quantity: 2 }]
    };

    const order = await processOrderWithPromises(orderRequest);
    assert.ok(order.id);
    assert.equal(order.customerId, 2);
    assert.equal(order.status, 'confirmed');
    assert.equal(order.paymentStatus, 'paid');
  });
});

describe('Stage 4 — Async/Await + Error Handling', () => {
  test('processOrder processes existing pending order (1003) successfully', async () => {
    const result = await processOrder(1003);
    assert.equal(result.success, true);
    assert.equal(result.order.customerId, 3);
    assert.equal(result.order.status, 'confirmed');
    assert.equal(result.order.paymentStatus, 'paid');
    assert.ok(result.summary);
  });

  test('processOrder throws CustomerNotFoundError when customer does not exist', async () => {
    await assert.rejects(
      async () => {
        await processOrder({
          customerId: 8888,
          items: [{ productId: 101, quantity: 1 }]
        });
      },
      (err) => {
        assert.ok(err instanceof CustomerNotFoundError);
        assert.match(err.message, /Customer not found with id: 8888/);
        return true;
      }
    );
  });

  test('processOrder throws ProductNotFoundError when product does not exist', async () => {
    await assert.rejects(
      async () => {
        await processOrder({
          customerId: 1,
          items: [{ productId: 7777, quantity: 1 }]
        });
      },
      (err) => {
        assert.ok(err instanceof ProductNotFoundError);
        assert.match(err.message, /Product not found with id: 7777/);
        return true;
      }
    );
  });

  test('processOrder throws InsufficientStockError when requested quantity exceeds stock', async () => {
    await assert.rejects(
      async () => {
        await processOrder({
          customerId: 1,
          items: [{ productId: 104, quantity: 100 }] // stock is 5
        });
      },
      (err) => {
        assert.ok(err instanceof InsufficientStockError);
        assert.match(err.message, /Insufficient stock/);
        assert.equal(err.details.productId, 104);
        return true;
      }
    );
  });

  test('processOrder throws InvalidOrderError for invalid payload or non-existent orderId', async () => {
    await assert.rejects(
      async () => {
        await processOrder(99999);
      },
      (err) => {
        assert.ok(err instanceof InvalidOrderError);
        assert.match(err.message, /Order not found in database with id: 99999/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await processOrder({ customerId: 1, items: [] });
      },
      (err) => {
        assert.ok(err instanceof InvalidOrderError);
        assert.match(err.message, /non-empty items array/);
        return true;
      }
    );
  });

  test('safeProcessOrder returns structured error object without throwing', async () => {
    const failureResult = await safeProcessOrder({
      customerId: 9999,
      items: [{ productId: 101, quantity: 1 }]
    });

    assert.equal(failureResult.success, false);
    assert.equal(failureResult.error.name, 'CustomerNotFoundError');
  });
});
