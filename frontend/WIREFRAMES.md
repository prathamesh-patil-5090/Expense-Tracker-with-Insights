# Expense Entry Form Wireframes

## Desktop View

- Card-based form centered on the page with a subtle shadow and rounded corners.
- Two-column grid for the top row:
  - Left: amount input.
  - Right: date picker.
- Full-width category selector below the first row.
- Optional new category input appears inline when "Add new category" is selected.
- Description and notes fields each span full width.
- Primary action button aligned to the right.
- Confirmation banner appears above the form after successful submission.

### Desktop layout

```
+-------------------------------------------------------------+
| Quick Expense Entry                                         |
| Capture amount, date, category, and notes in a responsive    |
| form that clears after successful submission.               |
|-------------------------------------------------------------|
| Amount [__________]   Date [__________]                     |
| Category [Groceries v]                                     |
| New category [Dining Out________]                          |
| Description [__________]                                   |
| Notes [______________________________]                      |
| [ Save expense ]                                           |
+-------------------------------------------------------------+
```

## Mobile View

- Single-column layout with full-width fields.
- Larger touch-friendly inputs and spacing.
- Category dropdown and new category input stacked vertically.
- Submit button remains visible below the form.

### Mobile layout

```
+-----------------------------------------------+
| Quick Expense Entry                           |
|                                               |
| Amount [__________]                           |
| Date [__________]                             |
| Category [Groceries v]                        |
| New category [Dining Out________]             |
| Description [__________]                      |
| Notes [______________________________]        |
| [ Save expense ]                              |
+-----------------------------------------------+
```

## Interaction notes

- Required fields are validated on submit with inline error messaging.
- Selecting "Add new category" reveals a text field.
- Successful submission resets inputs and displays a confirmation message.
- The form is intentionally simple to reduce cognitive load and speed entry.
