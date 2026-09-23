"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DoorOpen, LayoutDashboard, ListChecks, ReceiptText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Iuran", icon: ReceiptText },
  { href: "/chores", label: "Piket", icon: ListChecks },
  { href: "/guests", label: "Tamu", icon: DoorOpen },
  { href: "/settings", label: "Setting", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid w-full max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)] md:max-w-3xl">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("rounded-full px-3 py-1", active && "bg-primary/10")}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
