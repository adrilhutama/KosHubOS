"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Plus, RotateCw } from "lucide-react";
import { completeChore, createChore } from "@/app/(dashboard)/chores/actions";

export type ChoreItem = {
  id: string;
  title: string;
  frequency: string;
  assignedTo: string | null;
  assignedName: string;
};
export type MemberOpt = { id: string; name: string };

export function ChoreManager({
  houseId,
  initial,
  members,
}: {
  houseId: string;
  initial: ChoreItem[];
  members: MemberOpt[];
}) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState("weekly");
  const [picked, setPicked] = useState<string[]>(members.map((m) => m.id));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const done = (id: string) => {
    setCompleting(id);
    startTransition(async () => {
      await completeChore(id);
      setCompleting(null);
      router.refresh();
    });
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      if (picked.length === 0) {
        setError("Pilih minimal 1 anggota.");
        return;
      }
      const res = (await createChore({
        houseId,
        title: String(fd.get("title") ?? ""),
        frequency: freq,
        rotationOrder: picked,
      })) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(res.error ?? "Gagal.");
        return;
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Piket Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Buat Piket Rotasi</DialogTitle>
            </DialogHeader>
            <form action={create} className="space-y-3">
              <div>
                <Label htmlFor="ctitle">Nama tugas</Label>
                <Input id="ctitle" name="title" required maxLength={120} placeholder="Sapu lantai / Cuci piring" />
              </div>
              <div>
                <Label>Frekuensi</Label>
                <Select value={freq} onValueChange={setFreq}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urutan giliran (centang sesuai urutan anggota)</Label>
                <div className="mt-1 space-y-1">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={picked.includes(m.id)}
                        onChange={() => toggle(m.id)}
                        className="h-4 w-4 accent-current"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {initial.length === 0 && <p className="text-sm text-muted-foreground">Belum ada piket. Buat yang pertama 👆</p>}
      {initial.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{c.title}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RotateCw className="h-3 w-3" /> {c.frequency} • Giliran:{" "}
                <Badge variant="secondary">{c.assignedName}</Badge>
              </p>
            </div>
            <Button size="sm" disabled={completing === c.id} onClick={() => done(c.id)}>
              {completing === c.id ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              Selesai
            </Button>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">
        Menekan “Selesai” otomatis memutar giliran ke anggota berikutnya (trigger DB).
      </p>
    </div>
  );
}
