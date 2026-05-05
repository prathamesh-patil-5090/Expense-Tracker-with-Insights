# Expense Tracker Backend

Express.js backend API for the Expense Tracker with Insights application, using Prisma ORM for database management.

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   └── migrations/            # Database migration files
├── src/
│   ├── index.ts               # Main application entry point
│   ├── routes/
│   │   ├── users.ts           # User endpoints
│   │   ├── categories.ts       # Category endpoints
│   │   └── expenses.ts         # Expense endpoints
│   └── prisma/
│       └── seed.ts            # Database seeding script
├── .env.local                 # Local environment variables
├── .env.example               # Environment variables template
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
└── .gitignore                 # Git ignore rules
```

## Database Schema

### Tables

#### Users
Stores user account information.

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  
  categories Category[]
  expenses   Expense[]
}
```

**Fields:**
- `id`: Unique identifier (CUID)
- `email`: Unique email address (indexed for performance)
- `name`: User's full name
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

---

#### Categories
Stores expense categories organized by user.

```prisma
model Category {
  id          String     @id @default(cuid())
  name        String
  description String?
  color       String     @default("#3B82F6")
  icon        String?
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses    Expense[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@unique([userId, name])
  @@index([userId])
}
```

**Fields:**
- `id`: Unique identifier
- `name`: Category name (unique per user)
- `description`: Optional category description
- `color`: Hex color code for UI display (default: blue #3B82F6)
- `icon`: Optional emoji or icon identifier
- `userId`: Foreign key to User
- `createdAt`: Category creation timestamp
- `updatedAt`: Last update timestamp

**Constraints:**
- One category name per user (unique constraint)
- Categories cascade-deleted when user is deleted
- Indexed by userId for fast queries

---

#### Expenses
Stores individual expense records.

```prisma
model Expense {
  id          String     @id @default(cuid())
  amount      Float
  description String
  date        DateTime
  receipt     String?
  notes       String?
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@index([userId])
  @@index([categoryId])
  @@index([date])
  @@index([userId, date])
}
```

**Fields:**
- `id`: Unique identifier
- `amount`: Expense amount (decimal)
- `description`: Expense description
- `date`: Date of the expense
- `receipt`: Optional receipt URL or path
- `notes`: Optional additional notes
- `userId`: Foreign key to User
- `categoryId`: Foreign key to Category
- `createdAt`: Expense creation timestamp
- `updatedAt`: Last update timestamp

**Constraints:**
- Indexed by userId, categoryId, and date for optimal query performance
- Composite index on (userId, date) for user-specific date range queries
- Cascades to user deletion; restricts on category deletion

---

## API Endpoints

### Users

#### GET /api/users
Fetch all users with their categories and expenses.

**Response:**
```json
[
  {
    "id": "user123",
    "email": "john@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "categories": [],
    "expenses": []
  }
]
```

---

#### GET /api/users/:id
Fetch a specific user by ID with detailed information.

**Response:**
```json
{
  "id": "user123",
  "email": "john@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "categories": [
    {
      "id": "cat123",
      "name": "Groceries",
      "color": "#10B981",
      "icon": "🛒"
    }
  ],
  "expenses": []
}
```

---

#### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "name": "Jane Smith"
}
```

**Response:** `201 Created`
```json
{
  "id": "user456",
  "email": "jane@example.com",
  "name": "Jane Smith",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/users/:id
Update a user's information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com"
}
```

**Response:**
```json
{
  "id": "user456",
  "email": "jane.doe@example.com",
  "name": "Jane Doe",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:30:00Z"
}
```

---

#### DELETE /api/users/:id
Delete a user and all associated data.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

---

### Categories

#### GET /api/categories?userId=USER_ID
Fetch all categories for a user with expense statistics.

**Query Parameters:**
- `userId` (required): The user ID

**Response:**
```json
[
  {
    "id": "cat123",
    "name": "Groceries",
    "description": "Food and grocery shopping",
    "color": "#10B981",
    "icon": "🛒",
    "userId": "user123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "expenseCount": 5,
    "totalAmount": 250.50
  }
]
```

---

#### GET /api/categories/:id
Fetch a specific category with all its expenses.

**Response:**
```json
{
  "id": "cat123",
  "name": "Groceries",
  "description": "Food and grocery shopping",
  "color": "#10B981",
  "icon": "🛒",
  "userId": "user123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "expenses": [
    {
      "id": "exp123",
      "amount": 45.99,
      "description": "Weekly groceries",
      "date": "2024-01-14T00:00:00Z",
      "categoryId": "cat123",
      "userId": "user123"
    }
  ]
}
```

---

#### POST /api/categories?userId=USER_ID
Create a new category.

**Query Parameters:**
- `userId` (required): The user ID

**Request Body:**
```json
{
  "name": "Dining",
  "description": "Restaurant and food delivery",
  "color": "#F97316",
  "icon": "🍽️"
}
```

**Response:** `201 Created`
```json
{
  "id": "cat456",
  "name": "Dining",
  "description": "Restaurant and food delivery",
  "color": "#F97316",
  "icon": "🍽️",
  "userId": "user123",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

#### PUT /api/categories/:id
Update a category.

**Request Body:**
```json
{
  "name": "Groceries & Produce",
  "color": "#059669"
}
```

**Response:**
```json
{
  "id": "cat123",
  "name": "Groceries & Produce",
  "description": "Food and grocery shopping",
  "color": "#059669",
  "icon": "🛒",
  "userId": "user123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:30:00Z"
}
```

---

#### DELETE /api/categories/:id
Delete a category (fails if expenses exist).

**Response:**
```json
{
  "message": "Category deleted successfully"
}
```

---

### Expenses

#### GET /api/expenses?userId=USER_ID&[filters]
Fetch expenses with optional filtering and sorting.

**Query Parameters:**
- `userId` (required): The user ID
- `categoryId` (optional): Filter by category
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)
- `sortBy` (optional): `date` (default), `amount`, or `oldest`

