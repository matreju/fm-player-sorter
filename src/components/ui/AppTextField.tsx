import { useId, type CSSProperties, type InputHTMLAttributes } from "react";
import {
  uiDisabledStyle,
  uiFieldLabelStyle,
  uiInputBaseStyle,
} from "./uiTheme";

type AppTextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fieldStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  inputStyle?: CSSProperties;
};

export function AppTextField({
  label,
  value,
  onChange,
  id,
  fieldStyle,
  labelStyle,
  inputStyle,
  disabled,
  ...inputProps
}: AppTextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      style={{
        ...uiFieldLabelStyle,
        ...fieldStyle,
      }}
    >
      <span style={labelStyle}>{label}</span>

      <input
        {...inputProps}
        id={inputId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={{
          ...uiInputBaseStyle,
          cursor: disabled ? "not-allowed" : undefined,
          ...(disabled ? uiDisabledStyle : {}),
          ...inputStyle,
        }}
      />
    </label>
  );
}