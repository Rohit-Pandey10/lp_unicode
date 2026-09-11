const { loadProducts } = require("../dataLoader");
const { calculateTotal } = require("../stage1/orderEngine");
const {
  getCustomerCallback,
  getProductsCallback,
  checkStockCallback,
  processPaymentCallback,
  createOrderCallback,
} = require("./orderCallbacks");

const defaultProducts = loadProducts();
const DEFAULT_LATENCY_MS = 50;

function getCustomer(customerId, latency = DEFAULT_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    getCustomerCallback(
      customerId,
      (err, customer) => {
        if (err) return reject(err);
        resolve(customer);
      },
      latency,
    );
  });
}

function getProducts(items, latency = DEFAULT_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    getProductsCallback(
      items,
      (err, products) => {
        if (err) return reject(err);
        resolve(products);
      },
      latency,
    );
  });
}

function checkStock(productsWithQuantity, latency = DEFAULT_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    checkStockCallback(
      productsWithQuantity,
      (err, inStock) => {
        if (err) return reject(err);
        resolve(inStock);
      },
      latency,
    );
  });
}

function processPayment(paymentDetails, latency = DEFAULT_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    processPaymentCallback(
      paymentDetails,
      (err, transaction) => {
        if (err) return reject(err);
        resolve(transaction);
      },
      latency,
    );
  });
}

function createOrder(orderData, latency = DEFAULT_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    createOrderCallback(
      orderData,
      (err, order) => {
        if (err) return reject(err);
        resolve(order);
      },
      latency,
    );
  });
}

function processOrderWithPromises(orderRequest) {
  return getCustomer(orderRequest.customerId)
    .then((customer) => {
      return getProducts(orderRequest.items).then((productsWithQty) => ({
        customer,
        productsWithQty,
      }));
    })
    .then(({ customer, productsWithQty }) => {
      return checkStock(productsWithQty).then(() => ({
        customer,
        productsWithQty,
      }));
    })
    .then(({ customer, productsWithQty }) => {
      const total = calculateTotal(orderRequest, defaultProducts);
      return processPayment({ amount: total, customerId: customer.id }).then(
        (payment) => ({ customer, productsWithQty, total, payment }),
      );
    })
    .then(({ customer, total, payment }) => {
      return createOrder({
        id: orderRequest.id,
        customer,
        items: orderRequest.items,
        total,
        payment,
      });
    });
}

module.exports = {
  getCustomer,
  getProducts,
  checkStock,
  processPayment,
  createOrder,
  processOrderWithPromises,
};
