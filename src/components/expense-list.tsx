"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Receipt } from "lucide-react";
import { settleSplit } from "@/app/(dashboard)/expenses/actions";
import { createClient } from "@/utils/supabase/client";

export type ExpenseWithSplits = {
  id: string;
  title: string;
  amount: number;
  category: string;
  receiptUrl: string | null;
  paidByName: string;
  createdAt: string;
  splits: { id: string; userId: string; userName: string; amountOwed: number; isSettled: boolean }[];
};

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export function ExpenseList({ items }: { items: ExpenseWithSplits[] }) {
  const [isPending, startTransition] = useTransition();
  const [settling, setSettling] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const router = useRouter();

  const settle = (splitId: string) => {
    setSettling(splitId);
    startTransition(async () => {
      await settleSplit(splitId);
      setSettling(null);
      router.refresh();
    });
  };

  const openReceipt = async (expenseId: string, path: string) => {
    setOpening(expenseId);
    const supabase = createClient();
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
    setOpening(null);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Belum ada pengeluaran. Tambah yang pertama 👆</p>;

  return (
    <div className="space-y-3">
      {items.map((e) => {
        const done = e.splits.length > 0 && e.splits.every((s) => s.isSettled);
        return (
          <Card key={e.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Dibayar {e.paidByName} • {new Date(e.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">{rp(e.amount)}</p>
                  <Badge variant={done ? "default" : "secondary"}>{done ? "Lunas" : e.category}</Badge>
                </div>
              </div>
              <ul className="space-y-1">
                {e.splits.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate">
                      {s.userName} • <span className="tabular-nums">{rp(s.amountOwed)}</span>
                    </span>
                    {s.isSettled ? (
                      <Badge variant="outline">
                        <Check className="mr-1 h-3 w-3" /> Lunas
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending && settling === s.id}
                        onClick={() => settle(s.id)}
                      >
                        {isPending && settling === s.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        Tandai Lunas
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {e.receiptUrl && (
                <Button size="sm" variant="ghost" disabled={opening === e.id} onClick={() => openReceipt(e.id, e.receiptUrl!)}>
                  {opening === e.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Receipt className="mr-1 h-3 w-3" />}
                  Lihat Struk
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
