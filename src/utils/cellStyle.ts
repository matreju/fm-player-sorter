import type { CSSProperties } from "react";
import { ATTRIBUTE_COLUMNS } from "../constants/columns";
import { styles } from "../styles";
import { getSortableNumber } from "./sortTable";

export function getAttributeColor(value: string): CSSProperties {
  const number = getSortableNumber(value);

  if (number === null) {
    return {
      color: "#777b86",
      fontWeight: 500,
    };
  }
if (number >= 16) {
  return {
    color: "#63ff6b",
    fontWeight: 900,
  };
}

if (number >= 11) {
  return {
    color: "#ffd84a",
    fontWeight: 900,
  };
}

if (number >= 6) {
  return {
    color: "#d8e2f0",
    fontWeight: 900,
  };
}

return {
  color: "#8b95a7",
  fontWeight: 900,
};
  };


export function getCellStyle(header: string, value: string): CSSProperties {
const baseStyle = header === "Nazwisko" ? styles.nameStickyTd : styles.td;

  if (!ATTRIBUTE_COLUMNS.has(header)) {
    return baseStyle;
  }

  return {
    ...baseStyle,
    ...getAttributeColor(value),
    textAlign: "center",
  };
}