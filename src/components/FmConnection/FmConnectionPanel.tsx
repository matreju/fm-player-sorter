import { useCallback, useEffect, useState } from "react";

import {
  getFootballManagerDateStatus,
  isDesktopApp,
  loadFootballManagerDatabase,
  probeFootballManagerMemory,
  type FmDatabaseLoadResult,
  type FmDateStatus,
  type FmMemoryStatus,
} from "../../services/fmConnection";

import "./FmConnectionPanel.css";

const PROCESS_CHECK_INTERVAL_MS = 2_500;
const DATE_CHECK_INTERVAL_MS = 1_500;

interface FmConnectionPanelProps {
  loadedNation: string | null;
  loadedPlayerCount: number;
  onDatabaseLoaded: (result: FmDatabaseLoadResult) => void;
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1000).toLocaleString("pl-PL", {
    maximumFractionDigits: 1,
  })} s`;
}

export function FmConnectionPanel({
  loadedNation,
  loadedPlayerCount,
  onDatabaseLoaded,
}: FmConnectionPanelProps) {
  const desktopMode = isDesktopApp();
  const [status, setStatus] = useState<FmMemoryStatus | null>(null);
  const [dateStatus, setDateStatus] = useState<FmDateStatus | null>(null);
  const [result, setResult] = useState<FmDatabaseLoadResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(desktopMode);
  const [isLoading, setIsLoading] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!desktopMode) return;

    try {
      const nextStatus = await probeFootballManagerMemory();
      setStatus(nextStatus);
      setProbeError(nextStatus.error);
    } catch (unknownError) {
      setStatus(null);
      setProbeError(
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError),
      );
    } finally {
      setIsChecking(false);
    }
  }, [desktopMode]);

  useEffect(() => {
    if (!desktopMode) return;

    const initialCheckId = window.setTimeout(() => void refreshStatus(), 0);
    const intervalId = window.setInterval(
      () => void refreshStatus(),
      PROCESS_CHECK_INTERVAL_MS,
    );
    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [desktopMode, refreshStatus]);

  useEffect(() => {
    if (!result?.success) return;

    let cancelled = false;
    const refreshDate = async () => {
      try {
        const nextStatus = await getFootballManagerDateStatus();
        if (!cancelled) setDateStatus(nextStatus);
      } catch {
        if (!cancelled) setDateStatus(null);
      }
    };

    void refreshDate();
    const intervalId = window.setInterval(
      () => void refreshDate(),
      DATE_CHECK_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [result?.pid, result?.success]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const connect = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setDateStatus(null);
      const nextResult = await loadFootballManagerDatabase();
      setResult({ ...nextResult, rows: [], headers: [] });

      if (!nextResult.success) {
        setLoadError(nextResult.message);
        return;
      }

      onDatabaseLoaded(nextResult);
      setIsOpen(false);
    } catch (unknownError) {
      setLoadError(
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const processConnected = Boolean(status?.memoryReadable);
  const displayedError = loadError ?? probeError;
  const dataStale = dateStatus?.dataStale ?? false;
  const displayedDate = dateStatus?.currentDate ?? result?.gameDate ?? null;
  const connectionLabel = isLoading
    ? "Wczytywanie…"
    : processConnected
      ? loadedPlayerCount > 0
        ? "Odśwież dane"
        : "Połącz z grą"
      : "Połącz z grą";

  return (
    <div className="fm-connect">
      {loadedPlayerCount > 0 && (
        <span
          className="fm-connect__snapshot"
          data-stale={dataStale || undefined}
          title={
            dataStale
              ? "Data w FM zmieniła się od ostatniego wczytania."
              : displayedDate
                ? "Snapshot jest aktualny względem automatycznie wykrytej daty."
                : "Snapshot ostatniego odczytu z FM26."
          }
        >
          <strong>{dataStale ? "!" : loadedNation ?? "Kadra"}</strong>
          <span>
            {displayedDate ? `${displayedDate} · ` : ""}
            {loadedPlayerCount.toLocaleString("pl-PL")}
          </span>
        </span>
      )}

      <button
        type="button"
        className="fm-connect__trigger"
        data-connected={processConnected || undefined}
        onClick={() => setIsOpen((current) => !current)}
        disabled={isLoading}
        aria-expanded={isOpen}
      >
        <span className="fm-connect__dot" aria-hidden="true" />
        {connectionLabel}
        <span aria-hidden="true">»</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fm-connect__backdrop"
            aria-label="Zamknij okno połączenia"
            onClick={() => setIsOpen(false)}
          />

          <section
            className="fm-connect__popover"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fm-connect-title"
          >
            <header>
              <div>
                <span>FM26</span>
                <h2 id="fm-connect-title">Połącz z grą</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Zamknij"
              >
                ×
              </button>
            </header>

            <div className="fm-connect__body">
              <div className="fm-connect__process">
                <span className="fm-connect__dot" aria-hidden="true" />
                <div>
                  <strong>
                    {!desktopMode
                      ? "Uruchom wersję desktopową"
                      : isChecking
                        ? "Szukanie Football Managera…"
                        : processConnected
                          ? "Football Manager jest gotowy"
                          : "Nie wykryto uruchomionego FM26"}
                  </strong>
                  <small>
                    {processConnected
                      ? "Odczyt prowadzonej reprezentacji — bez HTML i CSV."
                      : "Wczytaj zapis w FM26 i spróbuj ponownie."}
                  </small>
                </div>
              </div>

              {displayedError && (
                <p className="fm-connect__message" data-tone="error">
                  {displayedError}
                </p>
              )}

              {result?.success && (
                <p className="fm-connect__message" data-tone="success">
                  {result.managedNation}:{" "}
                  {result.playerCount.toLocaleString("pl-PL")} zawodników w{" "}
                  {formatDuration(result.scanDurationMs)}.
                </p>
              )}

              <button
                type="button"
                className="fm-connect__load"
                onClick={() => void connect()}
                disabled={!processConnected || isLoading}
              >
                {isLoading
                  ? "Wykrywanie reprezentacji i zawodników…"
                  : loadedPlayerCount > 0
                    ? "Wczytaj nowy snapshot"
                    : "Połącz i wczytaj zawodników"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
