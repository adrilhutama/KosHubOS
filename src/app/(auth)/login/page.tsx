"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const passwordAuth = (mode: "in" | "up", fd: FormData) =>
    startTransition(async () => {
      setError(null);
      setInfo(null);
      const email = String(fd.get("email") ?? "").trim();
      const password = String(fd.get("password") ?? "");
      const res =
        mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });
      if (res.error) {
        setError(res.error.message);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    });

  const magicLink = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      setInfo(null);
      const email = String(fd.get("magic-email") ?? "").trim();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setInfo("Cek email kamu — klik magic link untuk masuk ✨");
    });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-4">
      <div className="mb-6 text-center">
        <p className="text-3xl">🏠</p>
        <h1 className="mt-1 text-2xl font-bold">KosHubOS</h1>
        <p className="text-sm text-muted-foreground">Kelola kos bareng, tanpa drama.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Masuk / Daftar</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="magic">Magic Link</TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="space-y-3 pt-3">
              <form action={(fd) => passwordAuth("in", fd)} className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}
                <Button className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Masuk
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  formAction={(fd) => passwordAuth("up", fd)}
                  disabled={isPending}
                >
                  Daftar Akun Baru
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="magic" className="pt-3">
              <form action={magicLink} className="space-y-3">
                <div>
                  <Label htmlFor="magic-email">Email</Label>
                  <Input id="magic-email" name="magic-email" type="email" required placeholder="kamu@email.com" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}
                <Button className="w-full" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Kirim Magic Link
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
