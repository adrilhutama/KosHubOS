"use client";

import { useEffect, useState } from "react";
import { MoonStar } from "lucide-react";
import { isQuietNow } from "@/lib/debts";

function fmt(t: string) {
  return t.slice(0, 5);
}

export function QuietBanner({ start, end }: { start: string; end: string }) {
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    const check = () => setQuiet(isQuietNow(start, end));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [start, end]);

  if (!quiet) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm"
    >
      <MoonStar className="h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Quiet Hours {fmt(start)}–{fmt(end)}.</span>{" "}
        <span className="opacity-80">Do Not Disturb</span>
      </p>
    </div>
  );
}
