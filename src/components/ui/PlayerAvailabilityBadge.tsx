import type { CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { getPlayerAvailability } from "../../utils/playerAvailability";

type PlayerAvailabilityBadgeProps = {
  row: TableRow;
  showOtherStatuses?: boolean;
  size?: "sm" | "md";
  style?: CSSProperties;
};

const baseBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  borderRadius: 999,
  fontWeight: 950,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};

const sizeStyles: Record<"sm" | "md", CSSProperties> = {
  sm: {
    padding: "2px 6px",
    fontSize: 10,
  },

  md: {
    padding: "3px 8px",
    fontSize: 11,
  },
};

const injuryStyle: CSSProperties = {
  border: "1px solid rgba(239, 68, 68, 0.75)",
  background: "rgba(239, 68, 68, 0.18)",
  color: "#fecaca",
};

const otherStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.55)",
  background: "rgba(148, 163, 184, 0.12)",
  color: "#cbd5e1",
};

export function PlayerAvailabilityBadge({
  row,
  showOtherStatuses = false,
  size = "sm",
  style,
}: PlayerAvailabilityBadgeProps) {
  const availability = getPlayerAvailability(row);

  if (availability.tone === "ok") {
    return null;
  }

  if (availability.tone !== "injury" && !showOtherStatuses) {
    return null;
  }

  const isInjury = availability.tone === "injury";
  const label = isInjury ? "✚ Ktz" : availability.label;

  return (
    <span
      style={{
        ...baseBadgeStyle,
        ...sizeStyles[size],
        ...(isInjury ? injuryStyle : otherStyle),
        ...style,
      }}
      title={isInjury ? `Kontuzja: ${availability.info || "Ktz"}` : availability.info}
      aria-label={isInjury ? `Kontuzja: ${availability.info || "Ktz"}` : availability.info}
    >
      {label}
    </span>
  );
}