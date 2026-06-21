import { AppButton } from "./AppButton";

type CallUpButtonProps = {
  isSelected: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "compact" | "pill";
  disabled?: boolean;
};

export function CallUpButton({
  isSelected,
  onClick,
  size = "pill",
  disabled = false,
}: CallUpButtonProps) {
  const label = isSelected ? "Odwołaj" : "Powołaj";
  const description = isSelected
    ? "Odwołaj zawodnika z powołanych"
    : "Powołaj zawodnika";

  return (
    <AppButton
      type="button"
      variant={isSelected ? "danger" : "success"}
      size={size}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={description}
      title={description}
    >
      {label}
    </AppButton>
  );
}