# Expense CRUD API Documentation

## Overview

The Expense API provides complete CRUD (Create, Read, Update, Delete) operations for managing expense records. All endpoints are secured with JWT authentication and enforce data validation and error handling.

**Base URL:** `http://localhost:5000/api`

**Authentication:** All endpoints require JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <accessToken>
```

---

## Data Model

### Expense Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Groceries",
    "color": "#0f766e",
    "icon": "🛒"
  },
  "amount": 45.99,
  "description": "Weekly grocery shopping",
  "date": "2026-05-05",
  "receipt": "https://example.com/receipts/123.jpg",
  "notes": "Includes organic vegetables",
  "createdAt": "2026-05-05T10:30:00Z",
  "updatedAt": "2026-05-05T10:30:00Z"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | Unique identifier (auto-generated) |
| `userId` | UUID | Yes | Owner of the expense |
| `categoryId` | UUID | Yes | Associated category (must belong to user) |
| `amount` | Decimal | Yes | Amount in USD, must be > 0 |
| `description` | String | Yes | Brief description (e.g., "Grocery shopping") |
| `date` | Date | Yes | Expense date (YYYY-MM-DD), defaults to today |
| `receipt` | URL | No | Optional receipt image/document URL |
| `notes` | String | No | Additional notes (max 500 chars) |
| `createdAt` | DateTime | Auto | Creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

---

## Endpoints

### 1. CREATE - Add New Expense

**Endpoint:** `POST /expenses`

**Description:** Create a new expense record. Automatically triggers budget alert evaluation.

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "amount": 45.99,
  "description": "Weekly grocery shopping",
  "date": "2026-05-05",
  "receipt": "https://example.com/receipts/123.jpg",
  "notes": "Includes organic vegetables"
}
```

**Required Fields:**
- `userId` (UUID) - Owner of the expense
- `categoryId` (UUID) - Must belong to the user
- `amount` (decimal) - Must be > 0
- `description` (string) - Brief description

**Optional Fields:**
- `date` (string) - Defaults to today if not provided
- `receipt` (string) - URL to receipt
- `notes` (string) - Additional notes (max 500 characters)

**Validation Rules:**
- Amount must be > 0
- Category must exist and belong to the user
- User must exist
- Date cannot be in the future
- Notes cannot exceed 500 characters

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Groceries",
    "color": "#0f766e",
    "icon": "🛒"
  },
  "amount": 45.99,
  "description": "Weekly grocery shopping",
  "date": "2026-05-05",
  "receipt": "https://example.com/receipts/123.jpg",
  "notes": "Includes organic vegetables",
  "createdAt": "2026-05-05T10:30:00Z",
  "updatedAt": "2026-05-05T10:30:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | One or more required fields not provided |
| 400 | Amount must be greater than 0 | Invalid amount |
| 404 | User not found | User ID doesn't exist |
| 404 | Category not found for this user | Category doesn't belong to user |
| 401 | Unauthorized | Invalid or missing token |
| 500 | Failed to create expense | Server error |

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "categoryId": "550e8400-e29b-41d4-a716-446655440002",
    "amount": 45.99,
    "description": "Weekly grocery shopping",
    "date": "2026-05-05"
  }'
```

**Side Effects:**
- Automatically evaluates budget thresholds and creates alerts if needed
- Triggers email notifications if configured

---

### 2. READ - Get Expense by ID

**Endpoint:** `GET /expenses/{id}`

**Description:** Retrieve a single expense record by its ID.

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (UUID) - Expense ID to retrieve

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Groceries",
    "color": "#0f766e",
    "icon": "🛒"
  },
  "amount": 45.99,
  "description": "Weekly grocery shopping",
  "date": "2026-05-05",
  "receipt": "https://example.com/receipts/123.jpg",
  "notes": "Includes organic vegetables",
  "createdAt": "2026-05-05T10:30:00Z",
  "updatedAt": "2026-05-05T10:30:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Expense not found | ID doesn't exist |
| 401 | Unauthorized | Invalid or missing token |

**Example cURL:**
```bash
curl -X GET http://localhost:5000/api/expenses/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. READ - List Expenses (Paginated)

**Endpoint:** `GET /expenses`

