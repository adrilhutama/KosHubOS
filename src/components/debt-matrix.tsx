"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Copy, MessageCircle } from "lucide-react";
import { buildDebts, toWhatsApp, type Split } from "@/lib/debts";

type Props = {
  houseName: string;
  splits: Split[];
  payTo: Record<string, string>;
};

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export function DebtMatrix({ houseName, splits, payTo }: Props) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const edges = useMemo(() => buildDebts(splits), [splits]);
  const message = useMemo(() => toWhatsApp(houseName, edges, payTo), [houseName, edges, payTo]);

  const onCopy = () =>
    startTransition(async () => {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });

  const onWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Siapa Utang Siapa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {edges.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-500" /> Semua lunas!
          </p>
        ) : (
          <ul className="space-y-2">
            {edges.map((e, i) => (
              <li
                key={`${e.from}-${e.to}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium">{e.fromName}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{e.toName}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{rp(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCopy} disabled={isPending}>
            {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
            {copied ? "Disalin!" : "Copy Text"}
          </Button>
          <Button size="sm" className="flex-1 bg-[#25D366] hover:bg-[#1fb857]" onClick={onWhatsApp}>
            <MessageCircle className="mr-1 h-4 w-4" /> Share WA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
