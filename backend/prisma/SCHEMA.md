# Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                          ┌──────────────┐                          │
│                          │    Users     │                          │
│                          ├──────────────┤                          │
│                          │ id (PK)      │◄─────────────┐           │
│                          │ email (UQ)   │              │           │
│                          │ name         │              │           │
│                          │ createdAt    │              │           │
│                          │ updatedAt    │              │           │
│                          └──────────────┘              │           │
│                                 ▲                      │           │
│                                 │ 1                    │           │
│                        ┌────────┴────────┐         ┌──┴─────┐      │
│                        │ 1..N            │ 1..N    │        │      │
│                        │                 │        │         │      │
│                   ┌────▼─────────────┐   │   ┌────▼──────────▼──┐  │
│                   │   Categories     │   │   │    Expenses      │  │
│                   ├──────────────────┤   │   ├─────────────────┤  │
│                   │ id (PK)          │   │   │ id (PK)         │  │
│                   │ name             │   │   │ amount          │  │
│                   │ description      │───┘   │ description     │  │
│                   │ color            │       │ date            │  │
│                   │ icon             │       │ receipt         │  │
│                   │ userId (FK) ─────┼──────┤ notes           │  │
│                   │ createdAt        │       │ userId (FK) ────┘  │
│                   │ updatedAt        │       │ categoryId (FK) ┐  │
│                   └──────────────────┘       │ createdAt       │  │
│                                              │ updatedAt       │  │
│                        ▲                     └─────────────────┘  │
│                        │                                │         │
│                        │ FK to Categories              │         │
│                        │──────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Schema Details

### Users Table
- **Primary Key:** `id` (CUID)
- **Unique Constraint:** `email`
- **Relationships:** 
  - One-to-Many with Categories (one user has many categories)
  - One-to-Many with Expenses (one user has many expenses)
- **Cascade Rule:** When a user is deleted, all their categories and expenses are deleted

### Categories Table
- **Primary Key:** `id` (CUID)
- **Foreign Key:** `userId` (references Users.id)
- **Unique Constraint:** Combination of `(userId, name)` - one user cannot have duplicate category names
- **Indexes:** 
  - Primary: `userId`
  - Implicit: composite unique on `(userId, name)`
- **Relationships:**
  - Many-to-One with Users (many categories belong to one user)
  - One-to-Many with Expenses (one category has many expenses)
- **Cascade Rule:** When a user is deleted, all their categories are deleted

### Expenses Table
- **Primary Key:** `id` (CUID)
- **Foreign Keys:** 
  - `userId` (references Users.id) - Cascade on delete
  - `categoryId` (references Categories.id) - Restrict on delete
- **Indexes:**
  - `userId` (for quick user expense queries)
  - `categoryId` (for category-based filtering)
  - `date` (for date range queries)
  - Composite: `(userId, date)` (for optimized user expense queries by date)
- **Relationships:**
  - Many-to-One with Users (many expenses belong to one user)
  - Many-to-One with Categories (many expenses belong to one category)
- **Delete Rules:** 
  - Cascade on user deletion (orphaned expenses are deleted)
  - Restrict on category deletion (cannot delete a category with expenses)

---

## Data Flow

```
┌──────────────────────────────────────────────────────┐
│                    User Creates                      │
│              Expense Tracking Workflow                │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────────┐
            │  User Signup/Login      │
            │  (Create User)          │
            └─────────┬───────────────┘
                      │
                      ▼
            ┌─────────────────────────┐
            │  Define Categories      │
            │  (Create Categories)    │
            └─────────┬───────────────┘
                      │
                      ▼
            ┌─────────────────────────┐
            │  Record Expenses        │
            │  (Create Expenses)      │
            └─────────┬───────────────┘
                      │
                      ▼
            ┌─────────────────────────┐
            │  View & Analyze Data    │
            │  (Query & Statistics)   │
            └─────────┬───────────────┘
                      │
                      ▼
            ┌─────────────────────────┐
            │  Update Records         │
            │  (Update/Delete)        │
            └─────────────────────────┘
```

---

## Normalization Analysis

### First Normal Form (1NF)
✅ **Compliant** - All attributes contain atomic, non-repeating values
- No array or set attributes
- Each field contains a single value

### Second Normal Form (2NF)
✅ **Compliant** - No partial dependencies
- Primary key is CUID (single attribute)
- No non-key attributes depend on partial composite keys
- Composite unique constraint `(userId, name)` in Categories is properly justified

