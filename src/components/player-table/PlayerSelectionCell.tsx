import type { PlayerMark } from "../../constants/selection";
import { SELECTION_POSITION_OPTIONS } from "../../constants/selection";
import type { TableRow } from "../../types/table";
import { AppButton } from "../ui";
import { styles } from "../../styles";

type PlayerSelectionCellProps = {
  row: TableRow;
  mark: PlayerMark | null;
  selectionPosition: string;
  onToggleMark: (row: TableRow, mark: PlayerMark) => void;
  onSetSelectionPosition: (row: TableRow, position: string) => void;
};

export function PlayerSelectionCell({
  row,
  mark,
  selectionPosition,
  onToggleMark,
  onSetSelectionPosition,
}: PlayerSelectionCellProps) {
  const isSelected = mark === "selected";
  const isRejected = mark === "rejected";

  return (
    <td style={styles.markTd}>
      <div style={styles.markButtons}>
        <AppButton
          type="button"
          variant={isSelected ? "success" : "neutral"}
          size="sm"
          title={isSelected ? "Cofnij wybór zawodnika" : "Zaznacz jako wybrany"}
          aria-pressed={isSelected}
          onClick={() => onToggleMark(row, "selected")}
          style={{
            ...styles.markButton,
            ...(isSelected ? styles.markButtonSelected : {}),
          }}
        >
          ✓
        </AppButton>

        <AppButton
          type="button"
          variant={isRejected ? "danger" : "neutral"}
          size="sm"
          title={
            isRejected ? "Cofnij odrzucenie zawodnika" : "Zaznacz jako odrzucony"
          }
          aria-pressed={isRejected}
          onClick={() => onToggleMark(row, "rejected")}
          style={{
            ...styles.markButton,
            ...(isRejected ? styles.markButtonRejected : {}),
          }}
        >
          ×
        </AppButton>
      </div>

      {isSelected && (
        <select
          value={selectionPosition}
          onChange={(event) => onSetSelectionPosition(row, event.target.value)}
          style={styles.selectionPositionSelect}
          aria-label="Pozycja powołania zawodnika"
        >
          <option value="">Bez pozycji</option>

          {SELECTION_POSITION_OPTIONS.map((position) => (
            <option key={position} value={position}>
              {position}
            </option>
          ))}
        </select>
      )}
    </td>
  );
}