import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { RealtimeListener } from "@/components/realtime-listener";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("house_members")
    .select("house_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");
  const houseId = membership.house_id as string;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-20 md:max-w-3xl">
      <RealtimeListener houseId={houseId} />
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
