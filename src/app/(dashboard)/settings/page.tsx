import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForms } from "@/components/settings-forms";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("house_members")
    .select("house_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const houseId = membership.house_id as string;
  const isOwner = (membership.role as string) === "owner";

  const [{ data: profile }, { data: house }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone_number, payment_bank, payment_account").eq("id", user.id).single(),
    supabase.from("houses").select("name, invite_code, quiet_hours_start, quiet_hours_end").eq("id", houseId).single(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pengaturan</h1>
      <SettingsForms
        houseId={houseId}
        isOwner={isOwner}
        email={user.email ?? ""}
        houseName={(house?.name as string) ?? ""}
        inviteCode={(house?.invite_code as string) ?? ""}
        quietStart={(house?.quiet_hours_start as string) ?? "22:00"}
        quietEnd={(house?.quiet_hours_end as string) ?? "06:00"}
        profile={{
          fullName: (profile?.full_name as string) ?? "",
          phoneNumber: (profile?.phone_number as string) ?? "",
          paymentBank: (profile?.payment_bank as string) ?? "",
          paymentAccount: (profile?.payment_account as string) ?? "",
        }}
      />
    </div>
  );
}