**Description:** Retrieve paginated list of expenses with optional filtering and sorting.

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | UUID | Yes | N/A | User ID to fetch expenses for |
| `categoryId` | UUID | No | None | Filter by specific category |
| `startDate` | Date | No | None | Filter from date (YYYY-MM-DD) |
| `endDate` | Date | No | None | Filter to date (YYYY-MM-DD) |
| `sortBy` | String | No | date | Sort order: `date` (newest), `amount` (highest), `oldest` |
| `limit` | Integer | No | 1000 | Page size (1-1000) |
| `offset` | Integer | No | 0 | Items to skip (for pagination) |

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryId": "550e8400-e29b-41d4-a716-446655440002",
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Groceries",
        "color": "#0f766e",
        "icon": "🛒"
      },
      "amount": 45.99,
      "description": "Weekly grocery shopping",
      "date": "2026-05-05",
      "createdAt": "2026-05-05T10:30:00Z",
      "updatedAt": "2026-05-05T10:30:00Z"
    }
  ],
  "stats": {
    "total": 45,
    "totalAmount": 1250.75,
    "avgAmount": 27.79
  },
  "pageInfo": {
    "limit": 1000,
    "offset": 0,
    "returned": 1
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | userId is required | Missing userId parameter |
| 401 | Unauthorized | Invalid or missing token |

**Example cURL:**
```bash
# Get all expenses for a user
curl -X GET "http://localhost:5000/api/expenses?userId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get expenses in date range, sorted by amount
curl -X GET "http://localhost:5000/api/expenses?userId=550e8400-e29b-41d4-a716-446655440001&startDate=2026-01-01&endDate=2026-05-31&sortBy=amount&limit=20&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get expenses by category with pagination
curl -X GET "http://localhost:5000/api/expenses?userId=550e8400-e29b-41d4-a716-446655440001&categoryId=550e8400-e29b-41d4-a716-446655440002&limit=50&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Performance Notes:**
- Uses pagination to handle large datasets efficiently
- Provides aggregated statistics (total count, sum, average)
- Default page size is 1000 items
- Maximum page size is 1000 items

---

### 4. UPDATE - Modify Expense

**Endpoint:** `PUT /expenses/{id}`

**Description:** Update one or more fields of an expense. All fields are optional. Automatically re-evaluates budget alerts.

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `id` (UUID) - Expense ID to update

**Request Body (all fields optional):**
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440003",
  "amount": 52.50,
  "description": "Updated grocery shopping",
  "date": "2026-05-06",
  "receipt": "https://example.com/receipts/124.jpg",
  "notes": "Updated notes"
}
```

**Updateable Fields:**
- `categoryId` - Must belong to user
- `amount` - Must be > 0
- `description` - Brief description
- `date` - Expense date
- `receipt` - Receipt URL
- `notes` - Additional notes (max 500 chars)

**Validation Rules:**
- Only provided fields are updated (partial updates allowed)
- Category must exist and belong to user (if provided)
- Amount must be > 0 (if provided)
- Date cannot be in the future (if provided)

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440003",
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Food",
    "color": "#d97706",
    "icon": "🍽️"
  },
  "amount": 52.50,
  "description": "Updated grocery shopping",
  "date": "2026-05-06",
  "receipt": "https://example.com/receipts/124.jpg",
  "notes": "Updated notes",
  "createdAt": "2026-05-05T10:30:00Z",
  "updatedAt": "2026-05-05T11:45:30Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid input | Validation failed |
| 404 | Expense not found | ID doesn't exist |
| 404 | Category not found for this user | Category doesn't belong to user |
| 401 | Unauthorized | Invalid or missing token |

**Example cURL:**
```bash
# Update amount only
curl -X PUT http://localhost:5000/api/expenses/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 52.50
  }'

# Update multiple fields
curl -X PUT http://localhost:5000/api/expenses/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "550e8400-e29b-41d4-a716-446655440003",
    "amount": 52.50,
    "description": "Updated grocery shopping"
  }'
```

**Side Effects:**
- Automatically re-evaluates budget thresholds
- Updates timestamp
- May trigger or clear alert notifications

---

### 5. DELETE - Remove Expense

**Endpoint:** `DELETE /expenses/{id}`

**Description:** Delete an expense record. Automatically re-evaluates budget alerts.

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (UUID) - Expense ID to delete

**Success Response (200 OK):**
```json
{
  "message": "Expense deleted successfully"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Expense not found | ID doesn't exist |
| 401 | Unauthorized | Invalid or missing token |

**Example cURL:**
```bash
curl -X DELETE http://localhost:5000/api/expenses/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Side Effects:**
- Automatically re-evaluates budget alerts after deletion
- May clear alert notifications if spending now below threshold
- Triggers database cascade delete (no orphaned references)

