# Express Backend: Authentication & Auction Management API (Task 2 & Task 3)

Express and MongoDB backend featuring **Authentication API (Task 2)** with bcrypt password hashing, short-lived access tokens, refresh tokens, protected profile access, and best-effort email notifications via Nodemailer, combined with **Auction Management, Media Uploads & Server-Side Logging (Task 3)** with Role-Based Access Control (RBAC), Multer & Cloudinary cloud image uploads, automatic auction lifecycle status handling (`UPCOMING`, `ACTIVE`, `ENDED`), and structured Morgan & Pino logging.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set MongoDB, JWT, SMTP, and Cloudinary values.
3. Start development mode with `npm run dev` or production mode with `npm start`.

The server defaults to `http://localhost:5001` (or `http://localhost:5000` if configured in `.env`).

---

## Role-Based Access Control (RBAC) Matrix

| Action | Buyer | Seller | Admin |
|---|:---:|:---:|:---:|
| Browse & View Auctions (`GET /api/auctions`) | ✅ | ✅ | ✅ |
| View Auction Details (`GET /api/auctions/:id`) | ✅ | ✅ | ✅ |
| Create Auction with Media (`POST /api/auctions`) | ❌ (403) | ✅ | ✅ |
| Update Own Auction (`PUT/PATCH /api/auctions/:id`) | ❌ (403) | ✅ | ✅ |
| Update Other Seller's Auction | ❌ (403) | ❌ (403) | ✅ |
| Delete Own Auction (`DELETE /api/auctions/:id`) | ❌ (403) | ✅ | ✅ |
| Delete Other Seller's Auction | ❌ (403) | ❌ (403) | ✅ |

---

## API Endpoints

### Health Check

`GET /health`

Returns `200 OK` with `{ "status": "ok" }`.

### Register

`POST /api/auth/register`

```json
{
  "name": "Rohit Pandey",
  "email": "rohit.pandey@gmail.com",
  "password": "Password123!",
  "role": "Seller"
}
```

*Supported roles:* `Buyer` (default), `Seller`, `Admin`.  
Returns `201 Created` with `accessToken`, `refreshToken`, and a password-free `user` object. The refresh token is also set as an HTTP-only cookie. Triggers a welcome email.

### Login

`POST /api/auth/login`

```json
{
  "email": "rohit.pandey@gmail.com",
  "password": "Password123!",
  "role": "Seller"
}
```

*Optional `role` field enforces strict role matching at login (mismatches return `403 Forbidden`).*  
Returns `200 OK` with `accessToken`, `refreshToken`, and the `user` summary. Triggers a login notification email.

### Refresh Access Token

`POST /api/auth/refresh`

The preferred request uses the `refreshToken` HTTP-only cookie. API clients may alternatively send `{ "refreshToken": "<token>" }` in the JSON request body. Returns `200 OK` with a new `accessToken`.

### Protected Profile

`GET /api/auth/profile`

Header: `Authorization: Bearer <accessToken>`

Returns `200 OK` with the authenticated user profile, excluding the password.

### Create Auction (Seller & Admin)

`POST /api/auctions`

Header: `Authorization: Bearer <sellerToken>`  
Content-Type: `multipart/form-data` (or `application/json`)

**Multipart form-data fields:**
- `title` (text): `Apple iPhone 15 Pro Max 256GB Natural Titanium`
- `description` (text): `Brand new sealed Apple iPhone 15 Pro Max, 256GB storage, Natural Titanium finish with 1-year official warranty.`
- `category` (text): `Smartphones`
- `startingPrice` (number): `1199`
- `startTime` (ISO string): `2026-11-01T10:00:00.000Z`
- `endTime` (ISO string): `2026-11-20T18:00:00.000Z`
- `images` (file): *1 to 10 image files (handled by Multer, uploaded directly to Cloudinary)*

**JSON alternative:**
```json
{
  "title": "Sony PlayStation 5 Disc Edition Console",
  "description": "PlayStation 5 console bundled with DualSense wireless controller and original box in mint condition.",
  "category": "Gaming",
  "startingPrice": 499,
  "startTime": "2026-11-01T00:00:00.000Z",
  "endTime": "2026-11-25T00:00:00.000Z",
  "images": [
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  ]
}
```

Returns `201 Created` with the auction object, populated seller details, Cloudinary secure image URLs, and dynamic status (`ACTIVE` or `UPCOMING`).

### Browse Auctions (Public / All Roles)

`GET /api/auctions`

**Query Parameters (optional):**
- `status`: `UPCOMING`, `ACTIVE`, `ENDED`
- `category`: e.g. `Smartphones`
- `search`: search keywords in title or description (e.g. `iPhone`)
- `minPrice` & `maxPrice`: price filtering (e.g. `minPrice=1000&maxPrice=2000`)
- `page` (default `1`) & `limit` (default `10`)
- `sortBy` (default `createdAt`) & `order` (`asc` / `desc`)

