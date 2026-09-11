const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

function readJsonFile(filename) {
  let filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, filename);
  }

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    throw new Error(
      `Failed to load ${filename} from ${filePath}: ${error.message}`,
    );
  }
}

function loadCustomers() {
  return readJsonFile("customers.json");
}

function loadProducts() {
  return readJsonFile("products.json");
}

function loadOrders() {
  return readJsonFile("orders.json");
}

function loadAllData() {
  return {
    customers: loadCustomers(),
    products: loadProducts(),
    orders: loadOrders(),
  };
}

module.exports = {
  loadCustomers,
  loadProducts,
  loadOrders,
  loadAllData,
};
