import { useCallback, useEffect, useState } from "react";

import {
  inspectFootballManagerBuild,
  type FmBuildInfo,
} from "../../services/fmConnection";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

export function FmBuildPanel() {
  const [build, setBuild] =
    useState<FmBuildInfo | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadBuild = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result =
        await inspectFootballManagerBuild();

      setBuild(result);
    } catch (unknownError) {
      setBuild(null);

      setError(
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuild();
  }, [loadBuild]);

  return (
    <section className="fm-build-panel">
      <div className="fm-build-panel__heading">
        <div>
          <p className="fm-date-calibration__eyebrow">
            PROFIL WERSJI
          </p>

          <h3>Identyfikacja pliku fm.exe</h3>
        </div>

        <button
          type="button"
          className="fm-connection-panel__refresh"
          disabled={isLoading}
          onClick={() => void loadBuild()}
        >
          {isLoading
            ? "Obliczanie..."
            : "Odśwież profil"}
        </button>
      </div>

      {isLoading && !build && (
        <p className="fm-connection-panel__message">
          Obliczanie identyfikatora pliku fm.exe…
        </p>
      )}

      {build && (
        <dl className="fm-connection-panel__details">
          <div>
            <dt>Profil</dt>
            <dd title={build.profileId}>
              {build.profileId}
            </dd>
          </div>

          <div>
            <dt>Rozmiar fm.exe</dt>
            <dd>{formatBytes(build.fileSize)}</dd>
          </div>

          <div>
            <dt>Krótki hash</dt>
            <dd>{build.shortHash}</dd>
          </div>

          <div>
            <dt>SHA-256</dt>
            <dd title={build.sha256}>
              {build.sha256}
            </dd>
          </div>
        </dl>
      )}

      {error && (
        <p className="fm-date-calibration__error">
          {error}
        </p>
      )}
    </section>
  );
}