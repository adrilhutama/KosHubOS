import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForms } from "@/components/onboarding-forms";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase
    .from("house_members")
    .select("house_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (m) redirect("/dashboard");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-4">
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold">Selamat datang 👋</h1>
        <p className="text-sm text-muted-foreground">Buat kos baru atau gabung pakai kode.</p>
      </div>
      <OnboardingForms />
    </div>
  );
}
