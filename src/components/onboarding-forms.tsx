"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { createHouse, joinHouse } from "@/app/onboarding/actions";

export function OnboardingForms() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const create = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = await createHouse({
        name: String(fd.get("name") ?? ""),
        address: String(fd.get("address") ?? ""),
      });
      if (res && (res as { error?: string }).error) setError((res as { error: string }).error);
    });

  const join = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      const res = await joinHouse({ inviteCode: String(fd.get("code") ?? "") });
      if (res && (res as { error?: string }).error) setError((res as { error: string }).error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create / Join House</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="join">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join Kode</TabsTrigger>
            <TabsTrigger value="create">Buat Baru</TabsTrigger>
          </TabsList>
          <TabsContent value="join" className="pt-3">
            <form action={join} className="space-y-3">
              <div>
                <Label htmlFor="code">Kode invite 6 karakter</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  minLength={6}
                  maxLength={6}
                  placeholder="KX7Q2M"
                  className="text-center font-mono text-lg font-bold uppercase tracking-[0.3em]"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gabung Kos
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="create" className="pt-3">
            <form action={create} className="space-y-3">
              <div>
                <Label htmlFor="name">Nama kos / house</Label>
                <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="Kos Mawar Blok B" />
              </div>
              <div>
                <Label htmlFor="address">Alamat (opsional)</Label>
                <Input id="address" name="address" maxLength={200} placeholder="Jl. ..." />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Buat & Jadi Owner
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
