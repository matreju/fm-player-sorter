import { useRef, useState, type CSSProperties } from "react";
import { styles } from "../../styles";
import type { SortConfig } from "../../types/table";
import {
  clearAppData,
  downloadAppDataBackup,
  getAppDataBackupSummary,
  parseAppDataBackup,
  replaceAppDataFromBackup,
} from "../../utils/appDataBackup";

type AppStatusPanelProps = {
  fileName: string;
  shownPlayersCount: number;
  totalPlayersCount: number;
  visibleColumnsCount: number;
  totalColumnsCount: number;
  sortConfig: SortConfig;
  error: string;
};

const statusTopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const profileButtonStyle: CSSProperties = {
  height: 32,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid rgba(56, 189, 248, 0.65)",
  background: "rgba(14, 165, 233, 0.15)",
  color: "#bae6fd",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(3, 7, 18, 0.78)",
  backdropFilter: "blur(7px)",
};

const modalStyle: CSSProperties = {
  width: "min(760px, calc(100vw - 32px))",
  maxHeight: "calc(100vh - 32px)",
  overflow: "auto",
  border: "1px solid #334155",
  borderRadius: 18,
  background: "#0f172a",
  color: "#e5edf8",
  boxShadow: "0 30px 90px rgba(0,0,0,0.72)",
};

const modalHeaderStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "16px 18px",
  borderBottom: "1px solid #26334a",
  background:
    "linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))",
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const modalSubtitleStyle: CSSProperties = {
  marginTop: 4,
  color: "#aebbd0",
  fontSize: 13,
  fontWeight: 800,
};

const closeButtonStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 13,
  border: "1px solid #475569",
  background: "#111827",
  color: "#e5edf8",
  cursor: "pointer",
  fontSize: 24,
  fontWeight: 950,
};

const modalBodyStyle: CSSProperties = {
  padding: 16,
  display: "grid",
  gap: 12,
};

const infoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const infoCardStyle: CSSProperties = {
  minHeight: 76,
  padding: 12,
  border: "1px solid #29364d",
  borderRadius: 14,
  background: "#111827",
};

const infoLabelStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const infoValueStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "#f8fafc",
  fontSize: 22,
  lineHeight: 1,
  fontWeight: 950,
};

const sectionStyle: CSSProperties = {
  padding: 14,
  border: "1px solid #29364d",
  borderRadius: 16,
  background: "#111827",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#f8fafc",
  fontSize: 17,
  fontWeight: 950,
};

const sectionTextStyle: CSSProperties = {
  margin: 0,
  color: "#aebbd0",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 750,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const actionButtonStyle: CSSProperties = {
  height: 34,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "rgba(15, 23, 42, 0.9)",
  color: "#dbeafe",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 950,
};

const primaryActionButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  borderColor: "rgba(56, 189, 248, 0.75)",
  background: "rgba(14, 165, 233, 0.16)",
  color: "#bae6fd",
};

const successActionButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  borderColor: "rgba(34, 197, 94, 0.7)",
  background: "rgba(22, 101, 52, 0.22)",
  color: "#bbf7d0",
};

const dangerActionButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  borderColor: "rgba(248, 113, 113, 0.75)",
  background: "rgba(127, 29, 29, 0.22)",
  color: "#fecaca",
};

const feedbackStyle: CSSProperties = {
  padding: "9px 11px",
  border: "1px solid rgba(56, 189, 248, 0.32)",
  borderRadius: 12,
  background: "rgba(14, 165, 233, 0.1)",
  color: "#dbeafe",
  fontSize: 13,
  fontWeight: 850,
};

const errorFeedbackStyle: CSSProperties = {
  ...feedbackStyle,
  borderColor: "rgba(248, 113, 113, 0.45)",
  background: "rgba(127, 29, 29, 0.18)",
  color: "#fecaca",
};

