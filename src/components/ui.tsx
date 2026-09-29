import type { ReactNode, SVGProps } from "react";
import { cn } from "../utils/cn";

/* ------------------------------ آیکون‌ها ------------------------------ */

type I = SVGProps<SVGSVGElement>;
const base = (p: I) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconPlay = (p: I) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.2-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" />
  </svg>
);
export const IconPause = (p: I) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.3" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" />
  </svg>
);
export const IconRestart = (p: I) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v5h-5" />
  </svg>
);
export const IconSound = (p: I) => (
  <svg {...base(p)}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M18.8 6.4a8 8 0 0 1 0 11.2" />
  </svg>
);
export const IconMute = (p: I) => (
  <svg {...base(p)}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
  </svg>
);
export const IconTrophy = (p: I) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5.5H4.5V7a3.5 3.5 0 0 0 3 3.4M17 5.5h2.5V7a3.5 3.5 0 0 1-3 3.4" />
    <path d="M10 14h4l.6 4H9.4zM8 20h8" />
  </svg>
);
export const IconChart = (p: I) => (
  <svg {...base(p)}>
    <path d="M4 20V5M4 20h16" />
    <path d="M8 20v-6M12.5 20V8M17 20v-9" />
  </svg>
);
export const IconHeart = (p: I) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20Z" />
  </svg>
);
export const IconShield = (p: I) => (
  <svg {...base(p)}>
    <path d="M12 3.5 5 6v6c0 4.2 3 7.3 7 8.5 4-1.2 7-4.3 7-8.5V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);
export const IconBrain = (p: I) => (
  <svg {...base(p)}>
    <path d="M9.5 4.5A2.8 2.8 0 0 0 6.8 8a2.9 2.9 0 0 0-1.3 4.6A2.9 2.9 0 0 0 7 17.4 2.7 2.7 0 0 0 12 17V5.8a2.4 2.4 0 0 0-2.5-1.3Z" />
    <path d="M14.5 4.5A2.8 2.8 0 0 1 17.2 8a2.9 2.9 0 0 1 1.3 4.6A2.9 2.9 0 0 1 17 17.4 2.7 2.7 0 0 1 12 17" />
  </svg>
);
export const IconHands = (p: I) => (
  <svg {...base(p)}>
    <path d="m7 13 3-3 2.5 2.5L16 9" />
    <path d="M3.5 11.5 7 15l1.5-1.5M20.5 11.5 17 15l-1.5-1.5" />
    <path d="M8.5 16.5 12 20l3.5-3.5" />
  </svg>
);
export const IconClose = (p: I) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
export const IconKey = (p: I) => (
  <svg {...base(p)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
  </svg>
);
export const IconBolt = (p: I) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M13.5 2 4 13.5h6L9.5 22 20 10h-6.8z" />
  </svg>
);
export const IconFile = (p: I) => (
  <svg {...base(p)}>
    <path d="M6 3h7l5 5v13H6z" />
    <path d="M13 3v5h5M9 13h6M9 17h4" />
  </svg>
);
export const IconStetho = (p: I) => (
  <svg {...base(p)}>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" />
    <path d="M10 12v3a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1.2" />
    <circle cx="19" cy="12.4" r="2.1" />
  </svg>
);

export const AXIS_ICON = {
  empathy: IconHands,
  assessment: IconBrain,
  safety: IconShield,
  professional: IconStetho,
} as const;

/* ------------------------------ اجزای پایه ------------------------------ */

export function Btn({
  children,
  onClick,
  variant = "ghost",
  className,
  disabled,
  title,
  accent,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "flat";
  className?: string;
  disabled?: boolean;
  title?: string;
  accent?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-lamp text-abyss border-lamp-soft/60 hover:bg-lamp-soft shadow-[0_6px_0_-2px_rgba(0,0,0,0.45)] active:translate-y-[3px] active:shadow-none",
    ghost:
      "bg-white/[0.045] text-bone border-white/12 hover:bg-white/[0.1] hover:border-white/25",
    danger:
      "bg-coral/15 text-coral border-coral/40 hover:bg-coral/25 hover:border-coral/70",
    flat: "bg-transparent text-ash border-transparent hover:text-bone hover:bg-white/5",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={accent && variant === "primary" ? { background: accent, borderColor: accent } : undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-[13px] font-semibold",
        "rounded-[10px] transition-all duration-150 select-none",
        "disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className,
  corner = true,
}: {
  children: ReactNode;
  className?: string;
  corner?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/10 bg-ward-900/85 backdrop-blur-[2px] card-edge grain",
        className
      )}
    >
      {corner && (
        <>
          <span className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t-2 border-r-2 border-mint/60 rounded-tr-xl" />
          <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-mint/60 rounded-bl-xl" />
        </>
      )}
      {children}
    </div>
  );
}

export function Chip({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold tracking-tight",
        className
      )}
      style={{
        color: color ?? "#9db3b8",
        borderColor: color ? `${color}55` : "rgba(255,255,255,0.14)",
        background: color ? `${color}14` : "rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </span>
  );
}

export function Meter({
  label,
  value,
  color,
  icon,
  danger,
}: {
  label: string;
  value: number;
  color: string;
  icon?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-ash">
          {icon}
          {label}
        </span>
        <span
          className={cn("tnum font-display text-[15px] leading-none", danger && "anim-danger")}
          style={{ color }}
        >
          {Math.round(value)}٪
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full border border-white/10 bg-abyss/80">
        <div
          className="absolute inset-y-0 right-0 rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: `linear-gradient(270deg, ${color}, ${color}66)`,
            boxShadow: `0 0 14px ${color}88`,
          }}
        />
        <div className="hatch absolute inset-0 opacity-40" />
      </div>
    </div>
  );
}