Returns `200 OK` with paginated auction items and metadata (`total`, `page`, `totalPages`, `count`).

### Get Auction Details

`GET /api/auctions/:id`

Returns `200 OK` with the auction item and populated seller information (`name`, `email`, `role`). Status is auto-synchronized dynamically.

### Update Auction (Owner Seller or Admin)

`PUT /api/auctions/:id` (or `PATCH /api/auctions/:id`)

Header: `Authorization: Bearer <sellerToken>`

```json
{
  "title": "Apple iPhone 15 Pro Max 256GB - Free AppleCare Included",
  "startingPrice": 1250
}
```

Returns `200 OK` with the updated auction details. If an unauthorized non-owner seller attempts an update, returns `403 Forbidden`.

### Delete Auction (Owner Seller or Admin)

`DELETE /api/auctions/:id`

Header: `Authorization: Bearer <adminToken>` (or owner seller)

Returns `200 OK` with `{ "message": "Auction deleted successfully" }`.

### Error Handling

Errors return standard JSON payloads such as `{ "message": "End time must be after start time" }` with appropriate HTTP status codes:
- `400 Bad Request`: Validation failure (negative starting price, end time before start time, missing fields).
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: RBAC role permission denied or non-owner modifying auction.
- `404 Not Found`: Resource not found.
- `500 Internal Server Error`: Internal exception.

---

## Postman API Screenshots

### Task 2 Screenshots

#### 1. Health Check
![Health Check](./docs/postman-health.png)

#### 2. Register User
![Register Request and Response](./docs/postman-register.png)

#### 3. Register HTTP-Only Cookie
![Register Cookie](./docs/postman-register-cookie.png)

#### 4. User Login
![Login Request and Response](./docs/postman-login.png)

#### 5. Refresh Access Token
![Refresh Access Token](./docs/postman-refresh.png)

#### 6. Protected Profile Access
![Protected Profile Request](./docs/postman-profile.png)

---

### Task 3 Screenshots

#### 7. Seller Login & Access Token
![Seller Login](./docs/screenshots/01-login-seller1.png)

#### 8. Create Auction with Image Upload (Multer & Cloudinary)
![Create Auction Multipart](./docs/screenshots/02-create-auction-multipart.png)

#### 9. Create Auction with JSON Payload
![Create Auction JSON](./docs/screenshots/03-create-auction-json.png)

#### 10. Update Own Auction (Seller)
![Update Own Auction](./docs/screenshots/04-update-own-auction.png)

#### 11. Admin Update Auction
![Admin Update Auction](./docs/screenshots/05-admin-update-auction.png)

#### 12. Admin Delete Auction
![Admin Delete Auction](./docs/screenshots/06-admin-delete-auction.png)

#### 13. Browse All Auctions
![Browse All Auctions](./docs/screenshots/07-get-all-auctions.png)

#### 14. Filter Auctions by Status (ACTIVE)
![Filter Auctions by Status](./docs/screenshots/08-filter-auctions-status.png)

#### 15. Filter Auctions by Category & Price Range
![Filter Auctions by Category and Price](./docs/screenshots/09-filter-auctions-category-price.png)

#### 16. Search Auctions by Keyword
![Search Auctions](./docs/screenshots/10-search-auctions.png)

#### 17. Get Auction Details by ID with Populated Seller
![Get Auction Details](./docs/screenshots/11-get-auction-by-id.png)

#### 18. Server-Side Structured Logging (Morgan + Pino-Pretty)
![Server Logs](./docs/screenshots/12-terminal-pino-morgan-logs.png)

---

## Importable Postman Collection

### Task 2 Auth Collection
Save the following JSON as `task2-auth.postman_collection.json`, then import it into Postman. Set the collection variable `baseUrl` to `http://localhost:5001` (or `http://localhost:5000`).

```json
{
  "info": {
    "name": "Task 2 Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:5001" },
    { "key": "accessToken", "value": "" },
    { "key": "refreshToken", "value": "" }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Rohit Pandey\",\n  \"email\": \"rohit.pandey@gmail.com\",\n  \"password\": \"Password123!\"\n}"
        },
        "url": "{{baseUrl}}/api/auth/register"
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"rohit.pandey@gmail.com\",\n  \"password\": \"Password123!\"\n}"
        },
        "url": "{{baseUrl}}/api/auth/login"
      }
    },
    {
      "name": "Refresh Access Token",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}"
        },
        "url": "{{baseUrl}}/api/auth/refresh"
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }],
        "url": "{{baseUrl}}/api/auth/profile"
      }
    }
  ]
}
```

### Task 3 Auction Collection
Import the file `task3-auction.postman_collection.json` located directly in the root of this project. It is pre-configured with all auction endpoints, role headers, multipart image uploads, search, and query filters.
