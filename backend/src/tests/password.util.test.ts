import { hashPassword, comparePassword, validatePasswordStrength, validateEmail, sanitizeInput } from "../utils/password.js";

describe("Password utilities", () => {
  test("validatePasswordStrength accepts a strong password", () => {
    const result = validatePasswordStrength("StrongPass123!");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("validatePasswordStrength rejects a weak password", () => {
    const result = validatePasswordStrength("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Password must be at least 8 characters long",
        "Password must contain at least one uppercase letter",
        "Password must contain at least one number",
        "Password must contain at least one special character",
      ])
    );
  });

  test("hashPassword and comparePassword work together", async () => {
    const plain = "TestPass123!";
    const hashed = await hashPassword(plain);
    expect(typeof hashed).toBe("string");
    expect(hashed).not.toBe(plain);
    expect(await comparePassword(plain, hashed)).toBe(true);
  });

  test("validateEmail returns valid email results", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("not-an-email")).toBe(false);
  });

  test("sanitizeInput removes angle brackets", () => {
    expect(sanitizeInput("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
  });
});
