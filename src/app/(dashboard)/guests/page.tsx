import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { GuestManager, type GuestItem } from "@/components/guest-manager";

export default async function GuestsPage() {
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

  const { data } = await supabase
    .from("guest_logs")
    .select("id, guest_name, visit_date, is_overnight, notes, logged_by")
    .eq("house_id", houseId)
    .order("visit_date", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as {
    id: string;
    guest_name: string;
    visit_date: string;
    is_overnight: boolean;
    notes: string;
    logged_by: string | null;
  }[];
  const loggerIds = Array.from(new Set(rows.map((r) => r.logged_by).filter(Boolean))) as string[];
  const { data: profiles } = loggerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", loggerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Penghuni"]));

  const today = new Date().toISOString().slice(0, 10);
  const items: GuestItem[] = rows.map((r) => ({
    id: r.id,
    guestName: r.guest_name,
    visitDate: r.visit_date,
    isOvernight: r.is_overnight,
    notes: r.notes ?? "",
    loggedByName: r.logged_by ? nameOf.get(r.logged_by) ?? "—" : "—",
    upcoming: r.visit_date >= today,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Buku Tamu</h1>
      <GuestManager houseId={houseId} initial={items} />
    </div>
  );
}
