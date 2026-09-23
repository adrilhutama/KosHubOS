import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuietBanner } from "@/components/quiet-banner";
import { DebtMatrix } from "@/components/debt-matrix";
import { CopyText } from "@/components/copy-text";
import type { Split } from "@/lib/debts";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("house_members")
    .select("house_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const houseId = membership.house_id as string;

  const today = new Date().toISOString().slice(0, 10);

  const [houseRes, membersRes, splitsRes, choresRes, guestsRes] = await Promise.all([
    supabase
      .from("houses")
      .select("id, name, address, invite_code, quiet_hours_start, quiet_hours_end")
      .eq("id", houseId)
      .single(),
    supabase.from("house_members").select("user_id, role").eq("house_id", houseId).eq("status", "active"),
    supabase
      .from("expense_splits")
      .select("user_id, amount_owed, is_settled, expenses!inner(paid_by)")
      .eq("house_id", houseId)
      .eq("is_settled", false)
      .limit(300),
    supabase.from("chores").select("id, title, assigned_to").eq("house_id", houseId).order("created_at").limit(5),
    supabase
      .from("guest_logs")
      .select("id, guest_name, is_overnight")
      .eq("house_id", houseId)
      .eq("visit_date", today)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!houseRes.data) redirect("/onboarding");
  const house = houseRes.data;

  const memberIds = (membersRes.data ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, payment_bank, payment_account").in("id", memberIds)
    : { data: [] as unknown as { id: string; full_name: string; payment_bank: string | null; payment_account: string | null }[] };

  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Penghuni"]));
  const payTo: Record<string, string> = {};
  for (const p of profiles ?? []) {
    if (p.payment_bank && p.payment_account) payTo[p.full_name || "Penghuni"] = `${p.payment_bank} ${p.payment_account}`;
  }

  type SplitRow = { user_id: string; amount_owed: number; is_settled: boolean; expenses: { paid_by: string } };
  const splits: Split[] = ((splitsRes.data ?? []) as unknown as SplitRow[]).map((s) => ({
    userId: s.user_id,
    name: nameOf.get(s.user_id) ?? "Penghuni",
    amountOwed: Number(s.amount_owed),
    paidBy: s.expenses.paid_by,
    isSettled: s.is_settled,
  }));

  const chores = (choresRes.data ?? []) as unknown as { id: string; title: string; assigned_to: string | null }[];
  const guests = (guestsRes.data ?? []) as unknown as { id: string; guest_name: string; is_overnight: boolean }[];
  const totalOwed = splits.reduce((a, s) => a + s.amountOwed, 0);

  return (
    <div className="space-y-4">
      <QuietBanner start={house.quiet_hours_start as string} end={house.quiet_hours_end as string} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">🏠 {house.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Invite:</span>
          <code className="rounded bg-muted px-2 py-1 font-mono font-bold tracking-widest">{house.invite_code}</code>
          <CopyText text={house.invite_code as string} label="Copy" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold tabular-nums">Rp{Math.round(totalOwed).toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-muted-foreground">Belum lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold tabular-nums">{chores.length}</p>
            <p className="text-[11px] text-muted-foreground">Piket aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold tabular-nums">{guests.length}</p>
            <p className="text-[11px] text-muted-foreground">Tamu hari ini</p>
          </CardContent>
        </Card>
      </div>

      <DebtMatrix houseName={house.name as string} splits={splits} payTo={payTo} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🧹 Piket Berikutnya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {chores.length === 0 && <p className="text-muted-foreground">Belum ada piket.</p>}
          {chores.map((c) => (
            <div key={c.id} className="flex justify-between gap-2">
              <span className="truncate">{c.title}</span>
              <Badge variant="secondary" className="shrink-0">
                {c.assigned_to ? nameOf.get(c.assigned_to) ?? "—" : "—"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🚪 Tamu Hari Ini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {guests.length === 0 && <p className="text-muted-foreground">Tidak ada tamu hari ini.</p>}
          {guests.map((g) => (
            <div key={g.id} className="flex justify-between gap-2">
              <span className="truncate">{g.guest_name}</span>
              {g.is_overnight && <Badge>Overnight</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
