import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList, type ExpenseWithSplits } from "@/components/expense-list";

export default async function ExpensesPage() {
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

  const [{ data: expenses }, { data: splits }, { data: members }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, title, amount, category, receipt_url, paid_by, created_at")
      .eq("house_id", houseId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("expense_splits").select("id, expense_id, user_id, amount_owed, is_settled").eq("house_id", houseId).limit(500),
    supabase.from("house_members").select("user_id").eq("house_id", houseId).eq("status", "active"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Penghuni"]));

  const byExpense = new Map<string, ExpenseWithSplits["splits"]>();
  for (const s of (splits ?? []) as unknown as {
    id: string;
    expense_id: string;
    user_id: string;
    amount_owed: number;
    is_settled: boolean;
  }[]) {
    const arr = byExpense.get(s.expense_id) ?? [];
    arr.push({
      id: s.id,
      userId: s.user_id,
      userName: nameOf.get(s.user_id) ?? "—",
      amountOwed: Number(s.amount_owed),
      isSettled: s.is_settled,
    });
    byExpense.set(s.expense_id, arr);
  }

  const items: ExpenseWithSplits[] = (
    (expenses ?? []) as unknown as {
      id: string;
      title: string;
      amount: number;
      category: string;
      receipt_url: string | null;
      paid_by: string;
      created_at: string;
    }[]
  ).map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    category: e.category,
    receiptUrl: e.receipt_url,
    paidByName: nameOf.get(e.paid_by) ?? "—",
    createdAt: e.created_at,
    splits: byExpense.get(e.id) ?? [],
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Iuran & Split Bill</h1>
        <ExpenseForm houseId={houseId} />
      </div>
      <ExpenseList items={items} />
    </div>
  );
}
