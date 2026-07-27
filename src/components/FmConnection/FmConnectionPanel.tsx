import { useCallback, useEffect, useState } from "react";

import {
  isDesktopApp,
  probeFootballManagerMemory,
  type FmDatabaseLoadResult,
  type FmMemoryStatus,
} from "../../services/fmConnection";

import "./FmConnectionPanel.css";
import {
  FmDatabasePanel,
  type FmDatabaseMonitorSummary,
} from "./FmDatabasePanel";

const CHECK_INTERVAL_MS = 2000;

interface FmConnectionPanelProps {
  onDatabaseLoaded: (result: FmDatabaseLoadResult) => void;
}

export function FmConnectionPanel({
  onDatabaseLoaded,
}: FmConnectionPanelProps) {
  const desktopMode = isDesktopApp();

  const [status, setStatus] = useState<FmMemoryStatus | null>(null);

  const [isChecking, setIsChecking] = useState(desktopMode);

  const [requestError, setRequestError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [monitorSummary, setMonitorSummary] =
    useState<FmDatabaseMonitorSummary | null>(null);

  const handleDatabaseLoaded = useCallback(
    (result: FmDatabaseLoadResult) => {
      setCollapsed(true);
      onDatabaseLoaded(result);
    },
    [onDatabaseLoaded],
  );

  const handleMonitorSummaryChange = useCallback(
    (summary: FmDatabaseMonitorSummary | null) => {
      setMonitorSummary(summary);
    },
    [],
  );

  const refreshStatus = useCallback(async () => {
    if (!desktopMode) {
      return;
    }

    try {
      setRequestError(null);

      const nextStatus = await probeFootballManagerMemory();

      setStatus(nextStatus);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError);

      setRequestError(message);
      setStatus(null);
    } finally {
      setIsChecking(false);
    }
  }, [desktopMode]);

  useEffect(() => {
    if (!desktopMode) {
      return;
    }

    void refreshStatus();

    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [desktopMode, refreshStatus]);

  const effectiveError = requestError ?? status?.error ?? null;

  const state = !desktopMode
    ? "browser"
    : effectiveError
      ? "error"
      : status?.memoryReadable
        ? "detected"
        : "not-detected";

  const statusLabel = (() => {
    if (!desktopMode) {
      return "Tryb przeglądarkowy";
    }

    if (isChecking && !status && !effectiveError) {
      return "Sprawdzanie…";
    }

    if (requestError) {
      return "Błąd backendu";
    }

    if (!status?.processDetected) {
      return "Nie wykryto Football Managera";
    }

    if (!status.memoryReadable) {
      return "FM wykryty — brak odczytu pamięci";
    }

    return "Połączono z procesem FM";
  })();

  return (
    <section
      className="fm-connection-panel"
      data-state={state}
      data-collapsed={collapsed}
      aria-labelledby="fm-connection-title"
    >
      <div className="fm-connection-panel__header">
        <div>
          <p className="fm-connection-panel__eyebrow">INTEGRACJA DESKTOPOWA</p>

          <h2 id="fm-connection-title" className="fm-connection-panel__title">
            Połączenie z Football Managerem
          </h2>
        </div>

        <div className="fm-connection-panel__header-actions">
          {monitorSummary && (
            <span
              className="fm-connection-panel__date-status"
              data-state={
                monitorSummary.dataStale
                  ? "stale"
                  : monitorSummary.available
                    ? "current"
                    : "unknown"
              }
            >
              <strong aria-hidden="true">
                {monitorSummary.dataStale
                  ? "!"
                  : monitorSummary.available
                    ? "✓"
                    : "?"}
              </strong>
              {monitorSummary.dataStale
                ? `Nieaktualne: ${monitorSummary.currentDate ?? "inna data"}`
                : `Dane: ${monitorSummary.importedDate ?? "bez daty"}`}
            </span>
          )}

          <div className="fm-connection-panel__status">
            <span className="fm-connection-panel__dot" aria-hidden="true" />
            <span>{statusLabel}</span>
          </div>

          <button
            type="button"
            className="fm-connection-panel__collapse"
            onClick={() => setCollapsed((current) => !current)}
            aria-expanded={!collapsed}
          >
            {collapsed ? "Pokaż import" : "Zwiń panel"}
          </button>
        </div>
      </div>

      <div className="fm-connection-panel__body">
        {!desktopMode && (
          <p className="fm-connection-panel__message">
            Odczyt procesu jest dostępny tylko w wersji desktopowej Tauri.
          </p>
        )}

        {desktopMode &&
          !isChecking &&
          !status?.processDetected &&
          !requestError && (
            <p className="fm-connection-panel__message">
              Uruchom Football Managera. Aplikacja sprawdza obecność procesu
              automatycznie co 2 sekundy.
            </p>
          )}

        {desktopMode && effectiveError && (
          <p className="fm-connection-panel__message">{effectiveError}</p>
        )}

        {desktopMode && status?.memoryReadable && (
          <>
            <p className="fm-connection-panel__message">
              Proces Football Managera jest otwarty wyłącznie z prawami odczytu.
              Pełna analiza buildu i bazy uruchamia się dopiero po kliknięciu
              przycisku poniżej.
            </p>

            <dl className="fm-connection-panel__details">
              <div>
                <dt>Proces</dt>
                <dd>{status.processName ?? "Nieznany"}</dd>
              </div>

              <div>
                <dt>PID</dt>
                <dd>{status.pid ?? "Brak"}</dd>
              </div>

              <div>
                <dt>Dostęp</dt>
                <dd>TYLKO ODCZYT</dd>
              </div>

              <div>
                <dt>Moduł bazowy</dt>
                <dd>{status.moduleBaseAddress ?? "Brak"}</dd>
              </div>

              <div>
                <dt>Sygnatura</dt>
                <dd>{status.executableSignature ?? "Brak"}</dd>
              </div>

              <div>
                <dt>Ścieżka</dt>
                <dd title={status.executablePath ?? undefined}>
                  {status.executablePath ?? "Ścieżka niedostępna"}
                </dd>
              </div>
            </dl>

            <FmDatabasePanel
              onDatabaseLoaded={handleDatabaseLoaded}
              onMonitorSummaryChange={handleMonitorSummaryChange}
            />
          </>
        )}
      </div>

      {desktopMode && (
        <div className="fm-connection-panel__footer">
          <button
            type="button"
            className="fm-connection-panel__refresh"
            onClick={() => void refreshStatus()}
            disabled={isChecking}
          >
            {isChecking ? "Sprawdzanie…" : "Sprawdź ponownie"}
          </button>
        </div>
      )}
    </section>
  );
}
