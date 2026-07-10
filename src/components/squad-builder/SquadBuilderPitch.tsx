import type {
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";
import type {
  FormationSlot,
  PitchPosition,
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";
import { formatRoleScore } from "../../utils/roleScoring";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import type { TacticalView } from "../../utils/squadBuilderTacticalView";
import { formatCandidateScoreForMode } from "../../utils/squadBuilderScoreMode";

const GOALKEEPER_SLOT: FormationSlot = {
  id: "GK",
  label: "BR",
  line: "Obrona",
  positionGroup: "Bramkarz",
  phase: "with-ball",
  roleId: "best",
  footRequirement: "any",
};

function hasGoalkeeperSlot(slots: FormationSlot[]): boolean {
  return slots.some(
    (slot) => slot.id === "GK" || slot.positionGroup === "Bramkarz"
  );
}

type SquadBuilderPitchProps = {
  withBallPitchRef: RefObject<HTMLDivElement | null>;
  withoutBallPitchRef: RefObject<HTMLDivElement | null>;

  withBallSlots: FormationSlot[];
  withoutBallSlots: FormationSlot[];
  activeSlotId: string;
  tacticalView: TacticalView;

  suggestedSquadWithBall: Record<string, SlotCandidate | null>;
  suggestedSquadWithoutBall: Record<string, SlotCandidate | null>;
  scoreMode: SquadBuilderScoreMode;

  withBallDraggingSlotId: string | null;
  withoutBallDraggingSlotId: string | null;

  getCurrentWithBallPitchPosition: (slot: FormationSlot) => PitchPosition;
  getCurrentWithoutBallPitchPosition: (slot: FormationSlot) => PitchPosition;

  onWithBallSlotPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) => void;
  onWithBallSlotPointerMove: (
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) => void;
  onWithBallSlotPointerUp: (
    event: PointerEvent<HTMLButtonElement>,
    slot: FormationSlot
  ) => void;
  onWithBallSlotPointerCancel: (
    event: PointerEvent<HTMLButtonElement>
  ) => void;

  onWithoutBallSlotPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) => void;
  onWithoutBallSlotPointerMove: (
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) => void;
  onWithoutBallSlotPointerUp: (
    event: PointerEvent<HTMLButtonElement>,
    slot: FormationSlot
  ) => void;
  onWithoutBallSlotPointerCancel: (
    event: PointerEvent<HTMLButtonElement>
  ) => void;

  onWithBallSlotClick: (
    event: MouseEvent<HTMLButtonElement>,
    slotId: string
  ) => void;
  onWithoutBallSlotClick: (
    event: MouseEvent<HTMLButtonElement>,
    slotId: string
  ) => void;

  onTacticalViewChange: (view: TacticalView) => void;
  renderActiveSlotPanel: () => ReactNode;
};

