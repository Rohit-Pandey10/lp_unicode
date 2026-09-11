const { loadCustomers, loadProducts, loadOrders } = require("../dataLoader");
const { calculateTotal } = require("../stage1/orderEngine");

const defaultCustomers = loadCustomers();
const defaultProducts = loadProducts();
const defaultOrders = loadOrders();

const getAllOrderTotals = (
  orders = defaultOrders,
  products = defaultProducts,
) => {
  return orders.map((order) => {
    const { id, customerId } = order;
    const total = calculateTotal(order, products);
    return {
      orderId: id,
      customerId,
      total,
    };
  });
};

const calculateTotalRevenue = (
  orders = defaultOrders,
  products = defaultProducts,
) => {
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + calculateTotal(order, products);
  }, 0);

  return Number(totalRevenue.toFixed(2));
};

const calculateAverageOrderValue = (
  orders = defaultOrders,
  products = defaultProducts,
) => {
  if (!orders || orders.length === 0) {
    return 0;
  }
  const totalRevenue = calculateTotalRevenue(orders, products);
  return Number((totalRevenue / orders.length).toFixed(2));
};

const getHighestValueOrder = (
  orders = defaultOrders,
  products = defaultProducts,
) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  const highest = orders.reduce((maxOrder, currentOrder) => {
    const currentTotal = calculateTotal(currentOrder, products);
    const maxTotal = calculateTotal(maxOrder, products);
    return currentTotal > maxTotal ? currentOrder : maxOrder;
  });

  return {
    ...highest,
    total: calculateTotal(highest, products),
  };
};

const hasHighValueOrder = (
  orders = defaultOrders,
  products = defaultProducts,
  threshold = 5000,
) => {
  return orders.some((order) => calculateTotal(order, products) >= threshold);
};

const validateOrder = (
  order,
  customers = defaultCustomers,
  products = defaultProducts,
) => {
  if (!order || typeof order !== "object") {
    return { isValid: false, reason: "Order must be an object" };
  }

  const customerExists = customers.some((c) => c.id === order.customerId);
  if (!customerExists) {
    return {
      isValid: false,
      reason: `Customer ID ${order.customerId} does not exist`,
    };
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return {
      isValid: false,
      reason: "Order must contain a non-empty items array",
    };
  }

  for (const item of order.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return {
        isValid: false,
        reason: `Product ID ${item.productId} does not exist`,
      };
    }
    if (
      typeof item.quantity !== "number" ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      return {
        isValid: false,
        reason: `Quantity for product ID ${item.productId} must be a positive integer`,
      };
    }
  }

  return { isValid: true };
};

const areAllOrdersValid = (
  orders = defaultOrders,
  customers = defaultCustomers,
  products = defaultProducts,
) => {
  if (!orders || orders.length === 0) {
    return false;
  }

  return orders.every((order) => {
    const { customerId, items } = order;
    const customerExists = customers.some((c) => c.id === customerId);
    if (!customerExists) return false;

    if (!Array.isArray(items) || items.length === 0) return false;

    return items.every((item) => {
      const { productId, quantity } = item;
      const productExists = products.some((p) => p.id === productId);
      const isQuantityValid =
        typeof quantity === "number" &&
        quantity > 0 &&
        Number.isInteger(quantity);
      return productExists && isQuantityValid;
    });
  });
};

const updateOrder = (order, updates) => {
  const { items: newItems, ...otherUpdates } = updates;

  return {
    ...order,
    ...otherUpdates,
    ...(newItems ? { items: newItems.map((item) => ({ ...item })) } : {}),
  };
};

module.exports = {
  getAllOrderTotals,
  calculateTotalRevenue,
  calculateAverageOrderValue,
  getHighestValueOrder,
  hasHighValueOrder,
  validateOrder,
  areAllOrdersValid,
  updateOrder,
};
