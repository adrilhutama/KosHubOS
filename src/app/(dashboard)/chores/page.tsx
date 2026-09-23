import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ChoreManager, type ChoreItem, type MemberOpt } from "@/components/chore-manager";

export default async function ChoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase
    .from("house_members")
    .select("house_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const houseId = membership.house_id as string;

  const [{ data: chores }, { data: members }] = await Promise.all([
    supabase.from("chores").select("id, title, frequency, assigned_to").eq("house_id", houseId).order("created_at"),
    supabase.from("house_members").select("user_id").eq("house_id", houseId).eq("status", "active"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Penghuni"]));

  const items: ChoreItem[] = (
    (chores ?? []) as unknown as { id: string; title: string; frequency: string; assigned_to: string | null }[]
  ).map((c) => ({
    id: c.id,
    title: c.title,
    frequency: c.frequency,
    assignedTo: c.assigned_to,
    assignedName: c.assigned_to ? nameOf.get(c.assigned_to) ?? "—" : "—",
  }));
  const memberOpts: MemberOpt[] = (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name || "Penghuni" }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Piket & Tugas</h1>
      <ChoreManager houseId={houseId} initial={items} members={memberOpts} />
    </div>
  );
}
