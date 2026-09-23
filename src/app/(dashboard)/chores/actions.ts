"use server";

import { createClient } from "@/utils/supabase/server";
import { choreSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createChore(input: unknown) {
  const parsed = choreSchema.safeParse(input);
  if (!parsed.success) return { error: "Data piket tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("chores").insert({
    house_id: parsed.data.houseId,
    title: parsed.data.title,
    frequency: parsed.data.frequency,
    rotation_order: parsed.data.rotationOrder,
    rotation_index: 0,
    assigned_to: parsed.data.rotationOrder[0],
    is_completed: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function completeChore(choreId: string) {
  const supabase = await createClient();
  // DB trigger rotate_chore advances assigned_to & resets is_completed
  const { error } = await supabase.from("chores").update({ is_completed: true }).eq("id", choreId);
  if (error) return { error: error.message };
  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { ok: true };
}