**Response:**
```json
{
  "data": [
    {
      "id": "exp123",
      "amount": 45.99,
      "description": "Weekly groceries",
      "date": "2024-01-14T00:00:00Z",
      "receipt": null,
      "notes": "Bought vegetables and dairy",
      "userId": "user123",
      "categoryId": "cat123",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "category": {
        "id": "cat123",
        "name": "Groceries",
        "color": "#10B981"
      },
      "user": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "stats": {
    "total": 1,
    "totalAmount": 45.99,
    "avgAmount": 45.99
  }
}
```

---

#### GET /api/expenses/:id
Fetch a specific expense.

**Response:**
```json
{
  "id": "exp123",
  "amount": 45.99,
  "description": "Weekly groceries",
  "date": "2024-01-14T00:00:00Z",
  "receipt": null,
  "notes": "Bought vegetables and dairy",
  "userId": "user123",
  "categoryId": "cat123",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "category": {
    "id": "cat123",
    "name": "Groceries",
    "color": "#10B981"
  },
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

#### POST /api/expenses
Create a new expense.

**Request Body:**
```json
{
  "userId": "user123",
  "categoryId": "cat123",
  "amount": 45.99,
  "description": "Weekly groceries",
  "date": "2024-01-14",
  "notes": "Bought vegetables and dairy",
  "receipt": null
}
```

**Response:** `201 Created`
```json
{
  "id": "exp456",
  "amount": 45.99,
  "description": "Weekly groceries",
  "date": "2024-01-14T00:00:00Z",
  "receipt": null,
  "notes": "Bought vegetables and dairy",
  "userId": "user123",
  "categoryId": "cat123",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "category": {
    "id": "cat123",
    "name": "Groceries",
    "color": "#10B981"
  },
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

#### PUT /api/expenses/:id
Update an expense.

**Request Body:**
```json
{
  "amount": 50.00,
  "description": "Weekly groceries and supplies",
  "notes": "Added household supplies"
}
```

**Response:**
```json
{
  "id": "exp456",
  "amount": 50.00,
  "description": "Weekly groceries and supplies",
  "date": "2024-01-14T00:00:00Z",
  "receipt": null,
  "notes": "Added household supplies",
  "userId": "user123",
  "categoryId": "cat123",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:30:00Z",
  "category": {
    "id": "cat123",
    "name": "Groceries",
    "color": "#10B981"
  },
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

#### DELETE /api/expenses/:id
Delete an expense.

**Response:**
```json
{
  "message": "Expense deleted successfully"
}
```

---

#### GET /api/expenses/stats/:userId
Get expense statistics and summary for a user.

**Query Parameters:**
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Response:**
```json
{
  "user": {
    "id": "user123",
    "name": "John Doe"
  },
  "summary": {
    "totalExpenses": 5,
    "totalAmount": 250.50,
    "avgAmount": 50.10,
    "byCategory": {
      "Groceries": {
        "categoryId": "cat123",
        "count": 3,
        "total": 150.00,
        "average": 50.00,
        "color": "#10B981"
      },
      "Transportation": {
        "categoryId": "cat456",
        "count": 2,
        "total": 100.50,
        "average": 50.25,
        "color": "#F59E0B"
      }
    }
  },
  "period": {
    "startDate": "all-time",
    "endDate": "today"
  }
}
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- SQLite (included in Prisma)

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   The default SQLite database will be created at `./prisma/dev.db`

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run migrations:**
   ```bash
   npm run prisma:migrate
   ```
   This creates the database schema based on `schema.prisma`

5. **Seed sample data (optional):**
   ```bash
   npm run prisma:seed
   ```
   This populates the database with sample users, categories, and expenses

---

## Development

### Run in Development Mode
```bash
npm run dev
```
- Server runs on `http://localhost:5000`
- Hot-reload enabled with `tsx watch`
- Database available at `./prisma/dev.db`

### View Database in Prisma Studio
```bash
npm run prisma:studio
```
Opens a visual interface to browse and edit database records.

### Build for Production
```bash
npm run build
```
Compiles TypeScript to JavaScript in the `dist/` directory.

### Start Production Server
```bash
npm start
```
Runs the compiled JavaScript from `dist/index.js`

---

## Database Normalization

The schema follows database normalization principles:

- **1NF (First Normal Form):** All fields contain atomic values
- **2NF (Second Normal Form):** No partial dependencies on composite keys
- **3NF (Third Normal Form):** No transitive dependencies
- **Unique Constraints:** Category names are unique per user
- **Foreign Keys:** Maintain referential integrity
- **Cascade Rules:** User deletion cascades to categories and expenses

---

## Performance Optimizations

### Indexes
- `User.email`: Fast user lookups by email
- `Category.userId`: Quick category retrieval for a user
- `Expense.userId`: Fast expense retrieval for a user
- `Expense.categoryId`: Fast expense filtering by category
- `Expense.date`: Optimized date-range queries
- `Expense.(userId, date)`: Composite index for user-specific date ranges

### Query Patterns
- Category endpoints return expense counts and totals
- Expense endpoints include category and user information
- Statistics endpoint aggregates data efficiently

---

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Successful GET/PUT/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate entry (e.g., duplicate email)
- `500 Internal Server Error`: Unexpected server error

---

## Dependencies

### Core
- **express**: Web server framework
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **@prisma/client**: Database ORM client

### Development
- **typescript**: Type-safe JavaScript
- **tsx**: TypeScript execution for development
- **@types/node**: Node.js type definitions
- **@types/express**: Express type definitions

---

## Future Enhancements

- [ ] Authentication & authorization (JWT)
- [ ] Expense import from CSV
- [ ] Budget tracking and alerts
- [ ] Recurring expense support
- [ ] Multi-currency support
- [ ] Advanced analytics and reporting
- [ ] Receipt image storage and OCR
- [ ] API rate limiting
- [ ] Data export functionality

---

## License

ISC