const warningBoxStyle: CSSProperties = {
  padding: 12,
  border: "1px solid rgba(251, 191, 36, 0.45)",
  borderRadius: 14,
  background: "rgba(120, 53, 15, 0.18)",
  color: "#fde68a",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 800,
};

function reloadApp() {
  window.setTimeout(() => {
    window.location.reload();
  }, 150);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AppStatusPanel({
  fileName,
  shownPlayersCount,
  totalPlayersCount,
  visibleColumnsCount,
  totalColumnsCount,
  sortConfig,
  error,
}: AppStatusPanelProps) {
  const hasRows = totalPlayersCount > 0;
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error">("info");

  const backupSummary = getAppDataBackupSummary();

  function showInfo(message: string) {
    setFeedbackTone("info");
    setFeedback(message);
  }

  function showError(message: string) {
    setFeedbackTone("error");
    setFeedback(message);
  }

  function handleExportBackup() {
    try {
      const latestSummary = getAppDataBackupSummary();

      downloadAppDataBackup(fileName || "profil");

      showInfo(
        `Pobrano backup profilu. Zapisane klucze: ${
          latestSummary.keysCount
        }, rozmiar: ${formatBytes(latestSummary.totalBytes)}.`
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Nie udało się pobrać backupu."
      );
    }
  }

  async function handleImportBackup(file: File) {
    try {
      const raw = await file.text();
      const backup = parseAppDataBackup(raw);
      const keysCount = Object.keys(backup.items).length;

      const confirmed = confirm(
        [
          "Wczytać profil aplikacji z backupu?",
          "",
          `Plik: ${file.name}`,
          `Dane w backupie: ${keysCount} kluczy`,
          backup.exportedAt
            ? `Data eksportu: ${new Date(backup.exportedAt).toLocaleString()}`
            : "",
          "",
          "Obecne dane aplikacji zostaną zastąpione danymi z backupu.",
        ]
          .filter(Boolean)
          .join("\n")
      );

      if (!confirmed) {
        return;
      }

      replaceAppDataFromBackup(backup);
      showInfo("Backup wczytany. Aplikacja odświeży się za moment.");
      reloadApp();
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Nie udało się wczytać backupu."
      );
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function handleResetApp() {
    const wantsBackup = confirm(
      [
        "Przed resetem warto pobrać backup profilu.",
        "",
        "Kliknij OK, żeby najpierw pobrać backup.",
        "Kliknij Anuluj, żeby przejść dalej bez pobierania backupu.",
      ].join("\n")
    );

    if (wantsBackup) {
      handleExportBackup();
    }

    const typed = prompt(
      [
        "Reset aplikacji usunie lokalne dane fm-player-sorter z tej przeglądarki:",
        "",
        "- aktualnie wczytany plik",
        "- powołania i odrzucenia",
        "- zgrupowania",
        "- kampanie",
        "- ustawienia XI",
        "- ukrycia i zapisane preferencje",
        "- raport zmian po imporcie",
        "",
        'Wpisz RESET, żeby potwierdzić.',
      ].join("\n")
    );

    if (typed !== "RESET") {
      showInfo("Reset anulowany.");
      return;
    }

    clearAppData();
    showInfo("Dane aplikacji wyczyszczone. Aplikacja odświeży się za moment.");
    reloadApp();
  }

  return (
    <>
      <section style={styles.appStatusPanel} aria-labelledby="app-status-title">
        <h2 id="app-status-title" style={styles.visuallyHidden}>
          Status danych
        </h2>

        <div style={statusTopRowStyle}>
          <div>
            <div style={styles.stats} aria-live="polite">
              <span>
                Plik: <strong>{fileName || "brak"}</strong>
              </span>

              <span>
                Pokazani piłkarze: <strong>{shownPlayersCount}</strong> /{" "}
                {totalPlayersCount}
              </span>

              <span>
                Kolumny widoczne: <strong>{visibleColumnsCount}</strong> /{" "}
                {totalColumnsCount}
              </span>
            </div>

            {sortConfig && (
              <p style={styles.sortInfo}>
                Sortowanie: <strong>{sortConfig.column}</strong>{" "}
                {sortConfig.direction === "desc"
                  ? "od największego do najmniejszego"
                  : "od najmniejszego do największego"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            style={profileButtonStyle}
            title="Eksport, import i reset danych aplikacji"
          >
            Profil / backup
          </button>
        </div>

        {error && (
          <p style={styles.error} role="alert">
            {error}
          </p>
        )}

        {!hasRows && !error && (
          <div style={styles.emptyDataState} role="status">
            <strong>Brak wczytanych piłkarzy.</strong>
            <span>
              Wczytaj plik HTML albo CSV z FM-a, żeby rozpocząć analizę.
            </span>
          </div>
        )}
      </section>

      {isProfileModalOpen && (
        <div
          style={overlayStyle}
          onMouseDown={() => setIsProfileModalOpen(false)}
        >
          <section
            style={modalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-backup-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header style={modalHeaderStyle}>
              <div>
                <h2 id="profile-backup-title" style={modalTitleStyle}>
                  Profil aplikacji
                </h2>

                <div style={modalSubtitleStyle}>
                  Backup, import i reset danych zapisanych lokalnie w tej
                  przeglądarce.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={closeButtonStyle}
                aria-label="Zamknij profil aplikacji"
                title="Zamknij"
              >
                ×
              </button>
            </header>

            <div style={modalBodyStyle}>
              <div style={infoGridStyle}>
                <div style={infoCardStyle}>
                  <div style={infoLabelStyle}>Plik</div>
                  <strong style={infoValueStyle}>
                    {fileName ? "Wczytany" : "Brak"}
                  </strong>
                </div>

                <div style={infoCardStyle}>
                  <div style={infoLabelStyle}>Zawodnicy</div>
                  <strong style={infoValueStyle}>{totalPlayersCount}</strong>
                </div>

                <div style={infoCardStyle}>
                  <div style={infoLabelStyle}>Dane lokalne</div>
                  <strong style={infoValueStyle}>
                    {backupSummary.keysCount}
                  </strong>
                </div>
              </div>

              {feedback && (
                <div
                  style={
                    feedbackTone === "error" ? errorFeedbackStyle : feedbackStyle
                  }
                  role={feedbackTone === "error" ? "alert" : "status"}
                >
                  {feedback}
                </div>
              )}

              <section style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Eksport profilu</h3>

                <p style={sectionTextStyle}>
                  Pobiera plik JSON z lokalnymi danymi aplikacji. To jest kopia
                  zapasowa aktualnego save&apos;a/reprezentacji: import,
                  powołania, zgrupowania, kampanie, ustawienia XI, ukrycia i
                  raporty zmian.
                </p>

                <div style={actionRowStyle}>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    style={primaryActionButtonStyle}
                  >
                    Pobierz backup
                  </button>

                  <span style={sectionTextStyle}>
                    Obecnie: {backupSummary.keysCount} kluczy ·{" "}
                    {formatBytes(backupSummary.totalBytes)}
                  </span>
                </div>
              </section>

              <section style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Import profilu</h3>

                <p style={sectionTextStyle}>
                  Wczytuje wcześniej pobrany backup. Obecne dane aplikacji
                  zostaną zastąpione danymi z pliku, a aplikacja odświeży się
                  automatycznie.
                </p>

                <div style={actionRowStyle}>
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    style={successActionButtonStyle}
                  >
                    Wczytaj backup
                  </button>

                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handleImportBackup(file);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              </section>

              <section style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Reset aplikacji</h3>

                <div style={warningBoxStyle}>
                  Reset usuwa lokalne dane fm-player-sorter z tej przeglądarki.
                  Przed resetem aplikacja zaproponuje pobranie backupu, a potem
                  poprosi o wpisanie RESET.
                </div>

                <div style={actionRowStyle}>
                  <button
                    type="button"
                    onClick={handleResetApp}
                    style={dangerActionButtonStyle}
                  >
                    Resetuj aplikację
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}