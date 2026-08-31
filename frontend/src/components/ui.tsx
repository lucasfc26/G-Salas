import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Search, X, XCircle } from "lucide-react";
import type { ContractStatus, PaymentStatus, ReservationStatus } from "../types";
import { useApp } from "../store";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  hover,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      {...rest}
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,.04)]",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-[12.5px]",
    md: "px-4 py-2.5 text-[13.5px]",
    lg: "px-5 py-3 text-[14.5px]",
  };
  const variants = {
    primary: "bg-brand-600 text-white shadow-[0_6px_18px_-6px_rgba(20,100,133,.7)] hover:bg-brand-700 hover:shadow-[0_10px_24px_-8px_rgba(20,100,133,.8)]",
    success: "bg-mint-600 text-white shadow-[0_6px_18px_-6px_rgba(31,138,102,.7)] hover:bg-mint-700",
    danger: "bg-rose-600 text-white shadow-[0_6px_18px_-6px_rgba(225,29,72,.6)] hover:bg-rose-700",
    soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25",
    outline: "border border-line bg-surface text-ink hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  };
  return (
    <button {...rest} className={cx(base, sizes[size], variants[variant], className)}>
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form primitives                                                     */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-all placeholder:text-faint focus:border-brand-500 focus:bg-surface focus:ring-4 focus:ring-brand-500/10 dark:bg-surface-2";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldBase, "appearance-none bg-[length:16px] pr-9", props.className)}>
      {props.children}
    </select>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, "min-h-[110px] resize-y", props.className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(fieldBase, "pl-9")}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={cx(
          "relative h-6 w-11 rounded-full transition-colors duration-300",
          checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgba(20,100,133,.9)]"
          : "border-line bg-surface text-muted hover:border-brand-300 hover:text-brand-700",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const toneStyles: Record<string, string> = {
  green: "bg-mint-50 text-mint-700 ring-mint-500/20 dark:bg-mint-500/15 dark:text-mint-400",
  amber: "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
  red: "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400",
  blue: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300",
  brand: "bg-brand-50 text-brand-700 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-300",
  violet: "bg-violet-50 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400",
};

export type Tone = "green" | "amber" | "red" | "blue" | "slate" | "brand" | "violet";

export function Badge({
  tone = "slate",
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide ring-1 ring-inset",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const reservationStatusMap: Record<ReservationStatus, { label: string; tone: Tone }> = {
  solicitado: { label: "Solicitado", tone: "amber" },
  confirmado: { label: "Confirmado", tone: "green" },
  concluido: { label: "Concluído", tone: "brand" },
  cancelado: { label: "Cancelado", tone: "red" },
  nao_compareceu: { label: "Não compareceu", tone: "slate" },
};

export const contractStatusMap: Record<ContractStatus, { label: string; tone: Tone; icon: string }> = {
  ativo: { label: "Ativo", tone: "green", icon: "🟢" },
  vence_em_breve: { label: "Vence em breve", tone: "amber", icon: "🟡" },
  vencido: { label: "Vencido", tone: "red", icon: "🔴" },
  renovacao: { label: "Renovação em andamento", tone: "blue", icon: "🔵" },
};

export const paymentStatusMap: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Aguardando pagamento", tone: "amber" },
  em_analise: { label: "Em análise", tone: "violet" },
  pago: { label: "Pago", tone: "green" },
  recusado: { label: "Comprovante recusado", tone: "red" },
  vencido: { label: "Pagamento vencido", tone: "red" },
};

export const slotStyleMap: Record<string, { label: string; cls: string; dot: string }> = {
  disponivel: {
    label: "Disponível",
    cls: "border-mint-500/30 bg-mint-50/70 text-mint-700 hover:border-mint-500 hover:bg-mint-100 dark:bg-mint-500/10 dark:text-mint-400 dark:hover:bg-mint-500/20",
    dot: "bg-mint-500",
  },
  solicitado: {
    label: "Solicitado",
    cls: "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  confirmado: {
    label: "Confirmado",
    cls: "border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    dot: "bg-brand-500",
  },
  utilizado: {
    label: "Utilizado",
    cls: "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  cancelado: {
    label: "Cancelado",
    cls: "border-rose-500/30 bg-rose-50 text-rose-600 line-through dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  indisponivel: {
    label: "Indisponível",
    cls: "border-dashed border-line bg-surface-2 text-faint cursor-not-allowed",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = reservationStatusMap[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = paymentStatusMap[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ContractBadge({ status }: { status: ContractStatus }) {
  const s = contractStatusMap[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  height = 8,
  showLabel,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "mint" | "amber" | "rose";
  height?: number;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    brand: "from-brand-500 to-brand-700",
    mint: "from-mint-400 to-mint-600",
    amber: "from-amber-400 to-amber-600",
    rose: "from-rose-400 to-rose-600",
  };
  return (
    <div className="w-full">
      <div
        className="w-full overflow-hidden rounded-full bg-surface-2 dark:bg-slate-700/50"
        style={{ height }}
      >
        <div
          className={cx("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", colors[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1.5 text-right text-[11.5px] font-semibold text-faint">{pct}%</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  size = 40,
  color,
  src,
  ring,
}: {
  name: string;
  size?: number;
  color?: string;
  src?: string;
  ring?: boolean;
}) {
  const initials = name
    .replace(/Dra?\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const bg = color ?? "#1c7fa3";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white",
        ring && "ring-2 ring-white dark:ring-slate-800",
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: src ? "transparent" : `linear-gradient(135deg, ${bg}, ${bg}bb)`,
      }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          "relative z-10 w-full animate-pop-in overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {icon}
              </span>
            )}
            <div>
              <h3 className="text-[16px] font-bold tracking-tight text-ink">{title}</h3>
              {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/60 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={
        danger ? (
          <AlertTriangle className="h-5 w-5 text-rose-500" />
        ) : (
          <Info className="h-5 w-5" />
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state & misc                                                  */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
        {icon}
      </div>
      <h4 className="text-[15px] font-bold text-ink">{title}</h4>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({
  kind,
  title,
  children,
}: {
  kind: "info" | "success" | "warning" | "danger";
  title: string;
  children?: React.ReactNode;
}) {
  const map = {
    info: { cls: "border-brand-500/25 bg-brand-50/70 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200", Icon: Info },
    success: { cls: "border-mint-500/25 bg-mint-50/70 text-mint-700 dark:bg-mint-500/10 dark:text-mint-300", Icon: CheckCircle2 },
    warning: { cls: "border-amber-500/25 bg-amber-50/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300", Icon: AlertTriangle },
    danger: { cls: "border-rose-500/25 bg-rose-50/70 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300", Icon: XCircle },
  };
  const { cls, Icon } = map[kind];
  return (
    <div className={cx("flex gap-3 rounded-2xl border p-4", cls)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-[13.5px] font-bold">{title}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  const styles = {
    success: { cls: "border-mint-500/30 bg-white dark:bg-slate-800", bar: "bg-mint-500", Icon: CheckCircle2, c: "text-mint-600" },
    info: { cls: "border-brand-500/30 bg-white dark:bg-slate-800", bar: "bg-brand-500", Icon: Info, c: "text-brand-600" },
    warning: { cls: "border-amber-500/30 bg-white dark:bg-slate-800", bar: "bg-amber-500", Icon: AlertTriangle, c: "text-amber-600" },
    danger: { cls: "border-rose-500/30 bg-white dark:bg-slate-800", bar: "bg-rose-500", Icon: XCircle, c: "text-rose-600" },
  };
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => {
        const s = styles[t.kind];
        return (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex animate-slide-in items-start gap-3 overflow-hidden rounded-2xl border p-3.5 shadow-xl",
              s.cls,
            )}
          >
            <span className={cx("absolute left-0 top-0 h-full w-1", s.bar)} />
            <s.Icon className={cx("h-5 w-5 shrink-0", s.c)} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{t.body}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "brand",
  progress,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "brand" | "mint" | "amber" | "violet" | "rose";
  progress?: number;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    mint: "bg-mint-50 text-mint-600 dark:bg-mint-500/15 dark:text-mint-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  };
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">{label}</p>
          <p className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
          {sub && <div className="mt-2 text-[12.5px] text-muted">{sub}</div>}
        </div>
        <span className={cx("flex h-11 w-11 items-center justify-center rounded-2xl", tones[tone])}>
          {icon}
        </span>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <ProgressBar value={progress} tone={tone === "brand" ? "brand" : "mint"} />
        </div>
      )}
    </Card>
  );
}
