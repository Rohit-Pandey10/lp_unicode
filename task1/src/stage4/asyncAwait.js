const { loadCustomers, loadProducts, loadOrders } = require("../dataLoader");
const {
  calculateTotal,
  generateOrderSummary,
} = require("../stage1/orderEngine");
const {
  getCustomer,
  getProducts,
  checkStock,
  processPayment,
  createOrder,
} = require("../stage3/orderPromises");

const defaultCustomers = loadCustomers();
const defaultProducts = loadProducts();
const defaultOrders = loadOrders();

class OrderProcessingError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class CustomerNotFoundError extends OrderProcessingError {
  constructor(customerId) {
    super(`Customer not found with id: ${customerId}`, { customerId });
  }
}

class ProductNotFoundError extends OrderProcessingError {
  constructor(productId) {
    super(`Product not found with id: ${productId}`, { productId });
  }
}

class InsufficientStockError extends OrderProcessingError {
  constructor(productId, productName, requestedQuantity, availableStock) {
    super(
      `Insufficient stock for "${productName}" (ID: ${productId}). Requested: ${requestedQuantity}, Available: ${availableStock}`,
      { productId, productName, requestedQuantity, availableStock },
    );
  }
}

class InvalidOrderError extends OrderProcessingError {
  constructor(message, details = {}) {
    super(`Invalid order: ${message}`, details);
  }
}

class PaymentFailedError extends OrderProcessingError {
  constructor(reason, amount) {
    super(`Payment failed: ${reason}`, { reason, amount });
  }
}

function validateOrderPayload(order) {
  if (!order || typeof order !== "object") {
    throw new InvalidOrderError("Order payload must be an object");
  }

  if (order.customerId === undefined || order.customerId === null) {
    throw new InvalidOrderError("Order must specify a customerId", { order });
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new InvalidOrderError("Order must contain a non-empty items array", {
      order,
    });
  }

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if (!item || typeof item !== "object") {
      throw new InvalidOrderError(`Item at index ${i} is not a valid object`, {
        index: i,
      });
    }
    if (item.productId === undefined || item.productId === null) {
      throw new InvalidOrderError(`Item at index ${i} is missing productId`, {
        item,
      });
    }
    if (
      typeof item.quantity !== "number" ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      throw new InvalidOrderError(
        `Item at index ${i} has invalid quantity (${item.quantity}). Quantity must be a positive integer.`,
        { item },
      );
    }
  }
}

async function processOrder(orderIdOrPayload) {
  let orderData;

  if (
    typeof orderIdOrPayload === "number" ||
    typeof orderIdOrPayload === "string"
  ) {
    const existingOrder = defaultOrders.find(
      (o) => o.id === Number(orderIdOrPayload),
    );
    if (!existingOrder) {
      throw new InvalidOrderError(
        `Order not found in database with id: ${orderIdOrPayload}`,
        {
          orderId: orderIdOrPayload,
        },
      );
    }
    orderData = existingOrder;
  } else if (
    typeof orderIdOrPayload === "object" &&
    orderIdOrPayload !== null
  ) {
    orderData = orderIdOrPayload;
  } else {
    throw new InvalidOrderError(
      "Invalid parameter passed to processOrder. Expected orderId or order object.",
    );
  }

  validateOrderPayload(orderData);

  let customer;
  try {
    customer = await getCustomer(orderData.customerId);
  } catch (err) {
    throw new CustomerNotFoundError(orderData.customerId);
  }

  let productsWithQty;
  try {
    productsWithQty = await getProducts(orderData.items);
  } catch (err) {
    throw new ProductNotFoundError(err.productId || "unknown");
  }

  try {
    await checkStock(productsWithQty);
  } catch (err) {
    throw new InsufficientStockError(
      err.productId,
      err.productName,
      err.requestedQuantity,
      err.availableStock,
    );
  }

  const total = calculateTotal(orderData, defaultProducts);
  let payment;
  try {
    payment = await processPayment({
      customerId: customer.id,
      amount: total,
      orderId: orderData.id,
    });
  } catch (err) {
    throw new PaymentFailedError(err.message, total);
  }

  const createdOrder = await createOrder({
    id: orderData.id,
    customer,
    items: orderData.items,
    total,
    payment,
  });

  const summary = generateOrderSummary(
    createdOrder,
    defaultCustomers,
    defaultProducts,
  );

  return {
    success: true,
    order: createdOrder,
    summary,
  };
}

async function safeProcessOrder(orderIdOrPayload) {
  try {
    const result = await processOrder(orderIdOrPayload);
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      error: {
        name: error.name || "Error",
        message: error.message,
        details: error.details || null,
      },
    };
  }
}

module.exports = {
  processOrder,
  safeProcessOrder,
  validateOrderPayload,
  OrderProcessingError,
  CustomerNotFoundError,
  ProductNotFoundError,
  InsufficientStockError,
  InvalidOrderError,
  PaymentFailedError,
};
