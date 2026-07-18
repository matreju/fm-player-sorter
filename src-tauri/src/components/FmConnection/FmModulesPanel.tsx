import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  inspectFootballManagerModules,
  type FmLoadedModule,
  type FmModuleReport,
} from "../../services/fmConnection";

function formatBytes(
  bytes: number | null,
): string {
  if (bytes === null) {
    return "Brak";
  }

  if (bytes >= 1024 ** 3) {
    return `${(
      bytes / 1024 ** 3
    ).toFixed(2)} GB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(
      bytes / 1024 ** 2
    ).toFixed(1)} MB`;
  }

  return `${Math.round(
    bytes / 1024,
  )} KB`;
}

function ModuleRow({
  module,
}: {
  module: FmLoadedModule;
}) {
  return (
    <article className="fm-module-row">
      <div className="fm-module-row__name">
        <strong>{module.name}</strong>

        <span>{module.category}</span>
      </div>

      <div>
        <span>W pamięci</span>
        <strong>
          {formatBytes(module.memorySize)}
        </strong>
      </div>

      <div>
        <span>Plik</span>
        <strong>
          {formatBytes(module.fileSize)}
        </strong>
      </div>

      <div>
        <span>Adres bazowy</span>
        <strong>{module.baseAddress}</strong>
      </div>

      <div>
        <span>Hash</span>
        <strong title={module.sha256 ?? undefined}>
          {module.shortHash ?? "Nieobliczony"}
        </strong>
      </div>
    </article>
  );
}

export function FmModulesPanel() {
  const [report, setReport] =
    useState<FmModuleReport | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadModules =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result =
          await inspectFootballManagerModules();

        setReport(result);
      } catch (unknownError) {
        setReport(null);

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
    void loadModules();
  }, [loadModules]);

  const candidates =
    report?.modules.filter(
      (module) => module.isCandidate,
    ) ?? [];

  return (
    <section className="fm-modules-panel">
      <div className="fm-build-panel__heading">
        <div>
          <p className="fm-connection-panel__eyebrow">
            MODUŁY PROCESU
          </p>

          <h3>
            Biblioteki załadowane przez FM
          </h3>
        </div>

        <button
          type="button"
          className="fm-connection-panel__refresh"
          disabled={isLoading}
          onClick={() => void loadModules()}
        >
          {isLoading
            ? "Analizowanie..."
            : "Odśwież moduły"}
        </button>
      </div>

      {isLoading && !report && (
        <p className="fm-connection-panel__message">
          Odczytywanie modułów i obliczanie
          hashy najważniejszych bibliotek…
        </p>
      )}

      {report && (
        <>
          <dl className="fm-connection-panel__details">
            <div>
              <dt>Wszystkie moduły</dt>
              <dd>{report.moduleCount}</dd>
            </div>

            <div>
              <dt>Kandydaci</dt>
              <dd>{report.candidateCount}</dd>
            </div>

            <div>
              <dt>Folder gry</dt>
              <dd title={report.gameDirectory}>
                {report.gameDirectory}
              </dd>
            </div>
          </dl>

          <div className="fm-modules-panel__list">
            {candidates.map((module) => (
              <ModuleRow
                key={`${module.name}-${module.baseAddress}`}
                module={module}
              />
            ))}
          </div>

          <details className="fm-modules-panel__all">
            <summary>
              Pokaż wszystkie moduły procesu
            </summary>

            <div className="fm-modules-panel__list">
              {report.modules.map((module) => (
                <ModuleRow
                  key={`all-${module.name}-${module.baseAddress}`}
                  module={module}
                />
              ))}
            </div>
          </details>
        </>
      )}

      {error && (
        <p className="fm-connection-panel__message">
          {error}
        </p>
      )}
    </section>
  );
}