---

### 6. READ - Expense Statistics

**Endpoint:** `GET /expenses/stats/{userId}`

**Description:** Retrieve aggregated expense statistics for a user, including totals, counts, and category breakdown.

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `userId` (UUID) - User ID to get statistics for

**Query Parameters:**
- `startDate` (optional, Date) - Filter from date (YYYY-MM-DD)
- `endDate` (optional, Date) - Filter to date (YYYY-MM-DD)

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe"
  },
  "summary": {
    "totalExpenses": 45,
    "totalAmount": 1250.75,
    "avgAmount": 27.79,
    "byCategory": {
      "Groceries": {
        "categoryId": "550e8400-e29b-41d4-a716-446655440002",
        "count": 15,
        "total": 450.25,
        "average": 30.02,
        "color": "#0f766e"
      },
      "Transportation": {
        "categoryId": "550e8400-e29b-41d4-a716-446655440003",
        "count": 20,
        "total": 600.50,
        "average": 30.03,
        "color": "#d97706"
      }
    }
  },
  "period": {
    "startDate": "all-time",
    "endDate": "today"
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | User not found | User ID doesn't exist |
| 401 | Unauthorized | Invalid or missing token |

**Example cURL:**
```bash
# Get all-time statistics
curl -X GET http://localhost:5000/api/expenses/stats/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get statistics for date range
curl -X GET "http://localhost:5000/api/expenses/stats/550e8400-e29b-41d4-a716-446655440001?startDate=2026-01-01&endDate=2026-05-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Performance Notes:**
- Uses efficient aggregation queries (no full table scans)
- Provides category breakdown for dashboard rendering
- Fast response times even with thousands of records

---

## Authentication

All expense endpoints require JWT Bearer token authentication obtained from the login endpoint.

**Getting a Token:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Using Token in Requests:**
```bash
curl -X GET http://localhost:5000/api/expenses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Descriptive error message"
}
```

**Common HTTP Status Codes:**

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | Invalid or missing token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected server error |

---

## Data Validation

All CRUD operations enforce strict validation:

**Amount Validation:**
- Must be a valid number
- Must be greater than 0
- Maximum 2 decimal places (cents)

**Date Validation:**
- Must be a valid ISO 8601 date (YYYY-MM-DD)
- Cannot be in the future
- Defaults to today if not provided

**Category Validation:**
- Must exist in database
- Must belong to the requesting user
- Cannot be null/undefined

**Text Fields:**
- Description: Required, non-empty string
- Notes: Optional, max 500 characters

**User Validation:**
- Must exist in database
- Request must be authenticated with valid JWT token

---

## Rate Limiting

While expense endpoints don't have specific rate limits, auth endpoints are rate-limited to prevent brute force attacks:
- Maximum 5 failed login attempts per email/IP per 15 minutes
- Temporary lockout after exceeding limit

---

## Examples

### Complete Workflow Example

```bash
#!/bin/bash

# 1. Login to get access token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')

# 2. Get user's categories
CATEGORIES=$(curl -s -X GET "http://localhost:5000/api/categories?userId=$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

CATEGORY_ID=$(echo $CATEGORIES | jq -r '.[0].id')

# 3. Create a new expense
EXPENSE=$(curl -s -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"amount\": 45.99,
    \"description\": \"Weekly grocery shopping\",
    \"date\": \"2026-05-05\"
  }")

EXPENSE_ID=$(echo $EXPENSE | jq -r '.id')
echo "Created expense: $EXPENSE_ID"

# 4. Retrieve the expense
curl -s -X GET "http://localhost:5000/api/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Update the expense
curl -s -X PUT "http://localhost:5000/api/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 52.50,
    "notes": "Updated with organic items"
  }' | jq '.'

# 6. Get expense statistics
curl -s -X GET "http://localhost:5000/api/expenses/stats/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 7. Delete the expense
curl -s -X DELETE "http://localhost:5000/api/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## Related Documentation

- [Authentication Guide](./AUTH.md) - JWT tokens, login, registration
- [Setup Instructions](./SETUP.md) - Installation and configuration
- [API Reference](./API_REFERENCE.md) - Quick endpoint reference
- [OpenAPI Specification](./openapi.yaml) - Machine-readable API spec

