import React, { useMemo, useState } from "react";

export type CategoryOption = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
};

export type ExpenseEntryFormProps = {
  userId: string;
  initialCategories: CategoryOption[];
  authToken?: string;
  apiBaseUrl?: string;
  createCategory?: (name: string, userId: string) => Promise<CategoryOption>;
  onSuccess?: (expense: Record<string, unknown>) => void;
};

const todayString = () => new Date().toISOString().slice(0, 10);

const formCardStyle: React.CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
  padding: 24,
  borderRadius: 16,
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 18
};

const inputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  padding: "12px 14px",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box"
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  color: "#0F172A"
};

const buttonStyle: React.CSSProperties = {
  borderRadius: 12,
  background: "#2563EB",
  color: "white",
  border: "none",
  padding: "14px 20px",
  fontSize: 16,
  cursor: "pointer"
};

const secondaryTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#475569"
};

const errorStyle: React.CSSProperties = {
  color: "#B91C1C",
  fontSize: 13,
  marginTop: 4
};

const successStyle: React.CSSProperties = {
  background: "#ECFDF5",
  color: "#065F46",
  borderRadius: 10,
  padding: "12px 14px",
  border: "1px solid #A7F3D0",
  marginBottom: 18
};

const getRandomCategoryId = () => `local-category-${Math.random().toString(36).slice(2, 10)}`;

const ExpenseEntryForm: React.FC<ExpenseEntryFormProps> = ({
  userId,
  initialCategories,
  authToken,
  apiBaseUrl = "/api",
  createCategory,
  onSuccess
}) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayString());
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId),
    [categories, categoryId]
  );

  const isNewCategory = categoryId === "new";

  const validateForm = () => {
    if (!amount.trim()) return "Amount is required.";
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return "Amount must be greater than 0.";
    }

    if (!date.trim()) return "Date is required.";
    const parsedDate = new Date(date);
    if (parsedDate.toString() === "Invalid Date") return "Please enter a valid date.";
    if (new Date(date) > new Date(todayString())) return "Date cannot be in the future.";

    if (!categoryId) return "Category is required.";
    if (isNewCategory && !newCategoryName.trim()) return "New category name is required.";
    if (!description.trim()) return "Description is required.";
    if (notes.length > 500) return "Notes must be 500 characters or less.";
    return null;
  };

  const resetForm = () => {
    setAmount("");
    setDate(todayString());
    setCategoryId("");
    setNewCategoryName("");
    setDescription("");
    setNotes("");
  };

  const createCategoryFallback = async (name: string) => {
    const newCategory: CategoryOption = {
      id: getRandomCategoryId(),
      name,
      color: "#7C3AED",
      icon: "🆕"
    };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      let resolvedCategoryId = categoryId;

      if (isNewCategory) {
        const categoryName = newCategoryName.trim();
        const category = await (createCategory ? createCategory(categoryName, userId) : createCategoryFallback(categoryName));
        resolvedCategoryId = category.id;
      }

      const payload = {
        userId,
        categoryId: resolvedCategoryId,
        amount: parseFloat(amount),
        description: description.trim(),
        date,
        notes: notes.trim() || undefined
      };

      const response = await fetch(`${apiBaseUrl}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to create expense.");
      }

      resetForm();
      setSuccess("Expense submitted successfully.");
      setError(null);
      onSuccess?.(result);
    } catch (submitError: unknown) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("An unknown error occurred while saving your expense.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={{ padding: 24, minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={formCardStyle}>
        <header style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 28, color: "#0F172A" }}>Quick Expense Entry</h2>
          <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.6 }}>
            Capture amount, date, category, and notes in a responsive form that clears after successful submission.
          </p>
        </header>

        {success ? <div role="status" style={successStyle}>{success}</div> : null}
        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <div style={fieldStyle}>
              <label htmlFor="expense-amount" style={labelStyle}>Amount</label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                style={inputStyle}
                required
              />
              <span style={secondaryTextStyle}>Required. Enter a positive amount.</span>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="expense-date" style={labelStyle}>Date</label>
              <input
                id="expense-date"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                style={inputStyle}
                required
              />
              <span style={secondaryTextStyle}>Required. Cannot be a future date.</span>
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="expense-category" style={labelStyle}>Category</label>
            <select
              id="expense-category"
              name="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              style={inputStyle}
              required
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ""}{category.name}
                </option>
              ))}
              <option value="new">+ Add new category</option>
            </select>
            <span style={secondaryTextStyle}>Choose an existing category or create a new one.</span>
          </div>

          {isNewCategory ? (
            <div style={fieldStyle}>
              <label htmlFor="new-category-name" style={labelStyle}>New Category Name</label>
              <input
                id="new-category-name"
                name="newCategoryName"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                style={inputStyle}
                placeholder="e.g., Dining Out"
              />
              <span style={secondaryTextStyle}>Enter the new category before submitting.</span>
            </div>
          ) : null}

          <div style={fieldStyle}>
            <label htmlFor="expense-description" style={labelStyle}>Description</label>
            <input
              id="expense-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              style={inputStyle}
              placeholder="A short description of the expense"
              required
            />
            <span style={secondaryTextStyle}>Required by the backend API.</span>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="expense-notes" style={labelStyle}>Notes (optional)</label>
            <textarea
              id="expense-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: 108 }}
              placeholder="Add any optional context or reminder"
            />
            <span style={secondaryTextStyle}>{notes.length}/500 characters</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button type="submit" disabled={isSubmitting} style={buttonStyle}>
              {isSubmitting ? "Saving expense…" : "Save expense"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ExpenseEntryForm;
