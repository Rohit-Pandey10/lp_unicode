const { loadCustomers, loadProducts, loadOrders } = require("../dataLoader");
const defaultCustomers = loadCustomers();
const defaultProducts = loadProducts();
const defaultOrders = loadOrders();

const calculateSubtotal = (orderOrItems, products = defaultProducts) => {
  const items = Array.isArray(orderOrItems)
    ? orderOrItems
    : orderOrItems?.items;
  if (!items || !Array.isArray(items)) {
    return 0;
  }

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new Error(`Product not found with id: ${item.productId}`);
    }
    return sum + product.price * item.quantity;
  }, 0);

  return Number(subtotal.toFixed(2));
};

const calculateDiscount = (subtotal) => {
  if (typeof subtotal !== "number" || subtotal < 0) {
    return 0;
  }

  if (subtotal < 2000) {
    return 0;
  } else if (subtotal < 5000) {
    return Number((subtotal * 0.05).toFixed(2));
  } else {
    return Number((subtotal * 0.1).toFixed(2));
  }
};

const calculateTax = (discountedSubtotal) => {
  if (typeof discountedSubtotal !== "number" || discountedSubtotal < 0) {
    return 0;
  }
  return Number((discountedSubtotal * 0.18).toFixed(2));
};

const calculateTotal = (orderOrSubtotal, products = defaultProducts) => {
  const subtotal =
    typeof orderOrSubtotal === "number"
      ? orderOrSubtotal
      : calculateSubtotal(orderOrSubtotal, products);

  const discount = calculateDiscount(subtotal);
  const discountedSubtotal = Number((subtotal - discount).toFixed(2));
  const tax = calculateTax(discountedSubtotal);
  const total = Number((discountedSubtotal + tax).toFixed(2));

  return total;
};

const calculateBreakdown = (order, products = defaultProducts) => {
  const subtotal = calculateSubtotal(order, products);
  const discount = calculateDiscount(subtotal);
  const discountedSubtotal = Number((subtotal - discount).toFixed(2));
  const tax = calculateTax(discountedSubtotal);
  const total = calculateTotal(order, products);

  let discountRate = "0%";
  if (subtotal >= 5000) {
    discountRate = "10%";
  } else if (subtotal >= 2000) {
    discountRate = "5%";
  }

  return {
    subtotal,
    discount,
    discountRate,
    discountedSubtotal,
    tax,
    taxRate: "18%",
    total,
  };
};

const generateOrderSummary = (
  order,
  customers = defaultCustomers,
  products = defaultProducts,
) => {
  const customer = customers.find((c) => c.id === order.customerId) || null;
  const breakdown = calculateBreakdown(order, products);

  const itemDetails = (order.items || []).map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const unitPrice = product ? product.price : 0;
    const itemTotal = unitPrice * item.quantity;
    return {
      productId: item.productId,
      productName: product ? product.name : "Unknown Product",
      category: product ? product.category : "N/A",
      unitPrice,
      quantity: item.quantity,
      itemTotal: Number(itemTotal.toFixed(2)),
    };
  });

  return {
    orderId: order.id,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          city: customer.city,
        }
      : null,
    items: itemDetails,
    ...breakdown,
    status: order.status,
    paymentStatus: order.paymentStatus,
  };
};

const getOrderById = (orderId, orders = defaultOrders) => {
  return orders.find((order) => order.id === orderId) || null;
};

const getOrdersByCustomer = (customerId, orders = defaultOrders) => {
  return orders.filter((order) => order.customerId === customerId);
};

module.exports = {
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateTotal,
  calculateBreakdown,
  generateOrderSummary,
  getOrderById,
  getOrdersByCustomer,
};
