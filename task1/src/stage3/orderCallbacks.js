const { loadCustomers, loadProducts, loadOrders } = require("../dataLoader");
const { calculateTotal } = require("../stage1/orderEngine");

const defaultCustomers = loadCustomers();
const defaultProducts = loadProducts();
const defaultOrders = loadOrders();

const DEFAULT_LATENCY_MS = 50;

function getCustomerCallback(
  customerId,
  callback,
  latency = DEFAULT_LATENCY_MS,
) {
  setTimeout(() => {
    const customer = defaultCustomers.find((c) => c.id === customerId);
    if (!customer) {
      const err = new Error(`Customer not found with id: ${customerId}`);
      err.customerId = customerId;
      return callback(err);
    }
    callback(null, customer);
  }, latency);
}

function getProductsCallback(items, callback, latency = DEFAULT_LATENCY_MS) {
  setTimeout(() => {
    if (!Array.isArray(items) || items.length === 0) {
      return callback(new Error("Items must be a non-empty array"));
    }

    const matchedProducts = [];
    for (const item of items) {
      const product = defaultProducts.find((p) => p.id === item.productId);
      if (!product) {
        const err = new Error(`Product not found with id: ${item.productId}`);
        err.productId = item.productId;
        return callback(err);
      }
      matchedProducts.push({
        ...product,
        requestedQuantity: item.quantity,
      });
    }

    callback(null, matchedProducts);
  }, latency);
}

function checkStockCallback(
  productsWithQuantity,
  callback,
  latency = DEFAULT_LATENCY_MS,
) {
  setTimeout(() => {
    for (const item of productsWithQuantity) {
      if (item.stock < item.requestedQuantity) {
        const err = new Error(
          `Insufficient stock for "${item.name}" (ID: ${item.id}). Requested: ${item.requestedQuantity}, Available: ${item.stock}`,
        );
        err.productId = item.id;
        err.productName = item.name;
        err.requestedQuantity = item.requestedQuantity;
        err.availableStock = item.stock;
        return callback(err);
      }
    }
    callback(null, true);
  }, latency);
}

function processPaymentCallback(
  paymentDetails,
  callback,
  latency = DEFAULT_LATENCY_MS,
) {
  setTimeout(() => {
    const { amount, customerId } = paymentDetails;
    if (typeof amount !== "number" || amount <= 0) {
      const err = new Error("Payment amount must be greater than 0");
      err.amount = amount;
      return callback(err);
    }

    const transaction = {
      transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      customerId,
      amount: Number(amount.toFixed(2)),
      status: "paid",
      processedAt: new Date().toISOString(),
    };

    callback(null, transaction);
  }, latency);
}

function createOrderCallback(
  orderData,
  callback,
  latency = DEFAULT_LATENCY_MS,
) {
  setTimeout(() => {
    const newOrderId =
      orderData.id ||
      1000 + defaultOrders.length + Math.floor(Math.random() * 1000) + 1;
    const createdOrder = {
      id: newOrderId,
      customerId: orderData.customer.id,
      items: orderData.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      total: orderData.total,
      status: "confirmed",
      paymentStatus: "paid",
      transactionId: orderData.payment.transactionId,
      createdAt: new Date().toISOString(),
    };

    callback(null, createdOrder);
  }, latency);
}

function processOrderWithCallbacks(orderRequest, callback) {
  getCustomerCallback(orderRequest.customerId, (err, customer) => {
    if (err) return callback(err);

    getProductsCallback(orderRequest.items, (err, productsWithQty) => {
      if (err) return callback(err);

      checkStockCallback(productsWithQty, (err) => {
        if (err) return callback(err);

        const total = calculateTotal(orderRequest, defaultProducts);

        processPaymentCallback(
          { amount: total, customerId: customer.id },
          (err, payment) => {
            if (err) return callback(err);

            createOrderCallback(
              {
                id: orderRequest.id,
                customer,
                items: orderRequest.items,
                total,
                payment,
              },
              (err, createdOrder) => {
                if (err) return callback(err);
                callback(null, createdOrder);
              },
            );
          },
        );
      });
    });
  });
}

module.exports = {
  getCustomerCallback,
  getProductsCallback,
  checkStockCallback,
  processPaymentCallback,
  createOrderCallback,
  processOrderWithCallbacks,
};
