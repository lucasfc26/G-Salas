import React, { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Settings,
  Shield,
  Sun,
  Timer,
  User,
  Users,
  Wallet,
  X,
  DoorOpen,
  History as HistoryIcon,
} from "lucide-react";
import { useApp } from "../store";
import { fmtDate } from "../data/mock";
import { Avatar, Badge, Button, cx } from "./ui";


type NavItem = { key: string; label: string; icon: React.ReactNode };

const clientNav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { key: "profile", label: "Meu Perfil", icon: <User className="h-[18px] w-[18px]" /> },
  { key: "agenda", label: "Agenda", icon: <CalendarDays className="h-[18px] w-[18px]" /> },
  { key: "credits", label: "Créditos", icon: <Timer className="h-[18px] w-[18px]" /> },
  { key: "contracts", label: "Contratos", icon: <FileText className="h-[18px] w-[18px]" /> },
  { key: "financial", label: "Financeiro", icon: <Wallet className="h-[18px] w-[18px]" /> },
  { key: "history", label: "Histórico", icon: <HistoryIcon className="h-[18px] w-[18px]" /> },
  { key: "settings", label: "Configurações", icon: <Settings className="h-[18px] w-[18px]" /> },
];

const adminNav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { key: "rooms", label: "Salas", icon: <DoorOpen className="h-[18px] w-[18px]" /> },
  { key: "schedule", label: "Agenda Geral", icon: <CalendarDays className="h-[18px] w-[18px]" /> },
  { key: "clients", label: "Clientes", icon: <Users className="h-[18px] w-[18px]" /> },
  { key: "contracts", label: "Contratos", icon: <FileText className="h-[18px] w-[18px]" /> },
  { key: "financial", label: "Financeiro", icon: <Wallet className="h-[18px] w-[18px]" /> },
  { key: "reports", label: "Relatórios", icon: <PieChart className="h-[18px] w-[18px]" /> },
  { key: "settings", label: "Configurações", icon: <Settings className="h-[18px] w-[18px]" /> },
];

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="logo-mark relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-brand-800/30 dark:shadow-white/15">
        <img src="/G-Salas-Logo.png" alt="G-Salas" className="h-full w-full object-contain p-0.5 dark:hidden" />
        <img src="/G-Salas-Logo-D.png" alt="G-Salas" className="hidden h-full w-full object-contain p-0.5 dark:block" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[19px] font-extrabold leading-none tracking-tight text-ink">
            G-Salas
          </p>
          <p className="text-[11px] font-medium leading-tight text-faint">salas para profissionais de saúde</p>
        </div>
      )}
    </div>
  );
}

function NavList({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={cx(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200",
              isActive
                ? "bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(20,100,133,.9)]"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <span className={cx("transition-transform duration-200", isActive ? "text-white" : "text-faint group-hover:text-brand-600")}>
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
          </button>
        );
      })}
    </nav>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, role, markAllRead, markRead, navigate } = useApp();
  const list = notifications.filter((n) => n.forRole === role).slice(0, 8);
  const tones: Record<string, string> = {
    success: "bg-mint-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-brand-500",
  };
  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[13.5px] font-bold text-ink">Notificações</p>
        <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline">
          <Check className="h-3.5 w-3.5" /> Marcar todas como lidas
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {list.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted">Nenhuma notificação.</p>}
        {list.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              markRead(n.id);
              navigate("notifications");
              onClose();
            }}
            className={cx(
              "flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2",
              !n.read && "bg-brand-50/40 dark:bg-brand-500/5",
            )}
          >
            <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", tones[n.kind])} />
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-ink">{n.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{n.body}</span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-faint">{fmtDate(n.date)}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          navigate("notifications");
          onClose();
        }}
        className="w-full bg-surface-2/60 px-4 py-3 text-[12.5px] font-bold text-brand-700 hover:bg-surface-2"
      >
        Ver central de notificações
      </button>
    </div>
  );
}

