"use server";

import { createClient } from "@/utils/supabase/server";
import { profileSchema, quietSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function updateProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "Profil tidak valid." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone_number: parsed.data.phoneNumber || null,
      payment_bank: parsed.data.paymentBank || null,
      payment_account: parsed.data.paymentAccount || null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateQuietHours(input: unknown) {
  const parsed = quietSchema.safeParse(input);
  if (!parsed.success) return { error: "Jam tidak valid (HH:MM)." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: m } = await supabase
    .from("house_members")
    .select("role")
    .eq("house_id", parsed.data.houseId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if ((m?.role as string) !== "owner") return { error: "Hanya owner yang bisa ubah quiet hours." };
  const { error } = await supabase
    .from("houses")
    .update({ quiet_hours_start: parsed.data.start, quiet_hours_end: parsed.data.end })
    .eq("id", parsed.data.houseId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
