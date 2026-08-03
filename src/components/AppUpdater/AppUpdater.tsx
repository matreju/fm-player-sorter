import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  check,
  type Update,
  type DownloadEvent,
} from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";

import { isDesktopApp } from "../../services/fmConnection";
import "./AppUpdater.css";

type UpdateState =
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "downloading"
  | "installing"
  | "error";

export function AppUpdater() {
  const desktopMode = isDesktopApp();
  const [currentVersion, setCurrentVersion] = useState("0.4.2");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [state, setState] = useState<UpdateState>("idle");
  const [message, setMessage] = useState(
    "Aplikacja automatycznie sprawdza podpisane wydania.",
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const updateRef = useRef<Update | null>(null);
  const autoCheckStartedRef = useRef(false);

  useEffect(() => {
    updateRef.current = availableUpdate;
  }, [availableUpdate]);

  useEffect(() => {
    if (!desktopMode) return;

    void getVersion().then(setCurrentVersion).catch(() => undefined);

    return () => {
      const update = updateRef.current;
      if (update) void update.close().catch(() => undefined);
    };
  }, [desktopMode]);

  const checkForUpdates = useCallback(
    async (manual = false) => {
      if (!desktopMode || state === "checking" || state === "downloading") return;

      try {
        setState("checking");
        setMessage("Sprawdzanie najnowszej wersji…");
        const update = await check({ timeout: 30_000 });

        if (!update) {
          setAvailableUpdate(null);
          setState("current");
          setMessage("Masz najnowszą opublikowaną wersję.");
          return;
        }

        setAvailableUpdate(update);
        setState("available");
        setMessage(`Dostępna jest wersja ${update.version}.`);
      } catch (unknownError) {
        setState(manual ? "error" : "idle");
        setMessage(
          manual
            ? `Nie udało się sprawdzić aktualizacji: ${
                unknownError instanceof Error
                  ? unknownError.message
                  : String(unknownError)
              }`
            : "Nie udało się połączyć z serwerem aktualizacji. Możesz ponowić sprawdzenie z menu wersji.",
        );
      }
    },
    [desktopMode, state],
  );

  useEffect(() => {
    if (!desktopMode || autoCheckStartedRef.current) return;
    autoCheckStartedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      void checkForUpdates(false);
    }, 4_000);

    return () => window.clearTimeout(timeoutId);
  }, [checkForUpdates, desktopMode]);

  const installUpdate = async () => {
    if (!availableUpdate) return;

    let downloaded = 0;
    let total: number | undefined;

    const onProgress = (event: DownloadEvent) => {
      if (event.event === "Started") {
        total = event.data.contentLength;
        setState("downloading");
        setMessage("Pobieranie aktualizacji…");
        setProgress(total ? 0 : null);
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        setProgress(total ? Math.min(100, Math.round((downloaded / total) * 100)) : null);
      } else {
        setState("installing");
        setProgress(100);
        setMessage("Instalowanie — aplikacja za chwilę się zamknie.");
      }
    };

    try {
      await availableUpdate.downloadAndInstall(onProgress, { timeout: 120_000 });
      setState("installing");
      setMessage("Aktualizacja zainstalowana — ponowne uruchamianie aplikacji…");
      await relaunch();
    } catch (unknownError) {
      setState("error");
      setProgress(null);
      setMessage(
        `Aktualizacja nie powiodła się: ${
          unknownError instanceof Error ? unknownError.message : String(unknownError)
        }`,
      );
    }
  };

  if (!desktopMode) return null;

  const busy = state === "checking" || state === "downloading" || state === "installing";

  return (
    <div className="app-updater" data-state={state}>
      <button
        type="button"
        className="app-updater__trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        title="Aktualizacje aplikacji"
      >
        <span aria-hidden="true">↻</span>
        v{currentVersion}
        {state === "available" && <i aria-label="Dostępna aktualizacja" />}
      </button>

      {isOpen && (
        <section
          className="app-updater__popover"
          aria-labelledby="app-updater-title"
        >
          <div className="app-updater__heading">
            <strong id="app-updater-title">Aktualizacje</strong>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Zamknij"
            >
              ×
            </button>
          </div>

          <p>{message}</p>

          {progress !== null && (
            <div
              className="app-updater__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}

          {state === "available" ? (
            <button
              type="button"
              className="app-updater__action"
              onClick={() => void installUpdate()}
            >
              Pobierz i zainstaluj v{availableUpdate?.version}
            </button>
          ) : (
            <button
              type="button"
              className="app-updater__action"
              onClick={() => void checkForUpdates(true)}
              disabled={busy}
            >
              {state === "checking" ? "Sprawdzanie…" : "Sprawdź aktualizacje"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
