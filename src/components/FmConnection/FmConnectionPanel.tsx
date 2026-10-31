import { useCallback, useEffect, useRef, useState } from "react";

import {
  getFootballManagerDateStatus,
  isDesktopApp,
  loadFootballManagerDatabase,
  refreshFootballManagerDatabase,
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
  onFmUnavailable: () => void;
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
  onFmUnavailable,
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
  const loadingRef=useRef(false);
  const processDetectedRef = useRef<boolean | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!desktopMode || loadingRef.current) return;

    try {
      const nextStatus = await probeFootballManagerMemory();
      setStatus(nextStatus);
      setProbeError(nextStatus.error);
      if (
        !nextStatus.processDetected &&
        processDetectedRef.current !== false
      ) {
        setResult(null);
        setDateStatus(null);
        onFmUnavailable();
      }
      processDetectedRef.current = nextStatus.processDetected;
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
  }, [desktopMode, onFmUnavailable]);

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
      if(loadingRef.current)return;
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

  const connect = async (quick=false) => {
    if(loadingRef.current)return;
    loadingRef.current=true;
    try {
      setIsLoading(true);
      setLoadError(null);
      setDateStatus(null);
      const nextResult = await (quick?refreshFootballManagerDatabase():loadFootballManagerDatabase());
      setResult({ ...nextResult, rows: [], headers: [] });

      if (!nextResult.success) {
        setLoadError(nextResult.message);
        setIsOpen(true);
        if(quick && nextResult.stage==="refresh-reconnect-required")onFmUnavailable();
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
      loadingRef.current=false;
      setIsLoading(false);
    }
  };

  const processConnected = Boolean(status?.memoryReadable);
  const displayedError = loadError ?? probeError;
  const dataStale = dateStatus?.dataStale ?? false;
  const displayedDate = dateStatus?.currentDate ?? result?.gameDate ?? null;
  const connectionLabel = isLoading
    ? "Odświeżanie…"
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
                : "Snapshot ostatniego odczytu z Football Managera."
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
        onClick={() => loadedPlayerCount>0 ? void connect(true) : setIsOpen(current=>!current)}
        title={loadedPlayerCount>0?"Szybki odczyt aktualnych danych bez skanowania całej pamięci":"Połącz z grą"}
        disabled={isLoading}
        aria-expanded={isOpen}
      >
        <span className="fm-connect__dot" aria-hidden="true" />
        {connectionLabel}
        <span aria-hidden="true">»</span>
      </button>

      {loadedPlayerCount>0 && <button type="button" className="fm-connect__options" disabled={isLoading} onClick={()=>setIsOpen(open=>!open)} aria-label="Opcje połączenia" title="Opcje połączenia i pełny odczyt">⋯</button>}
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
                <span>FM26 / FM27</span>
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
              {(!processConnected || isChecking) && (
                <div className="fm-connect__process">
                  <span className="fm-connect__dot" aria-hidden="true" />
                  <strong>
                    {!desktopMode
                      ? "Uruchom wersję desktopową"
                      : isChecking
                        ? "Szukanie Football Managera…"
                        : "Nie wykryto uruchomionego Football Managera"}
                  </strong>
                </div>
              )}

              {displayedError && (
                <p className="fm-connect__message" data-tone="error">
                  {displayedError}
                </p>
              )}

              {result?.success && (
                <p className="fm-connect__message" data-tone="success">
                  {result.managedTeam ?? result.managedNation}:{" "}
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
                  ? "Odczytywanie danych z gry…"
                  : loadedPlayerCount > 0
                    ? "Połącz ponownie — pełny odczyt"
                    : "Połącz i wczytaj zawodników"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
