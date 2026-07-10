import { useEffect } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import type { TableRow } from "../../types/table";
import { AppModuleDrawer } from "../app-shell";
import { PlayerCompareContent } from "./PlayerCompareContent";

type PlayerCompareProps = {
  rows: TableRow[];
  requestedLeftPlayerKey?: string;
  compareRequestId?: number;
};

const emptyNoticeStyle = {
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
  const { isOpen, open, close } = useModuleDrawer("compare");

  useEffect(() => {
    if (!requestedLeftPlayerKey) {
      return;
    }

    open();
  }, [requestedLeftPlayerKey, compareRequestId, open]);

  if (rows.length < 2) {
    return null;
  }

  return (
    <AppModuleDrawer
      isOpen={isOpen}
      onClose={close}
      title="Porównanie zawodników"
      subtitle="Osobny panel porównywarki. Otwierasz go z docka albo z kafelka zawodnika."
      labelledById="player-compare-drawer-title"
      width="min(1540px, calc(100vw - 42px))"
    >
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
    </AppModuleDrawer>
  );
}