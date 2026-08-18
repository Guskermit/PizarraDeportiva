"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Users, ClipboardList, LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getInitials, cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/forms/SubmitButton";

type NavItem = { href: string; label: string; icon: LucideIcon };

function ClubBrand({ clubName, clubLogoUrl }: { clubName?: string; clubLogoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      {clubLogoUrl ? (
        <Avatar size="default">
          <AvatarImage src={clubLogoUrl} alt={clubName ?? "Club"} />
        </Avatar>
      ) : clubName ? (
        <Avatar size="default">
          <AvatarFallback>{getInitials(clubName)}</AvatarFallback>
        </Avatar>
      ) : (
        <span className="text-lg"> ⚽ </span>
      )}
      <span className="truncate text-sm font-semibold text-foreground">
        {clubName ?? "Pizarra Deportiva"}
      </span>
    </div>
  );
}

function SidebarContent({
  navItems,
  pathname,
  clubName,
  clubLogoUrl,
  userName,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  clubName?: string;
  clubLogoUrl?: string | null;
  userName?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <ClubBrand clubName={clubName} clubLogoUrl={clubLogoUrl} />

      <nav className="flex flex-1 flex-col gap-1 pt-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t pt-4">
        {userName && (
          <div className="flex items-center gap-2 px-2">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">{userName}</span>
          </div>
        )}
        <form action={logout} onSubmit={onNavigate}>
          <SubmitButton variant="tertiary" size="sm" className="w-full justify-start">
            <LogOut />
            Cerrar sesión
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function AppSidebar({
  clubName,
  clubLogoUrl,
  userName,
}: {
  clubName?: string;
  clubLogoUrl?: string | null;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    ...(clubName ? [{ href: "/club", label: "Club", icon: ShieldCheck }] : []),
    { href: "/teams", label: "Equipos", icon: Users },
    { href: "/plays", label: "Jugadas", icon: ClipboardList },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r bg-card p-4 md:flex">
        <SidebarContent
          navItems={navItems}
          pathname={pathname}
          clubName={clubName}
          clubLogoUrl={clubLogoUrl}
          userName={userName}
        />
      </aside>

      {/* Mobile top bar + hamburger menu */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-card p-2 md:hidden">
        <ClubBrand clubName={clubName} clubLogoUrl={clubLogoUrl} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" aria-label="Abrir menú" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <SidebarContent
              navItems={navItems}
              pathname={pathname}
              clubName={clubName}
              clubLogoUrl={clubLogoUrl}
              userName={userName}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}


