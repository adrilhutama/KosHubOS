import { z } from "zod";

export const createHouseSchema = z.object({
  name: z.string().min(2).max(80),
  address: z.string().max(200).optional().default(""),
});

export const joinHouseSchema = z.object({
  inviteCode: z
    .string()
    .regex(/^[A-Z2-9]{6}$/i, "6-character code")
    .transform((s) => s.toUpperCase()),
});

export const expenseSchema = z.object({
  houseId: z.string().uuid(),
  title: z.string().min(1).max(120),
  amount: z.coerce.number().positive().max(999999999),
  category: z
    .enum(["utilities", "groceries", "maintenance", "other"])
    .default("other"),
  splitType: z.enum(["equal", "custom"]).default("equal"),
  splits: z
    .array(
      z.object({ userId: z.string().uuid(), amount: z.coerce.number().min(0) })
    )
    .optional(),
});

export const guestSchema = z.object({
  houseId: z.string().uuid(),
  guestName: z.string().min(1).max(120),
  visitDate: z.string(),
  isOvernight: z.boolean().default(false),
  notes: z.string().max(500).default(""),
});

export const choreSchema = z.object({
  houseId: z.string().uuid(),
  title: z.string().min(1).max(120),
  frequency: z.enum(["daily", "weekly", "custom"]).default("weekly"),
  rotationOrder: z.array(z.string().uuid()).min(1, "Pick at least 1 member"),
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(80),
  phoneNumber: z.string().max(20).optional().default(""),
  paymentBank: z.string().max(40).optional().default(""),
  paymentAccount: z.string().max(40).optional().default(""),
});

export const quietSchema = z.object({
  houseId: z.string().uuid(),
  start: z.string().regex(/^\d{2}:\d{2}/),
  end: z.string().regex(/^\d{2}:\d{2}/),
});
