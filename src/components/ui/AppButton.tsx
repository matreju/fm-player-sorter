import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { uiColors, uiDisabledStyle, uiTransitions } from "./uiTheme";

type AppButtonVariant =
  | "primary"
  | "secondary"
  | "neutral"
  | "success"
  | "danger";

type AppButtonSize = "sm" | "md" | "compact" | "pill" | "pillIcon" | "icon";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

const baseButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
  lineHeight: 1,
  transition: uiTransitions,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
};

const sizeStyles: Record<AppButtonSize, CSSProperties> = {
  sm: {
    height: 28,
    padding: "0 9px",
    fontSize: 11,
  },

  md: {
    height: 34,
    padding: "0 13px",
    fontSize: 12,
  },

  compact: {
    height: 31,
    padding: "0 11px",
    fontSize: 11,
  },

  pill: {
    minHeight: 30,
    padding: "5px 11px",
    borderRadius: 999,
    fontSize: 13,
  },

  pillIcon: {
    width: 31,
    height: 31,
    padding: 0,
    borderRadius: 999,
    fontSize: 14,
  },

  icon: {
    width: 36,
    height: 36,
    padding: 0,
    borderRadius: 11,
    fontSize: 18,
  },
};

const variantStyles: Record<AppButtonVariant, CSSProperties> = {
  primary: {
    borderColor: uiColors.accentStrong,
    background: uiColors.accentSoft,
    color: "#bae6fd",
  },

  secondary: {
    borderColor: uiColors.borderStrong,
    background: uiColors.panelStrong,
    color: uiColors.text,
  },

  neutral: {
    borderColor: uiColors.borderStrong,
    background: uiColors.panelSoft,
    color: uiColors.textSoft,
  },

  success: {
    borderColor: uiColors.success,
    background: uiColors.successSoft,
    color: "#86efac",
  },

  danger: {
    borderColor: uiColors.danger,
    background: uiColors.dangerSoft,
    color: "#fecaca",
  },
};

const hoverStyles: Record<AppButtonVariant, CSSProperties> = {
  primary: {
    borderColor: "#7dd3fc",
    background: "rgba(56, 189, 248, 0.24)",
    color: "#ffffff",
    boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.10)",
  },

  secondary: {
    borderColor: "#475569",
    background: "#1e293b",
    color: "#ffffff",
  },

  neutral: {
    borderColor: "#64748b",
    background: "#111827",
    color: "#ffffff",
  },

  success: {
    borderColor: "#4ade80",
    background: "rgba(34, 197, 94, 0.24)",
    color: "#dcfce7",
    boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.10)",
  },

  danger: {
    borderColor: "#f87171",
    background: "rgba(239, 68, 68, 0.24)",
    color: "#fee2e2",
    boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.10)",
  },
};

export function AppButton({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  children,
  ...buttonProps
}: AppButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      {...buttonProps}
      disabled={disabled}
      onMouseEnter={(event) => {
        setIsHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        onMouseLeave?.(event);
      }}
      style={{
        ...baseButtonStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...(isHovered && !disabled ? hoverStyles[variant] : {}),
        ...(disabled ? uiDisabledStyle : {}),
        ...(fullWidth ? { width: "100%" } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}