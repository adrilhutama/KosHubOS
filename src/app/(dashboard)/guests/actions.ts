"use server";

import { createClient } from "@/utils/supabase/server";
import { guestSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function addGuest(input: unknown) {
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) return { error: "Data tamu tidak valid." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("guest_logs").insert({
    house_id: parsed.data.houseId,
    logged_by: user.id,
    guest_name: parsed.data.guestName,
    visit_date: parsed.data.visitDate,
    is_overnight: parsed.data.isOvernight,
    notes: parsed.data.notes,
  });
  if (error) return { error: error.message };
  revalidatePath("/guests");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteGuest(id: string) {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "ID tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("guest_logs").delete().eq("id", parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/guests");
  return { ok: true };
}
