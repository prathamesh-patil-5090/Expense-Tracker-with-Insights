# Expense Entry Form Component

This folder contains a responsive React expense entry component for capturing new expense records and integrating with the backend API.

## Component

`src/components/ExpenseEntryForm.tsx`

### Features

- Validates required fields: amount, date, category, and description.
- Supports selecting predefined categories.
- Supports creating new categories via `createCategory` callback.
- Shows success confirmation and clears the form after submission.
- Submits to the expense creation endpoint at `POST /api/expenses`.

## Props

```ts
type ExpenseEntryFormProps = {
  userId: string;
  initialCategories: CategoryOption[];
  authToken?: string;
  apiBaseUrl?: string;
  createCategory?: (name: string, userId: string) => Promise<CategoryOption>;
  onSuccess?: (expense: Record<string, unknown>) => void;
};
```

## Example Usage

```tsx
import React from "react";
import ExpenseEntryForm from "./src/components/ExpenseEntryForm";

const initialCategories = [
  { id: "cat-1", name: "Groceries", icon: "🛒" },
  { id: "cat-2", name: "Utilities", icon: "💡" }
];

const App = () => (
  <ExpenseEntryForm
    userId="550e8400-e29b-41d4-a716-446655440001"
    authToken="YOUR_JWT_TOKEN"
    initialCategories={initialCategories}
    apiBaseUrl="http://localhost:5000/api"
    createCategory={async (name, userId) => {
      // Implement category creation against your backend if supported.
      return { id: "cat-new", name, icon: "🆕" };
    }}
    onSuccess={(expense) => {
      console.log("Expense saved", expense);
    }}
  />
);
```

## Backend API Integration

### Create Expense

**Endpoint:** `POST /api/expenses`

**Request body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "categoryId": "550e8400-e29b-41d4-a716-446655440002",
  "amount": 45.99,
  "description": "Weekly grocery shopping",
  "date": "2026-05-05",
  "notes": "Optional notes"
}
```

**Response:**

- `201 Created` with the saved expense object.
- `400` when a required field is missing or invalid.
- `404` when the user or category is not found.

## Mock Environment

The tests in `src/components/ExpenseEntryForm.test.tsx` demonstrate a mock integration using `jest` and mocked `fetch`.

### Run tests

```bash
cd frontend
npm install
npm test
```

## Notes

- The component also captures `description` because the backend API requires it.
- If you want category persistence, pass a real `createCategory` callback that creates the category in the backend and returns its ID.
