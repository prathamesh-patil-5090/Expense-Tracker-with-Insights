# API Quick Reference

## Base URL
```
http://localhost:5000/api
```

## Common Response Codes
- `200 OK` - Successful request
- `201 Created` - Successfully created resource
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate/conflict error
- `500 Server Error` - Unexpected error

---

## Users Endpoints

### Create User
```bash
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "User Name"
}
```

### Get All Users
```bash
GET /api/users
```

### Get User by ID
```bash
GET /api/users/{userId}
```

### Update User
```bash
PUT /api/users/{userId}
Content-Type: application/json

{
  "name": "New Name",
  "email": "newemail@example.com"
}
```

### Delete User
```bash
DELETE /api/users/{userId}
```

---

## Categories Endpoints

### Get User Categories
```bash
GET /api/categories?userId={userId}
```

### Get Category by ID
```bash
GET /api/categories/{categoryId}
```

### Create Category
```bash
POST /api/categories?userId={userId}
Content-Type: application/json

{
  "name": "Category Name",
  "description": "Optional description",
  "color": "#3B82F6",
  "icon": "🛒"
}
```

### Update Category
```bash
PUT /api/categories/{categoryId}
Content-Type: application/json

{
  "name": "Updated Name",
  "color": "#059669"
}
```

### Delete Category
```bash
DELETE /api/categories/{categoryId}
```

---

## Expenses Endpoints

### Get User Expenses
```bash
GET /api/expenses?userId={userId}&[filters]

# Filters:
# categoryId={categoryId}     - Filter by category
# startDate=2024-01-01      - Filter from date
# endDate=2024-01-31        - Filter to date
# sortBy=date|amount|oldest - Sort results

# Example:
GET /api/expenses?userId=user123&sortBy=amount&startDate=2024-01-01&endDate=2024-01-31
```

### Get Expense by ID
```bash
GET /api/expenses/{expenseId}
```

### Create Expense
```bash
POST /api/expenses
Content-Type: application/json

{
  "userId": "user123",
  "categoryId": "cat123",
  "amount": 45.99,
  "description": "Expense description",
  "date": "2024-01-15",
  "notes": "Optional notes",
  "receipt": null
}
```

### Update Expense
```bash
PUT /api/expenses/{expenseId}
Content-Type: application/json

{
  "amount": 50.00,
  "description": "Updated description"
}
```

### Delete Expense
```bash
DELETE /api/expenses/{expenseId}
```

### Get Expense Statistics
```bash
GET /api/expenses/stats/{userId}

# Optional filters:
# startDate=2024-01-01
# endDate=2024-01-31
```

---

## cURL Examples

### Create a User
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe"
  }'
```

### Get All Users
```bash
curl http://localhost:5000/api/users
```

### Create a Category
```bash
curl -X POST "http://localhost:5000/api/categories?userId=user123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "color": "#10B981",
    "icon": "🛒"
  }'
```

### Create an Expense
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "categoryId": "cat123",
    "amount": 45.99,
    "description": "Weekly groceries",
    "date": "2024-01-15"
  }'
```

### Get User Expenses (Last 30 Days)
```bash
curl "http://localhost:5000/api/expenses?userId=user123&startDate=2024-01-01&sortBy=amount"
```

### Get Expense Statistics
```bash
curl "http://localhost:5000/api/expenses/stats/user123"
```

---

## JavaScript/Fetch Examples

### Create a User
```javascript
const response = await fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    name: 'John Doe'
  })
});
const user = await response.json();
```

### Get User's Expenses
```javascript
const userId = 'user123';
const response = await fetch(
  `http://localhost:5000/api/expenses?userId=${userId}&sortBy=date`,
  { method: 'GET' }
);
const { data, stats } = await response.json();
```

### Create an Expense
```javascript
const response = await fetch('http://localhost:5000/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    categoryId: 'cat123',
    amount: 45.99,
    description: 'Weekly groceries',
    date: new Date().toISOString().split('T')[0]
  })
});
const expense = await response.json();
```

### Get User Statistics
```javascript
const userId = 'user123';
const response = await fetch(
  `http://localhost:5000/api/expenses/stats/${userId}`
);
const stats = await response.json();
console.log(`Total spent: $${stats.summary.totalAmount}`);
console.log(`By category:`, stats.summary.byCategory);
```

---

## Error Handling Examples

### Handle 404 Not Found
```javascript
const response = await fetch('http://localhost:5000/api/users/invalid-id');
if (response.status === 404) {
  console.error('User not found');
}
```

### Handle Validation Error
```javascript
const response = await fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' }) // Missing email
});
if (response.status === 400) {
  const error = await response.json();
  console.error('Validation error:', error.error);
}
```

### Handle Conflict (Duplicate)
```javascript
const response = await fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'existing@example.com', // Already exists
    name: 'Someone'
  })
});
if (response.status === 409) {
  console.error('Email already registered');
}
```

---

## Testing with Postman

1. **Import Base URL:** `http://localhost:5000/api`
2. **Create Collection:** "Expense Tracker"
3. **Create Requests:**
   - POST /users (create user)
   - GET /users (get all users)
   - POST /categories (create category)
   - POST /expenses (create expense)
   - GET /expenses (get expenses with filters)

4. **Environment Variables** (optional):
   ```json
   {
     "baseUrl": "http://localhost:5000/api",
     "userId": "user123",
     "categoryId": "cat123",
     "expenseId": "exp123"
   }
   ```

---

## Sample Workflow

1. **Create User**
   ```bash
   POST /api/users
   { "email": "john@example.com", "name": "John Doe" }
   ```

2. **Create Categories**
   ```bash
   POST /api/categories?userId={userId}
   { "name": "Groceries", "color": "#10B981" }
   
   POST /api/categories?userId={userId}
   { "name": "Transport", "color": "#F59E0B" }
   ```

3. **Create Expenses**
   ```bash
   POST /api/expenses
   {
     "userId": "{userId}",
     "categoryId": "{groceryCategory}",
     "amount": 45.99,
     "description": "Weekly shopping"
   }
   ```

4. **Get Statistics**
   ```bash
   GET /api/expenses/stats/{userId}
   ```

---

## Rate Limiting
Currently: None (implement in production)

## Authentication
Currently: None (implement JWT in production)

## CORS
Currently: Enabled for all origins (restrict in production)
