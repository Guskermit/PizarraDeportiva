"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type NavItem = { href: string; label: string; icon: LucideIcon };

function ClubBrand({
  clubName,
  clubLogoUrl,
  collapsed,
  onToggleCollapse,
}: {
  clubName?: string;
  clubLogoUrl?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 py-3",
        collapsed ? "justify-center px-0" : "px-2"
      )}
    >
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
      {!collapsed && (
        <>
          <span className="truncate text-sm font-semibold text-foreground">
            {clubName ?? "Pizarra Deportiva"}
          </span>
          <span
            className="ml-auto size-2 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--club-primary, var(--primary))" }}
            title="Color del club"
          />
        </>
      )}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          onClick={onToggleCollapse}
          className={cn(
            "shrink-0",
            collapsed &&
              "absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-sidebar shadow-sm"
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      )}
    </div>
  );
}

function SidebarContent({
  navItems,
  pathname,
  clubName,
  clubLogoUrl,
  userName,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  clubName?: string;
  clubLogoUrl?: string | null;
  userName?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <ClubBrand
        clubName={clubName}
        clubLogoUrl={clubLogoUrl}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />

      <nav className={cn("flex flex-1 flex-col gap-1 pt-4", collapsed && "items-center")}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon className="size-4" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("flex flex-col gap-3 border-t pt-4", collapsed && "items-center")}>
        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between px-2")}>
          {userName && !collapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm">
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">{userName}</span>
            </div>
          )}
          <ThemeToggle />
        </div>
        <form action={logout} onSubmit={onNavigate}>
          <SubmitButton
            variant="tertiary"
            size="sm"
            className={cn("w-full justify-start", collapsed && "w-auto justify-center px-2")}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut />
            {!collapsed && "Cerrar sesión"}
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
  isClubAdmin,
}: {
  clubName?: string;
  clubLogoUrl?: string | null;
  userName?: string | null;
  isClubAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
    ...(isClubAdmin ? [{ href: "/club", label: "Club", icon: ShieldCheck }] : []),
    { href: "/teams", label: "Equipos", icon: Users },
    { href: "/plays", label: "Jugadas", icon: ClipboardList },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col gap-2 border-r bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-16 p-2" : "w-64 p-4"
        )}
      >
        <SidebarContent
          navItems={navItems}
          pathname={pathname}
          clubName={clubName}
          clubLogoUrl={clubLogoUrl}
          userName={userName}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
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


