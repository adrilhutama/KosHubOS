"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { addExpense, setReceiptUrl } from "@/app/(dashboard)/expenses/actions";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/lib/image";

export function ExpenseForm({ houseId }: { houseId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onSubmit = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = (await addExpense({
        houseId,
        title: String(fd.get("title") ?? ""),
        amount: Number(fd.get("amount") ?? 0),
        category,
        splitType: "equal",
      })) as { ok?: boolean; id?: string; error?: unknown };
      if (!res.ok) {
        setError(typeof res.error === "string" ? res.error : "Gagal menyimpan.");
        return;
      }
      const file = fileRef.current?.files?.[0];
      if (file && res.id) {
        try {
          const blob = await compressImage(file);
          const supabase = createClient();
          const path = `${houseId}/${res.id}.jpg`;
          const { error: upErr } = await supabase.storage
            .from("receipts")
            .upload(path, blob, { contentType: "image/jpeg", upsert: true });
          if (!upErr) await setReceiptUrl(res.id, path);
        } catch {
          // receipt optional — expense already saved
        }
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pengeluaran Baru</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="title">Judul</Label>
            <Input id="title" name="title" required maxLength={120} placeholder="Listrik / Belanja / ..." />
          </div>
          <div>
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <Input id="amount" name="amount" type="number" min={1} step="any" required placeholder="150000" />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="groceries">Groceries</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="receipt">Struk (opsional, dikompres otomatis)</Label>
            <Input id="receipt" ref={fileRef} type="file" accept="image/*" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan & Split Rata
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
