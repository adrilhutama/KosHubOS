export type Split = {
  userId: string;
  name: string;
  amountOwed: number;
  paidBy: string;
  isSettled: boolean;
};

export type DebtEdge = {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
};

/** Greedy debt-reduction: net balances -> minimal "A owes B" transactions. */
export function buildDebts(splits: Split[]): DebtEdge[] {
  const map = new Map<string, { name: string; net: number }>();
  for (const s of splits.filter((s) => !s.isSettled)) {
    if (!map.has(s.userId)) map.set(s.userId, { name: s.name, net: 0 });
    if (!map.has(s.paidBy)) map.set(s.paidBy, { name: "", net: 0 });
    map.get(s.userId)!.net -= s.amountOwed;
    map.get(s.paidBy)!.net += s.amountOwed;
  }
  // Fill missing creditor names from any split where they appear as debtor
  for (const s of splits) {
    const entry = map.get(s.paidBy);
    if (entry && !entry.name) entry.name = s.name && s.userId === s.paidBy ? s.name : entry.name;
  }
  const debtors = [...map.entries()]
    .filter(([, v]) => v.net < -0.5)
    .sort((a, b) => a[1].net - b[1].net);
  const creditors = [...map.entries()]
    .filter(([, v]) => v.net > 0.5)
    .sort((a, b) => b[1].net - a[1].net);
  const edges: DebtEdge[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const [dId, d] = debtors[i];
    const [cId, c] = creditors[j];
    const amt = Math.min(-d.net, c.net);
    if (amt > 0.5)
      edges.push({
        from: dId,
        fromName: d.name || "Penghuni",
        to: cId,
        toName: c.name || "Penghuni",
        amount: Math.round(amt),
      });
    d.net += amt;
    c.net -= amt;
    if (Math.abs(d.net) < 0.5) i++;
    if (Math.abs(c.net) < 0.5) j++;
  }
  return edges;
}

export function toWhatsApp(
  houseName: string,
  edges: Pick<DebtEdge, "fromName" | "toName" | "amount">[],
  payTo: Record<string, string>
): string {
  const lines = edges.map(
    (e) =>
      `• ${e.fromName} → ${e.toName}: Rp${Math.round(e.amount).toLocaleString("id-ID")}${
        payTo[e.toName] ? ` (${payTo[e.toName]})` : ""
      }`
  );
  return `\u{1F3E0} *${houseName} — Tagihan Kos*\n${lines.join("\n") || "✅ Semua lunas!"}\n\nBayar sebelum tanggal 5 ya \u{1F64F}`;
}

export function isQuietNow(start: string, end: string, now = new Date()): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}
