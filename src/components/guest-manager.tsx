"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { addGuest, deleteGuest } from "@/app/(dashboard)/guests/actions";

export type GuestItem = {
  id: string;
  guestName: string;
  visitDate: string;
  isOvernight: boolean;
  notes: string;
  loggedByName: string;
  upcoming: boolean;
};

export function GuestManager({ houseId, initial }: { houseId: string; initial: GuestItem[] }) {
  const [open, setOpen] = useState(false);
  const [overnight, setOvernight] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const upcoming = initial.filter((g) => g.upcoming);
  const past = initial.filter((g) => !g.upcoming);

  const create = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = (await addGuest({
        houseId,
        guestName: String(fd.get("guestName") ?? ""),
        visitDate: String(fd.get("visitDate") ?? new Date().toISOString().slice(0, 10)),
        isOvernight: overnight,
        notes: String(fd.get("notes") ?? ""),
      })) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(res.error ?? "Gagal.");
        return;
      }
      setOpen(false);
      setOvernight(false);
      router.refresh();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteGuest(id);
      router.refresh();
    });

  const Row = ({ g }: { g: GuestItem }) => (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 p-3 text-sm">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {g.guestName} {g.isOvernight && <Badge className="ml-1">Overnight</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {g.visitDate} • oleh {g.loggedByName}
          </p>
          {g.notes && <p className="mt-1 line-clamp-2 text-muted-foreground">{g.notes}</p>}
        </div>
        <Button size="icon" variant="ghost" disabled={isPending} onClick={() => remove(g.id)} aria-label="Hapus">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Lapor Tamu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Tamu Baru</DialogTitle>
            </DialogHeader>
            <form action={create} className="space-y-3">
              <div>
                <Label htmlFor="gname">Nama tamu</Label>
                <Input id="gname" name="guestName" required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="gdate">Tanggal kunjungan</Label>
                <Input id="gdate" name="visitDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <Label htmlFor="overnight">Menginap (overnight)</Label>
                <Switch id="overnight" checked={overnight} onCheckedChange={setOvernight} />
              </div>
              <div>
                <Label htmlFor="gnotes">Catatan</Label>
                <Textarea id="gnotes" name="notes" maxLength={500} placeholder="Jam datang, kamar, dll." />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mendatang & Hari Ini ({upcoming.length})</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada tamu terjadwal.</p>}
        {upcoming.map((g) => (
          <Row key={g.id} g={g} />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Riwayat ({past.length})</h2>
        {past.map((g) => (
          <Row key={g.id} g={g} />
        ))}
      </section>
    </div>
  );
}