### Third Normal Form (3NF)
✅ **Compliant** - No transitive dependencies
- All non-key attributes depend directly on the primary key
- No non-key attributes depend on other non-key attributes
- Example: Category color depends on category, not on user

### Boyce-Codd Normal Form (BCNF)
✅ **Compliant** - Every determinant is a candidate key
- All dependencies are from candidate keys (primary and unique constraints)

---

## Query Optimization

### Indexed Queries
The following queries are optimized through indexes:

1. **Find user by email** - Uses `User.email` index
   ```
   SELECT * FROM Users WHERE email = ?
   ```

2. **Get all categories for a user** - Uses `Category.userId` index
   ```
   SELECT * FROM Categories WHERE userId = ?
   ```

3. **Get all expenses for a user** - Uses `Expense.userId` index
   ```
   SELECT * FROM Expenses WHERE userId = ?
   ```

4. **Get expenses by category** - Uses `Expense.categoryId` index
   ```
   SELECT * FROM Expenses WHERE categoryId = ?
   ```

5. **Get expenses in date range** - Uses `Expense.date` index
   ```
   SELECT * FROM Expenses WHERE date >= ? AND date <= ?
   ```

6. **Get user expenses in date range** - Uses composite `(userId, date)` index
   ```
   SELECT * FROM Expenses WHERE userId = ? AND date >= ? AND date <= ?
   ```

---

## Constraints & Data Integrity

| Constraint Type | Table | Field(s) | Rule |
|---|---|---|---|
| Primary Key | Users | id | Unique identifier for each user |
| Unique | Users | email | One email per account |
| Primary Key | Categories | id | Unique identifier for each category |
| Foreign Key | Categories | userId | Links to Users.id, CASCADE on delete |
| Unique | Categories | (userId, name) | One category name per user |
| Primary Key | Expenses | id | Unique identifier for each expense |
| Foreign Key | Expenses | userId | Links to Users.id, CASCADE on delete |
| Foreign Key | Expenses | categoryId | Links to Categories.id, RESTRICT on delete |

---

## Index Strategy

| Table | Column(s) | Type | Purpose |
|---|---|---|---|
| Users | email | Unique | Email-based lookups (login, account recovery) |
| Categories | userId | Regular | Fast category retrieval for user view |
| Expenses | userId | Regular | Fast expense retrieval for user dashboard |
| Expenses | categoryId | Regular | Category-based expense filtering |
| Expenses | date | Regular | Date-range queries and sorting |
| Expenses | (userId, date) | Composite | Optimized user-specific historical queries |

---

## Design Decisions

### Why SQLite for Development?
- Lightweight and file-based (easy setup)
- Sufficient for prototyping and testing
- Can be easily migrated to PostgreSQL/MySQL for production

### Why CUID for Primary Keys?
- Better distribution than sequential IDs
- Suitable for distributed systems
- Prevents ID enumeration attacks

### Why Cascade Delete for User?
- Maintains referential integrity
- Simplifies account deletion process
- Orphaned data is automatically cleaned up

### Why Restrict Delete for Category?
- Prevents accidental data loss
- Forces explicit expense reassignment or deletion
- Maintains audit trail

### Composite Index on (userId, date)?
- Most common query pattern: "user's expenses on date X"
- Single index covers both conditions
- Reduces query execution time

---

## Sample Queries

### Get total spending by category for a user
```sql
SELECT c.name, c.color, COUNT(*) as count, SUM(e.amount) as total
FROM Expenses e
JOIN Categories c ON e.categoryId = c.id
WHERE e.userId = ?
GROUP BY e.categoryId
ORDER BY total DESC;
```

### Get highest expenses in the last 30 days
```sql
SELECT e.id, e.description, e.amount, c.name, e.date
FROM Expenses e
JOIN Categories c ON e.categoryId = c.id
WHERE e.userId = ? AND e.date >= datetime('now', '-30 days')
ORDER BY e.amount DESC
LIMIT 10;
```

### Get average spending by category
```sql
SELECT c.name, AVG(e.amount) as avg_amount, COUNT(*) as expense_count
FROM Expenses e
JOIN Categories c ON e.categoryId = c.id
WHERE e.userId = ?
GROUP BY e.categoryId;
```

---

## Migration Path

If migrating to PostgreSQL:
```
SQLite schema → PostgreSQL
- CUID() → uuid (gen_random_uuid())
- String → VARCHAR
- DateTime → TIMESTAMP WITH TIME ZONE
- No data type changes needed
- All constraints remain the same
```

---

Last Updated: 2024-01-15
Schema Version: 1.0.0
