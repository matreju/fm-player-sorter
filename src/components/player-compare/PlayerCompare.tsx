import { useEffect, useState, type CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { AppButton } from "../ui";
import { PlayerCompareContent } from "./PlayerCompareContent";

type PlayerCompareProps = {
  rows: TableRow[];
  requestedLeftPlayerKey?: string;
  compareRequestId?: number;
};

const moduleDockEventName = "fm-player-sorter-open-module";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(2, 6, 23, 0.58)",
  backdropFilter: "blur(3px)",
};

const drawerStyle: CSSProperties = {
  width: "min(1540px, calc(100vw - 42px))",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid #334155",
  background: "#0f141d",
  boxShadow: "-26px 0 70px rgba(0, 0, 0, 0.5)",
};

const drawerHeaderStyle: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 14px",
  borderBottom: "1px solid #26334a",
  background: "linear-gradient(135deg, #111827, #0f172a)",
};

const drawerTitleBlockStyle: CSSProperties = {
  minWidth: 0,
};

const drawerTitleStyle: CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 18,
  lineHeight: 1.1,
  fontWeight: 950,
};

const drawerSubtitleStyle: CSSProperties = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 750,
};

const drawerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
};

const drawerBodyStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "auto",
  padding: 12,
};

const emptyNoticeStyle: CSSProperties = {
  margin: 12,
  padding: 16,
  border: "1px solid #334155",
  borderRadius: 12,
  background: "#101827",
  color: "#cbd5e1",
  fontWeight: 850,
};

export function PlayerCompare({
  rows,
  requestedLeftPlayerKey = "",
  compareRequestId = 0,
}: PlayerCompareProps) {
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    if (!requestedLeftPlayerKey) {
      return;
    }

    setIsCompareOpen(true);
  }, [requestedLeftPlayerKey, compareRequestId]);

  useEffect(() => {
    function handleOpenModule(event: Event) {
      const module = (event as CustomEvent<{ module?: string }>).detail?.module;

      if (module === "compare") {
        setIsCompareOpen(true);
      }
    }

    window.addEventListener(moduleDockEventName, handleOpenModule);

    return () => {
      window.removeEventListener(moduleDockEventName, handleOpenModule);
    };
  }, []);

  if (rows.length < 2) {
    return null;
  }

  if (!isCompareOpen) {
    return null;
  }

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Porównywarka zawodników"
    >
      <aside style={drawerStyle}>
        <header style={drawerHeaderStyle}>
          <div style={drawerTitleBlockStyle}>
            <h2 style={drawerTitleStyle}>Porównanie zawodników</h2>

            <div style={drawerSubtitleStyle}>
              Osobny panel porównywarki. Otwierasz go z docka albo z kafelka
              zawodnika.
            </div>
          </div>

          <div style={drawerActionsStyle}>
            <AppButton
              type="button"
              variant="neutral"
              size="compact"
              onClick={() => setIsCompareOpen(false)}
            >
              Zamknij
            </AppButton>
          </div>
        </header>

        <main style={drawerBodyStyle}>
          {rows.length >= 2 ? (
            <PlayerCompareContent
              rows={rows}
              requestedLeftPlayerKey={requestedLeftPlayerKey}
              compareRequestId={compareRequestId}
            />
          ) : (
            <div style={emptyNoticeStyle}>
              Potrzeba co najmniej dwóch zawodników do porównania.
            </div>
          )}
        </main>
      </aside>
    </div>
  );
}