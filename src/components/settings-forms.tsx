"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CopyText } from "@/components/copy-text";
import { updateProfile, updateQuietHours } from "@/app/(dashboard)/settings/actions";
import { createClient } from "@/utils/supabase/client";

type Props = {
  houseId: string;
  isOwner: boolean;
  email: string;
  houseName: string;
  inviteCode: string;
  quietStart: string;
  quietEnd: string;
  profile: { fullName: string; phoneNumber: string; paymentBank: string; paymentAccount: string };
};

export function SettingsForms(p: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const saveProfile = (fd: FormData) =>
    startTransition(async () => {
      setMsg(null);
      const res = (await updateProfile({
        fullName: String(fd.get("fullName") ?? ""),
        phoneNumber: String(fd.get("phoneNumber") ?? ""),
        paymentBank: String(fd.get("paymentBank") ?? ""),
        paymentAccount: String(fd.get("paymentAccount") ?? ""),
      })) as { ok?: boolean; error?: string };
      setMsg(res.ok ? "Profil tersimpan ✅" : (res.error ?? "Gagal."));
      router.refresh();
    });

  const saveQuiet = (fd: FormData) =>
    startTransition(async () => {
      setMsg(null);
      const res = (await updateQuietHours({
        houseId: p.houseId,
        start: String(fd.get("start")),
        end: String(fd.get("end")),
      })) as { ok?: boolean; error?: string };
      setMsg(res.ok ? "Quiet hours tersimpan 🌙" : (res.error ?? "Gagal."));
      router.refresh();
    });

  const signOut = () =>
    startTransition(async () => {
      await createClient().auth.signOut();
      router.push("/login");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profil & Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            {p.email} • No. rekening ini muncul di pesan WhatsApp tagihan.
          </p>
          <form action={saveProfile} className="space-y-3">
            <div>
              <Label htmlFor="fullName">Nama lengkap</Label>
              <Input id="fullName" name="fullName" required defaultValue={p.profile.fullName} />
            </div>
            <div>
              <Label htmlFor="phoneNumber">No. HP / WA</Label>
              <Input id="phoneNumber" name="phoneNumber" defaultValue={p.profile.phoneNumber} placeholder="08xx" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="paymentBank">Bank / E-wallet</Label>
                <Input id="paymentBank" name="paymentBank" defaultValue={p.profile.paymentBank} placeholder="BCA / GoPay / DANA" />
              </div>
              <div>
                <Label htmlFor="paymentAccount">No. Rekening</Label>
                <Input id="paymentAccount" name="paymentAccount" defaultValue={p.profile.paymentAccount} placeholder="1234567890" />
              </div>
            </div>
            <Button className="w-full" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Profil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kos — {p.houseName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Invite:</span>
            <code className="rounded bg-muted px-2 py-1 font-mono font-bold">{p.inviteCode}</code>
            <CopyText text={p.inviteCode} />
          </div>
          <form action={saveQuiet} className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qstart">Quiet start</Label>
              <Input id="qstart" name="start" type="time" required defaultValue={p.quietStart.slice(0, 5)} disabled={!p.isOwner} />
            </div>
            <div>
              <Label htmlFor="qend">Quiet end</Label>
              <Input id="qend" name="end" type="time" required defaultValue={p.quietEnd.slice(0, 5)} disabled={!p.isOwner} />
            </div>
            <Button className="col-span-2" disabled={pending || !p.isOwner}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Quiet Hours
            </Button>
            {!p.isOwner && <p className="col-span-2 text-xs text-muted-foreground">Hanya owner yang bisa mengubah.</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tampilan</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {msg && <p className="text-center text-sm text-muted-foreground">{msg}</p>}

      <Button variant="destructive" className="w-full" onClick={signOut} disabled={pending}>
        <LogOut className="mr-2 h-4 w-4" /> Keluar
      </Button>
    </div>
  );
}
