import type { CSSProperties, ReactNode } from "react";
import { uiColors, uiDisabledStyle, uiTransitions } from "./uiTheme";

type AppCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
};

const baseLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
  userSelect: "none",
  lineHeight: 1.2,
};

const baseInputStyle: CSSProperties = {
  width: 15,
  height: 15,
  margin: 0,
  accentColor: uiColors.accent,
  cursor: "pointer",
  transition: uiTransitions,
};

export function AppCheckbox({
  checked,
  onChange,
  children,
  disabled = false,
  id,
  style,
  inputStyle,
}: AppCheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{
        ...baseLabelStyle,
        ...(disabled ? uiDisabledStyle : {}),
        ...style,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{
          ...baseInputStyle,
          cursor: disabled ? "not-allowed" : "pointer",
          ...inputStyle,
        }}
      />

      <span>{children}</span>
    </label>
  );
}