function AccountMenu({ onClose }: { onClose: () => void }) {
  const { role, navigate, logout, theme, toggleTheme, me } = useApp();
  const displayName = me?.name ?? "Usuário";
  const displaySub = role === "admin" ? "Administrador" : me?.profession ?? "Profissional";
  const person = { name: displayName };
  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <Avatar name={person.name} size={42} color={role === "admin" ? "#12516c" : "#1c7fa3"} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink">{displayName}</p>
          <p className="truncate text-[12px] text-muted">{displaySub}</p>
        </div>
      </div>
      <div className="p-1.5">
        {role === "client" && (
          <button onClick={() => { navigate("profile"); onClose(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
            <User className="h-4 w-4" /> Meu perfil
          </button>
        )}
        <button onClick={() => { navigate("settings"); onClose(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
          <Settings className="h-4 w-4" /> Configurações
        </button>
        <button onClick={toggleTheme} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {theme === "light" ? "Modo escuro" : "Modo claro"}
        </button>
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export function Header({ onOpenMenu, title }: { onOpenMenu: () => void; title: string }) {
  const { theme, toggleTheme, unreadCount, role, credits, me } = useApp();
  const [openPanel, setOpenPanel] = useState<"none" | "bell" | "account">("none");

  useEffect(() => {
    const close = () => setOpenPanel("none");
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onOpenMenu} className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold tracking-tight text-ink sm:text-[17px]">{title}</h1>
          <p className="hidden text-[12px] text-faint sm:block">
            {role === "admin" ? "Gestão completa do espaço" : `${me?.plan ?? "Plano"} · ${credits.available}h disponíveis`}
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-xl border border-line bg-surface p-2.5 text-muted transition-colors hover:text-ink"
          aria-label="Alternar tema"
        >
          {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenPanel(openPanel === "bell" ? "none" : "bell")}
            className="relative rounded-xl border border-line bg-surface p-2.5 text-muted transition-colors hover:text-ink"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                {unreadCount}
              </span>
            )}
          </button>
          {openPanel === "bell" && <NotificationPanel onClose={() => setOpenPanel("none")} />}
        </div>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenPanel(openPanel === "account" ? "none" : "account")}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1 pr-2 transition-colors hover:bg-surface-2 sm:pr-3"
          >
            <Avatar
              name={me?.name ?? "Usuário"}
              size={32}
              color={role === "admin" ? "#12516c" : "#1c7fa3"}
            />
            <span className="hidden text-left lg:block">
              <span className="block text-[12.5px] font-bold leading-tight text-ink">
                {(me?.name ?? "Usuário").split(" ")[0]}
              </span>
              <span className="block text-[10.5px] leading-tight text-faint">
                {role === "admin" ? "Administrador" : "Profissional"}
              </span>
            </span>
          </button>
          {openPanel === "account" && <AccountMenu onClose={() => setOpenPanel("none")} />}
        </div>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { role, page, navigate, logout, credits, me } = useApp();
  const [drawer, setDrawer] = useState(false);
  const nav = role === "admin" ? adminNav : clientNav;
  const title =
    nav.find((n) => n.key === page.name)?.label ??
    (page.name === "notifications" ? "Notificações" : page.name === "new-client" ? "Novo cliente" : "Detalhes");

  useEffect(() => setDrawer(false), [page.name]);

  const go = (k: string) => {
    navigate(k);
    setDrawer(false);
  };

  const mobilePrimary = nav.slice(0, 4);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[264px] flex-col border-r border-line bg-surface lg:flex">
        <div className="px-6 py-6">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
            {role === "admin" ? "Administração" : "Área do profissional"}
          </p>
          <NavList items={nav} active={page.name} onSelect={go} />
        </div>
        <div className="p-4">
          {role === "client" && (
            <div className="mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Créditos do mês</p>
              <p className="mt-1 text-[24px] font-extrabold leading-none">{credits.available}h</p>
              <p className="mt-1 text-[11.5px] text-white/70">de {credits.contracted}h contratadas</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${(credits.used / credits.contracted) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface-2/60 p-3">
            <Avatar name={me?.name ?? "Usuário"} size={38} color={role === "admin" ? "#12516c" : "#1c7fa3"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-ink">
                {me?.name ?? "Usuário"}
              </p>
              <p className="truncate text-[11px] text-faint">{role === "admin" ? "Administrador" : me?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          >
            <LogOut className="h-[18px] w-[18px]" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-[280px] animate-slide-in border-r border-line bg-surface p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 text-faint hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList items={nav} active={page.name} onSelect={go} />
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-[18px] w-[18px]" /> Sair da conta
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-[264px]">
        <Header onOpenMenu={() => setDrawer(true)} title={title} />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pb-10 lg:pt-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch justify-around">
          {mobilePrimary.map((item) => {
            const isActive = page.name === item.key;
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-brand-600" : "text-faint",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setDrawer(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-faint"
          >
            <Menu className="h-[18px] w-[18px]" />
            Menu
          </button>
        </div>
      </nav>

      {role === "client" && (
        <button
          onClick={() => navigate("agenda")}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3.5 text-[13.5px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(20,100,133,.8)] transition-transform active:scale-95 lg:hidden"
        >
          <Clock className="h-[18px] w-[18px]" /> Reservar sala
        </button>
      )}
      {role === "admin" && (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[12px] font-semibold text-muted shadow-lg lg:hidden">
          <Shield className="h-4 w-4 text-brand-600" /> Painel admin
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <Badge tone="brand" className="mb-2">
            {eyebrow}
          </Badge>
        )}
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export { Logo };
export const navLabels = { clientNav, adminNav };
export function PageActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}
export const NavButton = Button;
