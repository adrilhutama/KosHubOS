"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const TABLES = ["expenses", "expense_splits", "chores", "guest_logs"] as const;

export function RealtimeListener({ houseId }: { houseId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!houseId) return;
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase.channel(`house-changes-${houseId}`);
    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `house_id=eq.${houseId}` },
        scheduleRefresh
      );
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [houseId, router]);

  return null;
}