export function SquadBuilderPitch({
  withBallPitchRef,
  withoutBallPitchRef,
  withBallSlots,
  withoutBallSlots,
  activeSlotId,
  tacticalView,
  suggestedSquadWithBall,
  suggestedSquadWithoutBall,
  scoreMode,
  withBallDraggingSlotId,
  withoutBallDraggingSlotId,
  getCurrentWithBallPitchPosition,
  getCurrentWithoutBallPitchPosition,
  onWithBallSlotPointerDown,
  onWithBallSlotPointerMove,
  onWithBallSlotPointerUp,
  onWithBallSlotPointerCancel,
  onWithoutBallSlotPointerDown,
  onWithoutBallSlotPointerMove,
  onWithoutBallSlotPointerUp,
  onWithoutBallSlotPointerCancel,
  onWithBallSlotClick,
  onWithoutBallSlotClick,
  onTacticalViewChange,
  renderActiveSlotPanel,
}: SquadBuilderPitchProps) {
  function renderPitchBoard(
    view: TacticalView,
    title: string,
    slots: FormationSlot[],
    suggestedSquadForView: Record<string, SlotCandidate | null>
  ) {
    const isCurrentView = tacticalView === view;

    const pitchRef =
      view === "with-ball" ? withBallPitchRef : withoutBallPitchRef;

    const draggingSlotId =
      view === "with-ball" ? withBallDraggingSlotId : withoutBallDraggingSlotId;

    const getCurrentPitchPosition =
      view === "with-ball"
        ? getCurrentWithBallPitchPosition
        : getCurrentWithoutBallPitchPosition;

    const onSlotPointerDown =
      view === "with-ball"
        ? onWithBallSlotPointerDown
        : onWithoutBallSlotPointerDown;

    const onSlotPointerMove =
      view === "with-ball"
        ? onWithBallSlotPointerMove
        : onWithoutBallSlotPointerMove;

    const onSlotPointerUp =
      view === "with-ball" ? onWithBallSlotPointerUp : onWithoutBallSlotPointerUp;

    const onSlotPointerCancel =
      view === "with-ball"
        ? onWithBallSlotPointerCancel
        : onWithoutBallSlotPointerCancel;

    const onSlotClick =
      view === "with-ball" ? onWithBallSlotClick : onWithoutBallSlotClick;

    const slotsWithGoalkeeper = hasGoalkeeperSlot(slots)
      ? slots
      : [...slots, GOALKEEPER_SLOT];

    return (
      <section
        style={{
          ...styles.pitchBoard,
          ...(isCurrentView ? styles.pitchBoardActive : {}),
        }}
        aria-label={title}
      >
        <div style={styles.pitchBoardHeader}>
          <strong style={styles.pitchBoardTitle}>{title}</strong>

          <span style={styles.pitchBoardBadge}>
            {view === "with-ball" ? "priorytet XI" : "ta sama XI"}
          </span>
        </div>

        <div ref={pitchRef} style={styles.pitch}>
          <div style={styles.pitchHalfLine} />
          <div style={styles.pitchCenterCircle} />
          <div style={styles.pitchBoxTop} />
          <div style={styles.pitchBoxBottom} />

          {slotsWithGoalkeeper.map((slot) => {
            const candidate = suggestedSquadForView[slot.id] ?? null;
            const position = getCurrentPitchPosition(slot);
            const isActive = isCurrentView && activeSlotId === slot.id;

            return (
              <button
                key={`${view}-${slot.id}`}
                type="button"
                onPointerDown={(event) => onSlotPointerDown(event, slot.id)}
                onPointerMove={(event) => onSlotPointerMove(event, slot.id)}
                onPointerUp={(event) => onSlotPointerUp(event, slot)}
                onPointerCancel={(event) => onSlotPointerCancel(event)}
                onClick={(event) => {
                  onTacticalViewChange(view);
                  onSlotClick(event, slot.id);
                }}
                style={{
                  ...styles.pitchSlot,
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  ...(isActive ? styles.pitchSlotActive : {}),
                  ...(candidate ? styles.pitchSlotFilled : {}),
                  ...(draggingSlotId === slot.id ? styles.pitchSlotDragging : {}),
                }}
                aria-pressed={isActive}
                aria-label={`Slot ${slot.label}, ${
                  candidate ? candidate.name : "brak zawodnika"
                }`}
              >
                <span style={styles.pitchSlotLabel}>{slot.label}</span>

                {candidate?.isInjured && (
                  <span
                    style={styles.pitchSlotInjuryBadge}
                    title={`Kontuzja: ${candidate.infoStatus || "Ktz"}`}
                    aria-label={`Kontuzja: ${candidate.infoStatus || "Ktz"}`}
                  >
                    ✚
                  </span>
                )}

                <strong style={styles.pitchSlotName}>
                  {candidate?.name ?? "—"}
                </strong>

                <span style={styles.pitchSlotMeta}>
  {candidate
    ? `${
        scoreMode === "role-score"
          ? formatRoleScore(candidate.phaseScore ?? candidate.finalScore)
          : formatCandidateScoreForMode(candidate, scoreMode)
      } · ${candidate.roleResult.role.name}`
    : slot.positionGroup}
</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div style={styles.pitchLayout}>
      <div style={styles.pitchBoards}>
        {renderPitchBoard(
          "with-ball",
          "Przy piłce",
          withBallSlots,
          suggestedSquadWithBall
        )}

        {renderPitchBoard(
          "without-ball",
          "Bez piłki",
          withoutBallSlots,
          suggestedSquadWithoutBall
        )}
      </div>

      <aside style={styles.activeTopPanel}>{renderActiveSlotPanel()}</aside>
    </div>
  );
}