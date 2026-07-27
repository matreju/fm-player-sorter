import { useEffect, useState } from "react";

import {
  getFootballManagerDateStatus,
  loadFootballManagerDatabase,
  type FmDatabaseLoadResult,
  type FmDateStatus,
} from "../../services/fmConnection";

const DATE_CHECK_INTERVAL_MS = 1500;

export interface FmDatabaseMonitorSummary {
  importedDate: string | null;
  currentDate: string | null;
  dataStale: boolean;
  available: boolean;
  candidateCount: number;
}

interface FmDatabasePanelProps {
  onDatabaseLoaded: (result: FmDatabaseLoadResult) => void;
  onMonitorSummaryChange: (summary: FmDatabaseMonitorSummary | null) => void;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("pl-PL", {
    maximumFractionDigits: 0,
  })} MB`;
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1000).toLocaleString("pl-PL", {
    maximumFractionDigits: 1,
  })} s`;
}

function dateSourceLabel(source: string): string {
  if (source === "calibratedMemory") return "dokładny monitor pamięci";
  if (source === "manualReference") return "data potwierdzona z ekranu FM";
  return "monitor daty niedostępny";
}

export function FmDatabasePanel({
  onDatabaseLoaded,
  onMonitorSummaryChange,
}: FmDatabasePanelProps) {
  const [result, setResult] = useState<FmDatabaseLoadResult | null>(null);
  const [dateStatus, setDateStatus] = useState<FmDateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedGameDate, setExpectedGameDate] = useState("");

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
  }, [result?.success, result?.pid]);

  useEffect(() => {
    if (!result?.success) {
      onMonitorSummaryChange(null);
      return;
    }

    onMonitorSummaryChange({
      importedDate: dateStatus?.importedDate ?? result.gameDate,
      currentDate: dateStatus?.currentDate ?? result.gameDate,
      dataStale: dateStatus?.dataStale ?? false,
      available:
        dateStatus?.available ?? result.dateMonitorCandidates > 0,
      candidateCount:
        dateStatus?.candidateCount ?? result.dateMonitorCandidates,
    });
  }, [dateStatus, onMonitorSummaryChange, result]);

  const loadDatabase = async () => {
    if (!expectedGameDate) {
      setError("Najpierw wpisz dokładną datę widoczną obecnie w FM26.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setDateStatus(null);

      const nextResult = await loadFootballManagerDatabase(expectedGameDate);
      setResult({ ...nextResult, headers: [], rows: [] });

      if (nextResult.success) {
        onDatabaseLoaded(nextResult);
      }
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError),
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const importedDate = dateStatus?.importedDate ?? result?.gameDate ?? null;
  const currentDate = dateStatus?.currentDate ?? importedDate;
  const dataStale = dateStatus?.dataStale ?? false;
  const dateState = dataStale
    ? "stale"
    : dateStatus?.available
      ? "watching"
      : "unknown";

  return (
    <section className="fm-database-panel" aria-labelledby="fm-database-title">
      <div className="fm-database-panel__heading">
        <div>
          <p className="fm-database-panel__eyebrow">ZEWNĘTRZNY CZYTNIK PAMIĘCI</p>
          <h3 id="fm-database-title">Baza Football Managera</h3>
        </div>

        <span className="fm-database-panel__mode">Tylko odczyt</span>
      </div>

      <p className="fm-database-panel__description">
        Jeden pełny skan wczytuje wszystkich graczy, CA/PA, atrybuty widoczne,
        bramkarskie i ukryte oraz dane kontraktu. Podana data służy do znalezienia
        dokładnych punktów kalendarza w pamięci; później aplikacja sprawdza tylko
        te punkty i nie skanuje ponownie zawodników.
      </p>

      <label className="fm-database-panel__date-field">
        <span>Data widoczna teraz w FM26</span>
        <input
          type="date"
          value={expectedGameDate}
          onChange={(event) => setExpectedGameDate(event.target.value)}
          disabled={isLoading}
        />
        <small>
          Przepisz datę z gry przed importem. Termin meczu nie jest już używany
          jako data świata gry.
        </small>
      </label>

      <button
        type="button"
        className="fm-database-panel__load"
        onClick={() => void loadDatabase()}
        disabled={isLoading}
      >
        {isLoading
          ? "Wczytywanie wszystkich graczy…"
          : result?.success
            ? "Wczytaj bazę ponownie"
            : "Wczytaj zapis z FM26"}
      </button>

      {error && (
        <p className="fm-database-panel__message" data-state="error">
          {error}
        </p>
      )}

      {result && (
        <div className="fm-database-panel__result">
          <p
            className="fm-database-panel__message"
            data-state={result.success ? "success" : "error"}
          >
            {result.message}
          </p>

          {result.success && (
            <>
              <dl className="fm-database-panel__summary">
                <div>
                  <dt>Gracze</dt>
                  <dd>{result.playerCount.toLocaleString("pl-PL")}</dd>
                </div>
                <div>
                  <dt>Przeskanowano</dt>
                  <dd>{formatMegabytes(result.scannedBytes)}</dd>
                </div>
                <div>
                  <dt>Czas importu</dt>
                  <dd>{formatDuration(result.scanDurationMs)}</dd>
                </div>
                <div>
                  <dt>Profil</dt>
                  <dd>{result.profile ?? "FM26"}</dd>
                </div>
              </dl>

              <div
                className="fm-database-panel__date"
                data-state={dateState}
                title={`${dateSourceLabel(result.gameDateSource)}. Pełny skan uruchamia się tylko po kliknięciu przycisku.`}
              >
                <span className="fm-database-panel__date-icon" aria-hidden="true">
                  {dateState === "stale"
                    ? "!"
                    : dateState === "watching"
                      ? "✓"
                      : "?"}
                </span>
                <div>
                  <strong>
                    Dane z daty: {importedDate ?? "nieustalona"}
                  </strong>
                  <small>
                    {dataStale
                      ? `FM jest już przy dacie ${currentDate ?? "innej"} — dane są nieaktualne`
                      : dateStatus?.available
                        ? `Monitoring aktywny (${dateStatus.candidateCount.toLocaleString("pl-PL")} punktów pamięci)`
                        : dateStatus?.error ??
                          "Monitoring daty oczekuje na czytelny punkt pamięci"}
                  </small>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
