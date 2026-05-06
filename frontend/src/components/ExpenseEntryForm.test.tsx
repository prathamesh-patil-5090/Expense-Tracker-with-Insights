/// <reference types="jest" />
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExpenseEntryForm, { type CategoryOption } from "./ExpenseEntryForm";

const categories: CategoryOption[] = [
  { id: "cat-1", name: "Groceries", icon: "🛒" },
  { id: "cat-2", name: "Utilities", icon: "💡" }
];

let mockedFetch: jest.Mock;

beforeEach(() => {
  mockedFetch = jest.fn();
  global.fetch = mockedFetch as unknown as typeof fetch;
});

afterEach(() => {
  mockedFetch.mockReset();
  jest.resetAllMocks();
});

test("renders expense entry form fields", () => {
  render(<ExpenseEntryForm userId="user-123" initialCategories={categories} />);

  expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
});

test("validates required inputs before submission", async () => {
  render(<ExpenseEntryForm userId="user-123" initialCategories={categories} />);

  fireEvent.click(screen.getByRole("button", { name: /save expense/i }));

  expect(await screen.findByText(/Amount is required/i)).toBeInTheDocument();
});

test("submits expense and clears the form", async () => {
  const mockedResponse = { id: "expense-123", amount: 25.5 };
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockedResponse });

  render(<ExpenseEntryForm userId="user-123" initialCategories={categories} />);

  fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "25.50" } });
  fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: "2026-05-05" } });
  fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "cat-1" } });
  fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Lunch" } });

  fireEvent.click(screen.getByRole("button", { name: /save expense/i }));

  await waitFor(() => expect(screen.getByText(/Expense submitted successfully/i)).toBeInTheDocument());
  expect(screen.getByLabelText(/Amount/i)).toHaveValue("");
  expect(screen.getByLabelText(/Description/i)).toHaveValue("");
});

test("allows creating a new category before submitting", async () => {
  const createCategory = jest.fn(async (name: string) => ({ id: "cat-new", name, icon: "🆕" }));
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "expense-999" }) });

  render(<ExpenseEntryForm userId="user-123" initialCategories={categories} createCategory={createCategory} />);

  fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "new" } });
  fireEvent.change(screen.getByLabelText(/New Category Name/i), { target: { value: "Dining" } });
  fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "12.00" } });
  fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Dinner" } });
  fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: "2026-05-01" } });

  fireEvent.click(screen.getByRole("button", { name: /save expense/i }));

  await waitFor(() => expect(createCategory).toHaveBeenCalledWith("Dining", "user-123"));
  expect(mockedFetch).toHaveBeenCalledWith(
    "/api/expenses",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
      body: expect.stringContaining("\"userId\": \"user-123\"")
    })
  );
});
