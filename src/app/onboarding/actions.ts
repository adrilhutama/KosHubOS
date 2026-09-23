"use server";

import { createClient } from "@/utils/supabase/server";
import { createHouseSchema, joinHouseSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export async function createHouse(input: unknown) {
  const parsed = createHouseSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid name" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu" };
  const { data: house, error } = await supabase
    .from("houses")
    .insert({ name: parsed.data.name, address: parsed.data.address ?? "", created_by: user.id })
    .select("id")
    .single();
  if (error || !house) return { error: error?.message ?? "Gagal buat house" };
  const { error: mErr } = await supabase
    .from("house_members")
    .insert({ house_id: house.id, user_id: user.id, role: "owner", status: "active" });
  if (mErr) return { error: mErr.message };
  redirect("/dashboard");
}

export async function joinHouse(input: unknown) {
  const parsed = joinHouseSchema.safeParse(input);
  if (!parsed.success) return { error: "Kode salah" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login dulu" };
  const { data: houseData, error: rpcError } = await supabase.rpc(
    "find_house_by_invite_code",
    { p_code: parsed.data.inviteCode }
  );

  const house = houseData?.[0];
  if (rpcError || !house) {
    return { error: "Kode tidak ditemukan" };
  }
  const { error } = await supabase.from("house_members").upsert(
    { house_id: house.id, user_id: user.id, role: "member", status: "active" },
    { onConflict: "house_id,user_id" }
  );
  if (error) return { error: error.message };
  redirect("/dashboard");
}
