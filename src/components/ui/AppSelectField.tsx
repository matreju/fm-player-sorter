import { useId, type CSSProperties } from "react";
import {
  uiDisabledStyle,
  uiFieldLabelStyle,
  uiInputBaseStyle,
} from "./uiTheme";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectFieldProps = {
  label: string;
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  fieldStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  selectStyle?: CSSProperties;
};

export function AppSelectField({
  label,
  value,
  options,
  onChange,
  id,
  ariaLabel,
  disabled = false,
  fieldStyle,
  labelStyle,
  selectStyle,
}: AppSelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <label
      htmlFor={selectId}
      style={{
        ...uiFieldLabelStyle,
        ...fieldStyle,
      }}
    >
      <span style={labelStyle}>{label}</span>

      <select
        id={selectId}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={(event) => onChange(event.target.value)}
        style={{
          ...uiInputBaseStyle,
          appearance: "auto",
          cursor: disabled ? "not-allowed" : "pointer",
          ...(disabled ? uiDisabledStyle : {}),
          ...selectStyle,
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}