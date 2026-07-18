import { useState } from "react";

import {
  loadFootballManagerDatabase,
  type FmDatabaseLoadResult,
} from "../../services/fmConnection";

interface CheckRowProps {
  label: string;
  ok: boolean;
  waiting?: boolean;
  value?: string | null;
}

function CheckRow({ label, ok, waiting = false, value }: CheckRowProps) {
  const state = waiting ? "waiting" : ok ? "ok" : "error";

  return (
    <div className="fm-database-panel__check" data-state={state}>
      <span className="fm-database-panel__check-icon" aria-hidden="true">
        {waiting ? "…" : ok ? "✓" : "×"}
      </span>

      <div>
        <strong>{label}</strong>
        {value && <small title={value}>{value}</small>}
      </div>
    </div>
  );
}

export function FmDatabasePanel() {
  const [result, setResult] = useState<FmDatabaseLoadResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const nextResult = await loadFootballManagerDatabase();
      setResult(nextResult);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : String(unknownError);

      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="fm-database-panel" aria-labelledby="fm-database-title">
      <div className="fm-database-panel__heading">
        <div>
          <p className="fm-database-panel__eyebrow">
            ZEWNĘTRZNY CZYTNIK PAMIĘCI
          </p>

          <h3 id="fm-database-title">Baza Football Managera</h3>
        </div>

        <span className="fm-database-panel__mode">Tylko odczyt</span>
      </div>

      <p className="fm-database-panel__description">
        Kliknięcie uruchamia identyfikację dokładnego buildu FM, sprawdzenie
        modułów IL2CPP i próbę odczytu bazy. Aplikacja nie wymaga BepInEx,
        pluginu ani otwierania wyszukiwarki zawodników.
      </p>

      <button
        type="button"
        className="fm-database-panel__load"
        onClick={() => void loadDatabase()}
        disabled={isLoading}
      >
        {isLoading ? "Sprawdzanie buildu i pamięci…" : "Wczytaj bazę danych"}
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
            data-state={result.success ? "success" : "warning"}
          >
            {result.message}
          </p>

          <div className="fm-database-panel__checks">
            <CheckRow
              label="Proces fm.exe i pamięć"
              ok={result.memory.memoryReadable}
              value={
                result.memory.pid
                  ? `PID ${result.memory.pid}`
                  : result.memory.error
              }
            />

            <CheckRow
              label="Hash fm.exe"
              ok={result.profile.fmExeMatches}
              value={result.profile.fmExeSha256}
            />

            <CheckRow
              label="Hash GameAssembly.dll"
              ok={result.profile.gameAssemblyMatches}
              value={result.profile.gameAssemblyBase}
            />

            <CheckRow
              label="global-metadata.dat"
              ok={
                result.profile.globalMetadataMatches &&
                result.profile.metadataHeaderValid
              }
              value={result.profile.globalMetadataSha256}
            />

            <CheckRow
              label="game_plugin.dll w procesie"
              ok={result.profile.gamePluginModuleReady}
              value={result.profile.gamePluginBase}
            />

            <CheckRow
              label="Test znanego RVA w GameAssembly"
              ok={result.profile.methodProbeReadable}
              value={
                result.profile.methodProbeAddress
                  ? `${result.profile.methodProbeRva} → ${result.profile.methodProbeAddress}`
                  : result.profile.methodProbeRva
              }
            />

            <CheckRow
              label="Kandydaci wskaźników statycznych"
              ok={result.profile.staticPointerCandidates.length > 0}
              waiting={
                result.profile.methodProbeReadable &&
                result.profile.staticPointerCandidates.length === 0
              }
              value={`${result.profile.staticPointerCandidates.length.toLocaleString(
                "pl-PL",
              )} kandydatów z kodu getterów`}
            />

            <CheckRow
              label="Rozpoznane korzenie runtime IL2CPP"
              ok={result.profile.resolvedRuntimeRootCount > 0}
              waiting={
                result.profile.staticPointerCandidates.length > 0 &&
                result.profile.resolvedRuntimeRootCount === 0
              }
              value={`${result.profile.resolvedRuntimeRootCount.toLocaleString(
                "pl-PL",
              )} rozpoznanych obiektów lub pól statycznych`}
            />

            <CheckRow
              label="Aktywna instancja FM.GamePlugin.GamePlugin"
              ok={result.profile.gamePluginInstances.some(
                (instance) => instance.likelyLiveInstance,
              )}
              waiting={
                Boolean(result.profile.gamePluginClassPointer) &&
                result.profile.gamePluginInstances.length === 0
              }
              value={
                result.profile.gamePluginInstances.length > 0
                  ? `${result.profile.gamePluginInstances.length.toLocaleString(
                      "pl-PL",
                    )} kandydatów; przeskanowano ${(
                      result.profile.instanceScanBytes /
                      1024 /
                      1024
                    ).toLocaleString("pl-PL", {
                      maximumFractionDigits: 1,
                    })} MB w ${result.profile.instanceScanDurationMs.toLocaleString(
                      "pl-PL",
                    )} ms`
                  : result.profile.gamePluginClassPointer
                    ? `Klasa ${result.profile.gamePluginClassPointer}; nie znaleziono żywej instancji`
                    : "Nie ustalono wskaźnika klasy GamePlugin"
              }
            />

            <CheckRow
              label="Główny rejestr bazy zawodników"
              ok={result.databaseRootFound}
              waiting={result.profile.runtimeReady && !result.databaseRootFound}
              value={
                result.databaseRootFound
                  ? `${result.playerCount.toLocaleString("pl-PL")} rekordów`
                  : "Po rozpoznaniu singletonów ustalimy pole rejestru Person/Player"
              }
            />
          </div>

          {result.profile.staticPointerCandidates.length > 0 && (
            <details className="fm-database-panel__candidates">
              <summary>
                Pokaż kandydatów statycznych wskaźników (
                {result.profile.staticPointerCandidates.length.toLocaleString(
                  "pl-PL",
                )}
                )
              </summary>

              <div className="fm-database-panel__candidate-list">
                {result.profile.staticPointerCandidates
                  .slice(0, 16)
                  .map((candidate) => (
                    <div
                      className="fm-database-panel__candidate"
                      key={`${candidate.sourceMethod}-${candidate.targetAddress}`}
                    >
                      <strong>{candidate.sourceMethod}</strong>
                      <code>RVA {candidate.sourceRva}</code>
                      <code>instrukcja {candidate.instructionAddress}</code>
                      <code>cel {candidate.targetAddress}</code>
                      <code>wartość {candidate.targetValue ?? "brak"}</code>
                      <code>
                        klasyfikacja {candidate.classification}
                      </code>
                      <code>
                        typ obiektu {candidate.objectNamespace
                          ? `${candidate.objectNamespace}.${candidate.objectTypeName}`
                          : candidate.objectTypeName ?? "nierozpoznany"}
                      </code>
                      <code>
                        typ bezpośredni {candidate.directClassNamespace
                          ? `${candidate.directClassNamespace}.${candidate.directClassName}`
                          : candidate.directClassName ?? "nierozpoznany"}
                      </code>
                      {candidate.staticFieldObjectType && (
                        <code>
                          pole statyczne {candidate.staticFieldsOffset} → {candidate.staticFieldObjectPointer} → {candidate.staticFieldObjectType}
                        </code>
                      )}
                      <code>
                        pasuje do gettera: {candidate.likelyExpectedObject ? "TAK" : "nie"}
                      </code>
                    </div>
                  ))}
              </div>
            </details>
          )}

          {result.profile.gamePluginInstances.length > 0 && (
            <details className="fm-database-panel__candidates">
              <summary>
                Pokaż aktywne instancje GamePlugin (
                {result.profile.gamePluginInstances.length.toLocaleString(
                  "pl-PL",
                )}
                )
              </summary>

              <div className="fm-database-panel__candidate-list">
                {result.profile.gamePluginInstances.map((instance) => (
                  <div
                    className="fm-database-panel__candidate"
                    key={instance.objectAddress}
                  >
                    <strong>{instance.objectType}</strong>
                    <code>obiekt {instance.objectAddress}</code>
                    <code>klasa {instance.classPointer}</code>
                    <code>
                      m_gamePlugin {instance.gamePluginBridgePointer ?? "brak"}
                      {instance.gamePluginBridgeType
                        ? ` → ${instance.gamePluginBridgeType}`
                        : ""}
                    </code>
                    <code>
                      m_receiver {instance.receiverPointer ?? "brak"}
                      {instance.receiverType
                        ? ` → ${instance.receiverType}`
                        : ""}
                    </code>
                    <code>
                      aktywna instancja: {instance.likelyLiveInstance ? "TAK" : "nie"}
                    </code>
                  </div>
                ))}
              </div>
            </details>
          )}

          <dl className="fm-database-panel__summary">
            <div>
              <dt>Profil</dt>
              <dd>{result.profile.profileId}</dd>
            </div>

            <div>
              <dt>Tryb</dt>
              <dd>Zewnętrzny, tylko odczyt</dd>
            </div>

            <div>
              <dt>BepInEx</dt>
              <dd>{result.requiresBepinex ? "Wymagany" : "Niewymagany"}</dd>
            </div>

            <div>
              <dt>Zawodnicy</dt>
              <dd>{result.playerCount.toLocaleString("pl-PL")}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
