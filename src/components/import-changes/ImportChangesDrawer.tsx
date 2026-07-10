import { useMemo, useState, type CSSProperties } from "react";
import { AppModuleDrawer } from "../app-shell";
import { AppButton } from "../ui";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import type {
  ImportChangeItem,
  ImportChangeReport,
  ImportChangeType,
} from "../../utils/importChangeReport";

type ImportChangesDrawerProps = {
  report: ImportChangeReport | null;
  onClear: () => void;
};

type ImportChangeFilter = "all" | ImportChangeType;
type ChangeTone = "up" | "down" | "neutral";

const filterOptions: Array<{
  value: ImportChangeFilter;
  label: string;
}> = [
  { value: "all", label: "Wszystkie" },
  { value: "new", label: "Nowi" },
  { value: "removed", label: "Zniknęli" },
  { value: "club", label: "Klub" },
  { value: "league", label: "Liga" },
  { value: "position", label: "Pozycja" },
  { value: "rating", label: "Oceny" },
  { value: "attribute", label: "Atrybuty FM" },
];

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: 12,
    color: "#e5edf8",
  },

  hero: {
    padding: 14,
    border: "1px solid #29364d",
    borderRadius: 16,
    background:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.94))",
  },

  heroTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },

  heroText: {
    marginTop: 6,
    color: "#aebbd0",
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 750,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 8,
  },

  summaryCard: {
    minHeight: 72,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    padding: "10px 12px",
    border: "1px solid #29364d",
    borderRadius: 14,
    background: "#111827",
    textAlign: "center",
  },

  summaryLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },

  summaryValue: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1,
  },

  warningBox: {
    padding: 10,
    border: "1px solid rgba(251, 191, 36, 0.34)",
    borderRadius: 13,
    background: "rgba(120, 53, 15, 0.18)",
    color: "#fde68a",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 10,
    border: "1px solid #29364d",
    borderRadius: 14,
    background: "#111827",
  },

  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
  },

  filterButton: {
    minHeight: 30,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid #334155",
    background: "#0b1120",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  filterButtonActive: {
    borderColor: "rgba(56, 189, 248, 0.72)",
    background: "rgba(14, 116, 144, 0.28)",
    color: "#e0f2fe",
  },

  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 12,
  },

  itemCard: {
    position: "relative",
    minWidth: 0,
    padding: "13px 14px 13px 17px",
    border: "1px solid #29364d",
    borderRadius: 16,
    background: "#111827",
    overflow: "hidden",
  },

  itemAccentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.95,
  },

  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },

  playerName: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 950,
    lineHeight: 1.15,
  },

  playerInfo: {
    marginTop: 4,
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1.25,
  },

  badge: {
    flexShrink: 0,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #334155",
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },

  directionBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },

  changeLabel: {
    marginTop: 10,
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 950,
  },

  changeValues: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    gap: 9,
    alignItems: "center",
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 800,
  },

  valueBox: {
    minWidth: 0,
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    padding: "7px 9px",
    border: "1px solid #253149",
    borderRadius: 11,
    background: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 900,
  },

  arrow: {
    fontWeight: 950,
    fontSize: 17,
    lineHeight: 1,
  },

  empty: {
    padding: 18,
    border: "1px solid #29364d",
    borderRadius: 14,
    background: "#111827",
    color: "#cbd5e1",
    fontWeight: 850,
    textAlign: "center",
  },
};

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value ?? "")
    .replace(",", ".")
    .trim();

  const match = text.match(/-?\d+(\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function getItemChangeTone(item: ImportChangeItem): ChangeTone {
  if (typeof item.diff === "number" && Number.isFinite(item.diff)) {
    if (item.diff > 0) {
      return "up";
    }

    if (item.diff < 0) {
      return "down";
    }

    return "neutral";
  }

  const before = parseNumericValue(item.before);
  const after = parseNumericValue(item.after);

  if (before === null || after === null) {
    return "neutral";
  }

  if (after > before) {
    return "up";
  }

  if (after < before) {
    return "down";
  }

  return "neutral";
}

function getTypePalette(type: ImportChangeType) {
  switch (type) {
    case "new":
      return {
        border: "rgba(34, 197, 94, 0.62)",
        background:
          "linear-gradient(180deg, rgba(13, 42, 29, 0.96) 0%, rgba(10, 18, 16, 0.98) 100%)",
        badgeBg: "rgba(34, 197, 94, 0.14)",
        badgeBorder: "rgba(34, 197, 94, 0.42)",
        badgeColor: "#bbf7d0",
      };

    case "removed":
      return {
        border: "rgba(239, 68, 68, 0.62)",
        background:
          "linear-gradient(180deg, rgba(45, 16, 18, 0.96) 0%, rgba(18, 10, 12, 0.98) 100%)",
        badgeBg: "rgba(239, 68, 68, 0.14)",
        badgeBorder: "rgba(239, 68, 68, 0.42)",
        badgeColor: "#fecaca",
      };

    case "position":
      return {
        border: "rgba(245, 158, 11, 0.62)",
        background:
          "linear-gradient(180deg, rgba(44, 30, 11, 0.96) 0%, rgba(18, 14, 9, 0.98) 100%)",
        badgeBg: "rgba(245, 158, 11, 0.14)",
        badgeBorder: "rgba(245, 158, 11, 0.42)",
        badgeColor: "#fde68a",
      };

    case "rating":
      return {
        border: "rgba(250, 204, 21, 0.62)",
        background:
          "linear-gradient(180deg, rgba(42, 34, 11, 0.96) 0%, rgba(16, 13, 8, 0.98) 100%)",
        badgeBg: "rgba(250, 204, 21, 0.14)",
        badgeBorder: "rgba(250, 204, 21, 0.42)",
        badgeColor: "#fef08a",
      };

    case "attribute":
      return {
        border: "rgba(59, 130, 246, 0.62)",
        background:
          "linear-gradient(180deg, rgba(14, 30, 55, 0.96) 0%, rgba(8, 13, 24, 0.98) 100%)",
        badgeBg: "rgba(59, 130, 246, 0.14)",
        badgeBorder: "rgba(59, 130, 246, 0.42)",
        badgeColor: "#bfdbfe",
      };

    
    case "club":
    case "league":
    case "age":
    default:
      return {
        border: "rgba(100, 116, 139, 0.62)",
        background:
          "linear-gradient(180deg, rgba(24, 29, 39, 0.96) 0%, rgba(11, 14, 20, 0.98) 100%)",
        badgeBg: "rgba(100, 116, 139, 0.14)",
        badgeBorder: "rgba(100, 116, 139, 0.42)",
        badgeColor: "#cbd5e1",
      };
  }
}

function getToneAccent(tone: ChangeTone) {
  switch (tone) {
    case "up":
      return {
        strip: "#22c55e",
        arrow: "#4ade80",
        valueBg: "rgba(34, 197, 94, 0.11)",
        valueBorder: "rgba(34, 197, 94, 0.36)",
        valueColor: "#bbf7d0",
        directionBg: "rgba(34, 197, 94, 0.12)",
        directionBorder: "rgba(34, 197, 94, 0.36)",
        directionColor: "#bbf7d0",
        directionLabel: "Wzrost",
        arrowSymbol: "↗",
      };

    case "down":
      return {
        strip: "#ef4444",
        arrow: "#f87171",
        valueBg: "rgba(239, 68, 68, 0.11)",
        valueBorder: "rgba(239, 68, 68, 0.36)",
        valueColor: "#fecaca",
        directionBg: "rgba(239, 68, 68, 0.12)",
        directionBorder: "rgba(239, 68, 68, 0.36)",
        directionColor: "#fecaca",
        directionLabel: "Spadek",
        arrowSymbol: "↘",
      };

    default:
      return {
        strip: "#64748b",
        arrow: "#94a3b8",
        valueBg: "rgba(71, 85, 105, 0.14)",
        valueBorder: "rgba(71, 85, 105, 0.34)",
        valueColor: "#cbd5e1",
        directionBg: "rgba(71, 85, 105, 0.14)",
        directionBorder: "rgba(71, 85, 105, 0.34)",
        directionColor: "#cbd5e1",
        directionLabel: "Zmiana",
        arrowSymbol: "→",
      };
  }
}

function getTypeLabel(type: ImportChangeType): string {
  switch (type) {
    case "new":
      return "Nowy";
    case "removed":
      return "Zniknął";
    case "club":
      return "Klub";
    case "league":
      return "Liga";
    case "position":
      return "Pozycja";
    case "age":
      return "Wiek";
    case "attribute":
      return "Atrybut FM";
    case "rating":
      return "Ocena";
    default:
      return "Zmiana";
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getItemsByFilter(
  items: ImportChangeItem[],
  filter: ImportChangeFilter
): ImportChangeItem[] {
  if (filter === "all") {
    return items;
  }

  return items.filter((item) => item.type === filter);
}

export function ImportChangesDrawer({
  report,
  onClear,
}: ImportChangesDrawerProps) {
  const { isOpen, close } = useModuleDrawer("changes");
  const [activeFilter, setActiveFilter] = useState<ImportChangeFilter>("all");

  const filteredItems = useMemo(() => {
    if (!report) {
      return [];
    }

    return getItemsByFilter(report.items, activeFilter);
  }, [report, activeFilter]);

  return (
    <AppModuleDrawer
      isOpen={isOpen}
      onClose={close}
      title="Zmiany po imporcie"
      subtitle="Porównanie aktualnie wgranego pliku z poprzednim importem."
      labelledById="import-changes-drawer-title"
      width="min(1220px, calc(100vw - 42px))"
    >
      {!report ? (
        <div style={styles.empty}>
          Brak raportu zmian. Wgraj kolejny plik, żeby porównać go z poprzednim
          importem.
        </div>
      ) : (
        <div style={styles.wrapper}>
          <section style={styles.hero}>
            <h2 style={styles.heroTitle}>Raport zmian po imporcie</h2>

            <div style={styles.heroText}>
              {report.previousFileName} →{" "}
              <strong>{report.currentFileName}</strong>
              <br />
              Wygenerowano: {formatDate(report.createdAt)}
            </div>
          </section>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Poprzednio</div>
              <strong style={styles.summaryValue}>{report.previousCount}</strong>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Teraz</div>
              <strong style={styles.summaryValue}>{report.currentCount}</strong>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Nowi</div>
              <strong style={styles.summaryValue}>{report.newCount}</strong>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Zniknęli</div>
              <strong style={styles.summaryValue}>{report.removedCount}</strong>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Zmiany</div>
              <strong style={styles.summaryValue}>{report.changedCount}</strong>
            </div>
          </div>

          {report.unreliableNameMatchesCount > 0 && (
            <div style={styles.warningBox}>
              Uwaga: część zawodników była dopasowana bez UID, tylko po nazwisku.
              Przy duplikatach nazwisk raport może być mniej precyzyjny.
              Najlepiej eksportować kolumnę UID / Unique ID.
            </div>
          )}

          <div style={styles.toolbar}>
            <div style={styles.filterRow}>
              {filterOptions.map((option) => {
                const isActive = activeFilter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    style={{
                      ...styles.filterButton,
                      ...(isActive ? styles.filterButtonActive : {}),
                    }}
                    onClick={() => setActiveFilter(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <AppButton
              type="button"
              variant="neutral"
              size="compact"
              onClick={onClear}
            >
              Wyczyść raport
            </AppButton>
          </div>

          {filteredItems.length === 0 ? (
            <div style={styles.empty}>Brak zmian w tej kategorii.</div>
          ) : (
            <div style={styles.sectionGrid}>
              {filteredItems.map((item) => {
                const tone = getItemChangeTone(item);
                const palette = getTypePalette(item.type);
                const accent = getToneAccent(tone);

                return (
                  <article
                    key={item.id}
                    style={{
                      ...styles.itemCard,
                      borderColor: palette.border,
                      background: palette.background,
                      boxShadow:
                        tone === "up"
                          ? "0 0 0 1px rgba(34, 197, 94, 0.12) inset"
                          : tone === "down"
                            ? "0 0 0 1px rgba(239, 68, 68, 0.12) inset"
                            : "none",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        ...styles.itemAccentStrip,
                        background: accent.strip,
                      }}
                    />

                    <div style={styles.itemHeader}>
                      <div>
                        <div style={styles.playerName}>{item.playerName}</div>
                        <div style={styles.playerInfo}>{item.playerInfo}</div>

                        {tone !== "neutral" && (
                          <div
                            style={{
                              ...styles.directionBadge,
                              background: accent.directionBg,
                              border: `1px solid ${accent.directionBorder}`,
                              color: accent.directionColor,
                            }}
                          >
                            {accent.arrowSymbol} {accent.directionLabel}
                          </div>
                        )}
                      </div>

                      <span
                        style={{
                          ...styles.badge,
                          background: palette.badgeBg,
                          borderColor: palette.badgeBorder,
                          color: palette.badgeColor,
                        }}
                      >
                        {getTypeLabel(item.type)}
                      </span>
                    </div>

                    <div style={styles.changeLabel}>{item.label}</div>

                    <div style={styles.changeValues}>
                      <div
                        style={{
                          ...styles.valueBox,
                          background: "rgba(15, 23, 42, 0.9)",
                          borderColor: "rgba(51, 65, 85, 0.88)",
                          color: "#cbd5e1",
                        }}
                        title={String(item.before ?? "-")}
                      >
                        {item.before || "-"}
                      </div>

                      <div
                        style={{
                          ...styles.arrow,
                          color: accent.arrow,
                        }}
                      >
                        {accent.arrowSymbol}
                      </div>

                      <div
                        style={{
                          ...styles.valueBox,
                          background: accent.valueBg,
                          borderColor: accent.valueBorder,
                          color: accent.valueColor,
                        }}
                        title={String(item.after ?? "-")}
                      >
                        {item.after || "-"}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppModuleDrawer>
  );
}