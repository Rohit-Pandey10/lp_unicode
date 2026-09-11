# Backend Node Task 1: Order Processing System

An order-processing backend system built with Node.js and JavaScript, progressively advancing across 4 stages:

1. **Stage 1**: Synchronous JavaScript
2. **Stage 2**: Data Manipulation & Analysis (Array Methods)
3. **Stage 3**: Asynchronous Flows (Callbacks & Promises)
4. **Stage 4**: `async/await` Pipeline with Custom Error Handling

---

## 📁 Project Structure

```
unicode_task1/
├── data/
│   ├── customers.json           # Original customer dataset
│   ├── products.json            # Original product dataset
│   └── orders.json              # Original order dataset
├── package.json                 # Project scripts and metadata
├── README.md                    # Documentation
├── index.js                     # End-to-end interactive demo
├── src/
│   ├── dataLoader.js            # Reading and parsing JSON files using fs
│   ├── stage1/
│   │   ├── orderEngine.js       # Synchronous calculation engine (subtotal, discount, tax, summary)
│   │   └── index.js             # Standalone Stage 1 demo runner
│   ├── stage2/
│   │   ├── dataAnalysis.js      # Array methods (map, filter, reduce, some, every) and immutable updates
│   │   └── index.js             # Standalone Stage 2 demo runner
│   ├── stage3/
│   │   ├── orderCallbacks.js        # Callback implementations and pipeline
│   │   ├── orderPromises.js         # Promise implementations and pipeline
│   │   ├── runCallbacks.js          # Standalone runner for callback flow
│   │   └── runPromises.js           # Standalone runner for promise flow
│   └── stage4/
│       ├── asyncAwait.js        # async/await pipeline, error handling, and custom error classes
│       └── index.js             # Standalone Stage 4 demo runner
└── test/
    └── orderSystem.test.js      # Unit and integration test suite (21 passing tests)
```

---

## ⚡ Quick Start

### 1. Run the Complete Demo
```bash
npm start
```
Runs `index.js`, demonstrating every stage and scenario in the console with formatted outputs and breakdown tables.

### 2. Run the Automated Test Suite
```bash
npm test
```
Executes the native Node.js test suite across all 4 stages, validating calculations, array logic, async callback/promise flows, and error handling.

### 3. Run Individual Stages
```bash
npm run stage1            # Stage 1: Synchronous order calculations
npm run stage2            # Stage 2: Data analysis and array methods
npm run stage3:callbacks  # Stage 3: Callback flow runner
npm run stage3:promises   # Stage 3: Promise flow runner
npm run stage3            # Stage 3: Runs both callback and promise flows
npm run stage4            # Stage 4: Async/await and custom errors
```

---

## 🛠 Stage-by-Stage Implementation

### Stage 1 — Build the Order Engine (`src/stage1_orderEngine.js`)
- `calculateSubtotal(orderOrItems, products)`: Sums `product.price * item.quantity`.
- `calculateDiscount(subtotal)`:
  - `< ₹2000`: 0%
  - `₹2000–₹4999`: 5%
  - `₹5000+`: 10%
- `calculateTax(discountedSubtotal)`: Computes 18% tax on the discounted subtotal.
- `calculateTotal(orderOrSubtotal, products)`: Composes subtotal, discount, and tax without duplicate logic.
- `generateOrderSummary(order, customers, products)`: Produces a detailed breakdown with customer details, item lines, discount rate, tax, total, and status.
- `getOrderById(orderId, orders)`: Retrieves order matching `id`.
- `getOrdersByCustomer(customerId, orders)`: Filters orders by `customerId`.

### Stage 2 — Manipulate & Analyse the Data (`src/stage2_dataAnalysis.js`)
- `getAllOrderTotals(orders, products)`: Transforms orders using `map()`.
- `calculateTotalRevenue(orders, products)`: Computes total revenue using `reduce()`.
- `calculateAverageOrderValue(orders, products)`: Calculates average order value.
- `getHighestValueOrder(orders, products)`: Finds top order using `reduce()`.
- `hasHighValueOrder(orders, products, threshold)`: Evaluates order values using `some()`.
- `areAllOrdersValid(orders, customers, products)`: Validates customer existence, product existence, and positive integer quantities using `every()`.
- `updateOrder(order, updates)`: Immutably merges updates using destructuring and the spread operator (`...`) without modifying original objects or files.

### Stage 3 — Asynchronous Flows (`src/stage3/`)
Simulates backend latency with `setTimeout()`:
- **Callbacks (`orderCallbacks.js`, `runCallbacks.js`)**: Core operations `getCustomerCallback`, `getProductsCallback`, `checkStockCallback`, `processPaymentCallback`, `createOrderCallback`, and nested callback pipeline `processOrderWithCallbacks`.
- **Promises (`orderPromises.js`, `runPromises.js`)**: Promise wrappers `getCustomer`, `getProducts`, `checkStock`, `processPayment`, `createOrder`, and Promise-chain pipeline `processOrderWithPromises`.

### Stage 4 — Async/Await + Error Handling (`src/stage4_asyncAwait.js`)
- Refactored using `async function processOrder(orderIdOrPayload)`.
- Flow: `Customer → Products → Stock → Payment → Create Order`.
- Custom error hierarchy (`src/errors/customErrors.js`):
  - `OrderProcessingError` (Base)
  - `CustomerNotFoundError`
  - `ProductNotFoundError`
  - `InsufficientStockError`
  - `InvalidOrderError`
  - `PaymentFailedError`
- Implements `try / catch / finally` logging and re-throwing errors with descriptive diagnostics (never silently swallowed).
