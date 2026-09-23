"use server";

import { createClient } from "@/utils/supabase/server";
import { expenseSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function addExpense(input: unknown) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { houseId, title, amount, category, splitType, splits } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: members } = await supabase
    .from("house_members")
    .select("user_id")
    .eq("house_id", houseId)
    .eq("status", "active");
  if (!members?.length) return { error: "House not found" };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      house_id: houseId,
      paid_by: user.id,
      title,
      amount,
      category,
      split_type: splitType,
    })
    .select("id")
    .single();
  if (error || !expense) return { error: error?.message ?? "Insert failed" };

  let rows: { expense_id: string; house_id: string; user_id: string; amount_owed: number }[];
  if (splitType === "custom" && splits?.length) {
    const total = splits.reduce((a, s) => a + s.amount, 0);
    if (Math.abs(total - amount) > 1)
      return { error: `Custom splits sum to ${total}, must equal ${amount}` };
    rows = splits.map((s) => ({
      expense_id: expense.id,
      house_id: houseId,
      user_id: s.userId,
      amount_owed: s.amount,
    }));
  } else {
    const share = Math.floor((amount / members.length) * 100) / 100;
    const remainder = Math.round((amount - share * members.length) * 100) / 100;
    rows = members.map((m, idx) => ({
      expense_id: expense.id,
      house_id: houseId,
      user_id: m.user_id as string,
      amount_owed: idx === 0 ? share + remainder : share,
    }));
  }
  const { error: sErr } = await supabase.from("expense_splits").insert(rows);
  if (sErr) return { error: sErr.message };
  revalidatePath("/expenses");
  return { ok: true, id: expense.id };
}

export async function settleSplit(splitId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_splits")
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq("id", splitId);
  if (error) return { error: error.message };
  revalidatePath("/expenses");
  return { ok: true };
}

export async function setReceiptUrl(expenseId: string, path: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update({ receipt_url: path }).eq("id", expenseId);
  if (error) return { error: error.message };
  revalidatePath("/expenses");
  return { ok: true };
}
