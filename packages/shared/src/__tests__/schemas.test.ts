import { describe, expect, test } from "vitest";
import {
  registerSchema, loginSchema, createChildSchema, updateProfileSchema,
  practiceCompleteSchema, createClassSchema, joinClassSchema,
  createAssignmentSchema, createEncouragementSchema, upsertAyahProgressSchema,
  switchProfileSchema, adminDeleteUsersSchema, forgotPasswordSchema, resetPasswordSchema,
} from "../schemas";

const email = "test@example.com";
const password = "secret123";

describe("registerSchema", () => {
  test("valid payload", () => {
    const { success, data } = registerSchema.safeParse({ displayName: "Budi", email, password, role: "student" });
    expect(success).toBe(true);
    if (success) {
      expect(data.displayName).toBe("Budi");
      expect(data.email).toBe(email);
    }
  });

  test("rejects invalid role (admin)", () => {
    const { success } = registerSchema.safeParse({ displayName: "Budi", email, password, role: "admin" });
    expect(success).toBe(false);
  });

  test("trims whitespace", () => {
    const { success, data } = registerSchema.safeParse({ displayName: "  Budi  ", email: "Test@Example.com", password, role: "student" });
    expect(success).toBe(true);
    if (success) {
      expect(data.displayName).toBe("Budi");
      expect(data.email).toBe("test@example.com");
    }
  });

  test("rejects short password", () => {
    const { success } = registerSchema.safeParse({ displayName: "Budi", email, password: "123", role: "student" });
    expect(success).toBe(false);
  });
});

describe("loginSchema", () => {
  test("valid", () => {
    const { success, data } = loginSchema.safeParse({ email, password });
    expect(success).toBe(true);
    if (success) expect(data.email).toBe(email);
  });

  test("rejects invalid email", () => {
    const { success } = loginSchema.safeParse({ email: "not-an-email", password });
    expect(success).toBe(false);
  });
});

describe("createChildSchema", () => {
  test("valid birth date", () => {
    const { success } = createChildSchema.safeParse({ displayName: "Anak", gender: "L", birthDate: "2020-01-15" });
    expect(success).toBe(true);
  });

  test("rejects future birth date", () => {
    const { success } = createChildSchema.safeParse({ displayName: "Anak", gender: "L", birthDate: "2099-01-01" });
    expect(success).toBe(false);
  });

  test("rejects invalid date format", () => {
    const { success } = createChildSchema.safeParse({ displayName: "Anak", gender: "L", birthDate: "01-15-2020" });
    expect(success).toBe(false);
  });
});

describe("practiceCompleteSchema", () => {
  test("valid", () => {
    const { success } = practiceCompleteSchema.safeParse({ surahId: 1, startAyah: 1, endAyah: 5, loops: 3, duration: 120 });
    expect(success).toBe(true);
  });

  test("startAyah > endAyah rejected", () => {
    const { success } = practiceCompleteSchema.safeParse({ surahId: 1, startAyah: 5, endAyah: 3, loops: 3, duration: 120 });
    expect(success).toBe(false);
  });
});

describe("createAssignmentSchema", () => {
  test("valid with classId", () => {
    const { success } = createAssignmentSchema.safeParse({ classId: 1, surahId: 1, startAyah: 1, endAyah: 5, targetLoops: 5 });
    expect(success).toBe(true);
  });

  test("valid with studentId", () => {
    const { success } = createAssignmentSchema.safeParse({ studentId: 1, surahId: 1, startAyah: 1, endAyah: 5, targetLoops: 5 });
    expect(success).toBe(true);
  });

  test("rejects when no classId nor studentId", () => {
    const { success } = createAssignmentSchema.safeParse({ surahId: 1, startAyah: 1, endAyah: 5, targetLoops: 5 });
    expect(success).toBe(false);
  });

  test("rejects endAyah < startAyah", () => {
    const { success } = createAssignmentSchema.safeParse({ classId: 1, surahId: 1, startAyah: 5, endAyah: 3, targetLoops: 5 });
    expect(success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  test("all fields optional", () => {
    const { success, data } = updateProfileSchema.safeParse({});
    expect(success).toBe(true);
    if (success) expect(data).toEqual({});
  });

  test("valid with partial fields", () => {
    const { success } = updateProfileSchema.safeParse({ displayName: "Budi" });
    expect(success).toBe(true);
  });

  test("rejects invalid dailyTarget", () => {
    const { success } = updateProfileSchema.safeParse({ dailyTarget: 0 });
    expect(success).toBe(false);
  });
});

describe("joinClassSchema", () => {
  test("transforms to uppercase", () => {
    const { success, data } = joinClassSchema.safeParse({ joinCode: " abc " });
    expect(success).toBe(true);
    if (success) expect(data.joinCode).toBe("ABC");
  });
});

describe("adminDeleteUsersSchema", () => {
  test("valid with ids", () => {
    const { success } = adminDeleteUsersSchema.safeParse({ ids: [1, 2, 3] });
    expect(success).toBe(true);
  });

  test("rejects empty array", () => {
    const { success } = adminDeleteUsersSchema.safeParse({ ids: [] });
    expect(success).toBe(false);
  });

  test("rejects negative ids", () => {
    const { success } = adminDeleteUsersSchema.safeParse({ ids: [-1] });
    expect(success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  test("valid email", () => {
    const { success } = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(success).toBe(true);
  });

  test("rejects invalid email", () => {
    const { success } = forgotPasswordSchema.safeParse({ email: "invalid" });
    expect(success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  test("valid", () => {
    const { success } = resetPasswordSchema.safeParse({ token: "abc123", password: "newpass123" });
    expect(success).toBe(true);
  });

  test("rejects short password", () => {
    const { success } = resetPasswordSchema.safeParse({ token: "abc123", password: "123" });
    expect(success).toBe(false);
  });

  test("rejects empty token", () => {
    const { success } = resetPasswordSchema.safeParse({ token: "", password: "newpass123" });
    expect(success).toBe(false);
  });
});

describe("createEncouragementSchema", () => {
  test("valid", () => {
    const { success } = createEncouragementSchema.safeParse({ childId: 1, message: "Semangat!" });
    expect(success).toBe(true);
  });

  test("trims message", () => {
    const { success, data } = createEncouragementSchema.safeParse({ childId: 1, message: "  Hello  " });
    expect(success).toBe(true);
    if (success) expect(data.message).toBe("Hello");
  });
});

describe("switchProfileSchema", () => {
  test("valid", () => {
    const { success } = switchProfileSchema.safeParse({ userId: 1 });
    expect(success).toBe(true);
  });

  test("rejects zero", () => {
    const { success } = switchProfileSchema.safeParse({ userId: 0 });
    expect(success).toBe(false);
  });
});
