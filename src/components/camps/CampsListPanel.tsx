import type { Camp } from "../../types/camp";
import { getCampTypeLabel } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampsListPanelProps = {
  camps: Camp[];
  activeCampId: string;
  onSelectCamp: (campId: string) => void;
};

export function CampsListPanel({
  camps,
  activeCampId,
  onSelectCamp,
}: CampsListPanelProps) {
  return (
    <aside style={styles.campsList}>
      <h3 style={styles.sectionTitle}>Zapisane zgrupowania</h3>

      {camps.length === 0 && (
        <div style={styles.empty}>Brak zapisanych zgrupowań.</div>
      )}

      {camps.map((camp) => {
        const isActive = camp.id === activeCampId;

        return (
          <button
            key={camp.id}
            type="button"
            onClick={() => onSelectCamp(camp.id)}
            style={{
              ...styles.campButton,
              ...(isActive ? styles.campButtonActive : {}),
            }}
          >
            <strong>{camp.name}</strong>

            <span>
              {getCampTypeLabel(camp.type)} · powołani: {camp.players.length}
            </span>
          </button>
        );
      })}
    </aside>
  );
}