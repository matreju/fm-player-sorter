import { useEffect, useMemo, useState } from "react";
import { HIDDEN_COLUMNS } from "./constants/columns";
import { styles } from "./styles";
import type { SortConfig, TableRow } from "./types/table";
import { parseHtmlTable } from "./utils/parseHtmlTable";
import { parseCsvTable } from "./utils/parseCsvTable";
import { clearStoredTable, loadStoredTable, saveStoredTable } from "./utils/storage";
import { compareValues, getSortableNumber } from "./utils/sortTable";
import { matchesFootFilter, type FootFilter } from "./utils/filters";
import { PlayerCompare } from "./components/player-compare";
import { MainToolbar } from "./components/main-toolbar";
import { useSquadDepth } from "./hooks/useSquadDepth";
import { getPlayerRoleAttributeInsights } from "./utils/playerRoleInsights";
import { getCandidateTypeForPosition } from "./utils/candidateType";
import { NationalCoreDrawer } from "./components/national-core";
import {
  ROLE_DEFINITIONS,
  getRolePhaseLabel,
} from "./constants/roles";
import {
  formatRoleScore,
  formatRoleScoreRange,
  formatRoleUncertainty,
  getBestRoleMatch,
  type RolePhaseFilter,
} from "./utils/roleScoring";
import {
  formatRoleSide,
  formatSideProfile,
  formatSideScore,
  getRoleSideFit,
} from "./utils/sideFit";
import {
  calculatePositionFit,
  formatCandidateKind,
  formatPositionScore,
  getBestPositionFit,
  getCandidateKind,
  getPhaseLabel,
  getPositionGroups,
} from "./utils/positionScoring";
import {
  applyClubFormImpact,
  calculateClubFormImpact,
  formatClubFormImpact,
} from "./utils/clubForm";
import { SELECTION_POSITION_ORDER } from "./constants/selection";
import { usePlayerSelection } from "./hooks/usePlayerSelection";
import { getPlayerKey } from "./utils/playerIdentity";
import { SquadDepthDrawer } from "./components/squad-depth";
import { RoleAnalysisToolbar } from "./components/role-analysis-toolbar";
import { PlayerDetailsPanel } from "./components/player-details";
import { getMoneyballTableSummary } from "./utils/moneyball";
import { SquadBuilder } from "./components/squad-builder";
import { CampsDrawer } from "./components/camps";
import { PlayerTable } from "./components/player-table";
import { AppStatusPanel } from "./components/app-shell";
import {
  CANDIDATE_TYPE_COLUMN,
  CLUB_FORM_COLUMN,
  COMPACT_TABLE_COLUMNS,
  MONEYBALL_COLUMN,
  OVERALL_POSITION_COLUMN,
  OVERALL_ROLE_COLUMN,
  OVERALL_SCORE_COLUMN,
  PLAYER_MARK_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SCORE_COLUMN,
  ROLE_SCORE_RANGE_COLUMN,
  ROLE_SCORE_UNCERTAINTY_COLUMN,
  ROLE_SIDE_COLUMN,
  ROLE_SIDE_PROFILE_COLUMN,
  ROLE_SIDE_SCORE_COLUMN,
  insertRoleAnalysisColumns,
} from "./constants/appColumns";
import { normalizeTextForSearch } from "./utils/textSearch";



export default function App() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minAge, setMinAge] = useState("");
const [maxAge, setMaxAge] = useState("");
const [footFilter, setFootFilter] = useState<FootFilter>("any");
const [analysisPositionGroup, setAnalysisPositionGroup] = useState("any");
const [analysisPhase, setAnalysisPhase] = useState<RolePhaseFilter>("any");
const [analysisRoleId, setAnalysisRoleId] = useState("any");
const [minRoleScore, setMinRoleScore] = useState("60");
const [onlyRoleMatches, setOnlyRoleMatches] = useState(true);


const [showOnlySelectedPlayers, setShowOnlySelectedPlayers] = useState(false);
const [hideMarkedPlayers, setHideMarkedPlayers] = useState(false);
const {
  playerMarks,
  playerSelectionPositions,
  selectedPlayersCount,
  rejectedPlayersCount,
  selectedPlayersWithPositionCount,
  getPlayerMark,
  getPlayerSelectionPosition,
  setPlayerSelectionPosition,
  togglePlayerMark,
  clearPlayerSelection,
  getMarkedCellStyle,
} = usePlayerSelection({
  analysisPositionGroup,
});
const {
  selectedPlayersWithoutPositionCount,
  squadDepthByPosition,
  squadDepthWarnings,
} = useSquadDepth({
  rows,
  playerMarks,
  playerSelectionPositions,
});


const [compactTableMode, setCompactTableMode] = useState(true);
const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(null);
const [squadDepthOpen, setSquadDepthOpen] = useState(false);


const rolePositionOptions = useMemo(() => {
  return Array.from(
    new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup))
  );
}, []);

const availableAnalysisRoles = useMemo(() => {
  return ROLE_DEFINITIONS.filter((role) => {
    if (
      analysisPositionGroup !== "any" &&
      role.positionGroup !== analysisPositionGroup
    ) {
      return false;
    }

    if (analysisPhase !== "any" && role.phase !== analysisPhase) {
      return false;
    }

    return true;
  });
}, [analysisPositionGroup, analysisPhase]);

  useEffect(() => {
    const saved = loadStoredTable();

    if (!saved) {
      return;
    }

    setHeaders(saved.headers);
    setRows(saved.rows);
    setFileName(saved.fileName || "zapisany plik");
  }, []);

  const visibleHeaders = useMemo(() => {
    return headers.filter((header) => !HIDDEN_COLUMNS.has(header));
  }, [headers]);

const tableHeaders = useMemo(() => {
  if (headers.length === 0) {
    return [];
  }

  const allHeaders = insertRoleAnalysisColumns(visibleHeaders);

  if (!compactTableMode) {
    return allHeaders;
  }

  return allHeaders.filter((header) => COMPACT_TABLE_COLUMNS.has(header));
}, [headers.length, visibleHeaders, compactTableMode]);

const filteredRows = useMemo(() => {
  const normalizedSearch = normalizeTextForSearch(searchTerm);

  const minAgeNumber = minAge.trim() ? Number(minAge) : null;
  const maxAgeNumber = maxAge.trim() ? Number(maxAge) : null;

  return rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      visibleHeaders.some((header) => {
        const value = row[header] ?? "";
        return normalizeTextForSearch(value).includes(normalizedSearch);
      });

    const age = getSortableNumber(row["Wiek"] ?? "");

    const matchesMinAge =
      minAgeNumber === null ||
      !Number.isFinite(minAgeNumber) ||
      (age !== null && age >= minAgeNumber);

    const matchesMaxAge =
      maxAgeNumber === null ||
      !Number.isFinite(maxAgeNumber) ||
      (age !== null && age <= maxAgeNumber);

    const matchesFoot = matchesFootFilter(row, footFilter);

    return matchesSearch && matchesMinAge && matchesMaxAge && matchesFoot;
  });
}, [rows, searchTerm, visibleHeaders, minAge, maxAge, footFilter]);
const scoredRows = useMemo<TableRow[]>(() => {
  const usePositionRanking =
    analysisPositionGroup !== "any" &&
    analysisPhase === "any" &&
    analysisRoleId === "any";

  return filteredRows
    .map((row) => {
      const clubFormImpact = calculateClubFormImpact(row);
      if (usePositionRanking) {
        const targetPositionFit = calculatePositionFit(
          row,
          analysisPositionGroup
        );

        const overallPositionFit = getBestPositionFit(row);

        const candidateKind = getCandidateKind(
          targetPositionFit,
          overallPositionFit
        );

        return {
          ...row,

          [ROLE_SCORE_COLUMN]: targetPositionFit
  ? formatPositionScore(
      applyClubFormImpact(targetPositionFit.score, clubFormImpact)
    )
  : "-",

  [CLUB_FORM_COLUMN]: formatClubFormImpact(clubFormImpact),
  [MONEYBALL_COLUMN]:getMoneyballTableSummary(row, rows),
          [CANDIDATE_TYPE_COLUMN]: formatCandidateKind(candidateKind),

          [ROLE_SCORE_RANGE_COLUMN]: "-",

          [ROLE_SCORE_UNCERTAINTY_COLUMN]: "-",

          [ROLE_BEST_ROLE_COLUMN]: targetPositionFit?.primaryRole
            ? targetPositionFit.primaryRole.role.name
            : "-",

          [ROLE_PHASE_COLUMN]: targetPositionFit?.primaryRole
            ? `pozycja łączona / ${getPhaseLabel(
                targetPositionFit.primaryRole.role.phase
              )}`
            : "-",

          [ROLE_SIDE_COLUMN]: "-",

          [ROLE_SIDE_SCORE_COLUMN]: "-",

          [ROLE_SIDE_PROFILE_COLUMN]: "-",

          [OVERALL_POSITION_COLUMN]: overallPositionFit
            ? overallPositionFit.positionGroup
            : "-",

          [OVERALL_ROLE_COLUMN]: overallPositionFit?.primaryRole
            ? overallPositionFit.primaryRole.role.name
            : "-",

          [OVERALL_SCORE_COLUMN]: overallPositionFit
            ? formatPositionScore(overallPositionFit.score)
            : "-",
        };
      }

      const bestSelectedMatch = getBestRoleMatch(row, {
        positionGroup:
          analysisPositionGroup === "any"
            ? undefined
            : analysisPositionGroup,
        phase: analysisPhase,
        roleId: analysisRoleId,
      });

      const bestOverallMatch = getBestRoleMatch(row);

      const selectedSideFit = bestSelectedMatch
        ? getRoleSideFit(row, bestSelectedMatch.role)
        : null;

      return {
        ...row,

        [ROLE_SCORE_COLUMN]: bestSelectedMatch
  ? formatRoleScore(
      applyClubFormImpact(bestSelectedMatch.score, clubFormImpact)
    )
  : "-",

  [CLUB_FORM_COLUMN]: formatClubFormImpact(clubFormImpact),
  [MONEYBALL_COLUMN]: getMoneyballTableSummary(row, rows),
        [CANDIDATE_TYPE_COLUMN]: getCandidateTypeForPosition(
  row,
  analysisPositionGroup
),

        [ROLE_SCORE_RANGE_COLUMN]: formatRoleScoreRange(bestSelectedMatch),

        [ROLE_SCORE_UNCERTAINTY_COLUMN]:
          formatRoleUncertainty(bestSelectedMatch),

        [ROLE_BEST_ROLE_COLUMN]: bestSelectedMatch
          ? bestSelectedMatch.role.name
          : "-",

        [ROLE_PHASE_COLUMN]: bestSelectedMatch
          ? getRolePhaseLabel(bestSelectedMatch.role.phase)
          : "-",

        [ROLE_SIDE_COLUMN]: formatRoleSide(selectedSideFit),

        [ROLE_SIDE_SCORE_COLUMN]: formatSideScore(selectedSideFit),

        [ROLE_SIDE_PROFILE_COLUMN]: formatSideProfile(selectedSideFit),

        [OVERALL_POSITION_COLUMN]: bestOverallMatch
          ? bestOverallMatch.role.positionGroup
          : "-",

        [OVERALL_ROLE_COLUMN]: bestOverallMatch
          ? bestOverallMatch.role.name
          : "-",

        [OVERALL_SCORE_COLUMN]: bestOverallMatch
          ? formatRoleScore(bestOverallMatch.score)
          : "-",
      };
    })
  }, [
  filteredRows,
  analysisPositionGroup,
  analysisPhase,
  analysisRoleId,
  ]);
const analyzedRows = useMemo<TableRow[]>(() => {
  const minimumScore = getSortableNumber(minRoleScore) ?? 0;

  return scoredRows.filter((row) => {
    const mark = getPlayerMark(row);

    if (showOnlySelectedPlayers) {
      const isSelected = mark === "selected";
      const hasAssignedPosition =
        getPlayerSelectionPosition(row).trim() !== "";

      return isSelected && hasAssignedPosition;
    }

    if (hideMarkedPlayers) {
      if (mark === "selected" || mark === "rejected") {
        return false;
      }
    }

    if (!onlyRoleMatches) {
      return true;
    }

    const score = getSortableNumber(row[ROLE_SCORE_COLUMN] ?? "");

    if (score === null) {
      return false;
    }

    return score >= minimumScore;
  });
}, [
  scoredRows,
  minRoleScore,
  onlyRoleMatches,
  showOnlySelectedPlayers,
  hideMarkedPlayers,
  playerMarks,
  playerSelectionPositions,
]);
const sortedRows = useMemo(() => {
  if (showOnlySelectedPlayers) {
    return [...analyzedRows].sort((a, b) => {
      const positionA = getPlayerSelectionPosition(a);
      const positionB = getPlayerSelectionPosition(b);

const orderA = SELECTION_POSITION_ORDER[positionA] ?? 999;
const orderB = SELECTION_POSITION_ORDER[positionB] ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return compareValues(
        a["Nazwisko"] ?? "",
        b["Nazwisko"] ?? "",
        "asc"
      );
    });
  }

  if (!sortConfig) {
    return analyzedRows;
  }

  return [...analyzedRows].sort((a, b) =>
    compareValues(
      a[sortConfig.column],
      b[sortConfig.column],
      sortConfig.direction
    )
  );
}, [
  analyzedRows,
  sortConfig,
  showOnlySelectedPlayers,
  playerSelectionPositions,
]);


const selectedPlayer = useMemo(() => {
  if (!selectedPlayerKey) {
    return null;
  }

  return (
    analyzedRows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
    rows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
    null
  );
}, [selectedPlayerKey, analyzedRows, rows]);


const selectedPlayerTopPositions = useMemo(() => {
  if (!selectedPlayer) {
    return [];
  }

  return getPositionGroups()
    .map((positionGroup) => calculatePositionFit(selectedPlayer, positionGroup))
    .filter((result) => result !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}, [selectedPlayer]);
const selectedPlayerCurrentRoleMatch = useMemo(() => {
  if (!selectedPlayer) {
    return null;
  }

  return getBestRoleMatch(selectedPlayer, {
    positionGroup:
      analysisPositionGroup === "any" ? undefined : analysisPositionGroup,
    phase: analysisPhase,
    roleId: analysisRoleId,
  });
}, [
  selectedPlayer,
  analysisPositionGroup,
  analysisPhase,
  analysisRoleId,
]);

const selectedPlayerRoleInsights = useMemo(() => {
  if (!selectedPlayer || !selectedPlayerCurrentRoleMatch) {
    return {
      strengths: [],
      weaknesses: [],
    };
  }

  return getPlayerRoleAttributeInsights(
    selectedPlayer,
    selectedPlayerCurrentRoleMatch.role
  );
}, [selectedPlayer, selectedPlayerCurrentRoleMatch]);

  async function handleFileUpload(file: File) {
    setError("");
    setFileName(file.name);
    setSortConfig(null);
    setSearchTerm("");
    setMinAge("");
  setMaxAge("");
  setFootFilter("any");

    try {
const text = await file.text();
const lowerCaseFileName = file.name.toLowerCase();

const parsed = lowerCaseFileName.endsWith(".csv")
  ? parseCsvTable(text)
  : parseHtmlTable(text);

      setHeaders(parsed.headers);
      setRows(parsed.rows);

      saveStoredTable({
        headers: parsed.headers,
        rows: parsed.rows,
        fileName: file.name,
      });
    } catch (err) {
      setHeaders([]);
      setRows([]);
      setFileName("");
      setSortConfig(null);
      setSearchTerm("");

      clearStoredTable();

      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się wczytać pliku."
      );
    }
  }

  function handleSort(column: string) {
    setSortConfig((current) => {
      if (!current || current.column !== column) {
        return {
          column,
          direction: "desc",
        };
      }

      return {
        column,
        direction: current.direction === "desc" ? "asc" : "desc",
      };
    });
  }

  function handleClearData() {
    clearStoredTable();

    setHeaders([]);
    setRows([]);
    setFileName("");
    setSortConfig(null);
    setSearchTerm("");
    setMinAge("");
  setMaxAge("");
  setFootFilter("any");
    setError("");
  }

return (
<main style={styles.page} aria-labelledby="app-title">
      <div style={styles.appShell}>
      <aside style={styles.leftSidebar} aria-label="Filtry i import danych">
        <h1 id="app-title" style={styles.sidebarTitle}>
  FM Player Sorter
</h1>

        <MainToolbar
          fileName={fileName}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          minAge={minAge}
          setMinAge={setMinAge}
          maxAge={maxAge}
          setMaxAge={setMaxAge}
          footFilter={footFilter}
          setFootFilter={setFootFilter}
          showOnlySelectedPlayers={showOnlySelectedPlayers}
          setShowOnlySelectedPlayers={setShowOnlySelectedPlayers}
          hideMarkedPlayers={hideMarkedPlayers}
          setHideMarkedPlayers={setHideMarkedPlayers}
          compactTableMode={compactTableMode}
          setCompactTableMode={setCompactTableMode}
          selectedPlayersCount={selectedPlayersCount}
          selectedPlayersWithPositionCount={selectedPlayersWithPositionCount}
          rejectedPlayersCount={rejectedPlayersCount}
          onFileUpload={handleFileUpload}
          onClearData={handleClearData}
          onClearPlayerSelection={clearPlayerSelection}
        />
      </aside>

      <section style={styles.mainWorkspace} aria-labelledby="workspace-title">
        <h2 id="workspace-title" style={styles.visuallyHidden}>
  Lista piłkarzy i analiza
</h2>
        <div style={styles.workspaceTop}>
          {rows.length > 0 && (
            <RoleAnalysisToolbar
              rolePositionOptions={rolePositionOptions}
              availableAnalysisRoles={availableAnalysisRoles}
              analysisPositionGroup={analysisPositionGroup}
              setAnalysisPositionGroup={setAnalysisPositionGroup}
              analysisPhase={analysisPhase}
              setAnalysisPhase={setAnalysisPhase}
              analysisRoleId={analysisRoleId}
              setAnalysisRoleId={setAnalysisRoleId}
              minRoleScore={minRoleScore}
              setMinRoleScore={setMinRoleScore}
              onlyRoleMatches={onlyRoleMatches}
              setOnlyRoleMatches={setOnlyRoleMatches}
            />
          )}

          <AppStatusPanel
  fileName={fileName}
  shownPlayersCount={sortedRows.length}
  totalPlayersCount={rows.length}
  visibleColumnsCount={tableHeaders.length}
  totalColumnsCount={insertRoleAnalysisColumns(visibleHeaders).length}
  sortConfig={sortConfig}
  error={error}
/>
        </div>

<div style={styles.tableArea}>
  {rows.length > 0 && (
    <PlayerTable
      tableHeaders={tableHeaders}
      sortedRows={sortedRows}
      sortConfig={sortConfig}
      selectedPlayerKey={selectedPlayerKey}
      playerMarkColumn={PLAYER_MARK_COLUMN}
      getPlayerMark={getPlayerMark}
      getPlayerSelectionPosition={getPlayerSelectionPosition}
      onTogglePlayerMark={togglePlayerMark}
      onSetPlayerSelectionPosition={setPlayerSelectionPosition}
      onSort={handleSort}
      onSelectPlayer={setSelectedPlayerKey}
      getMarkedCellStyle={getMarkedCellStyle}
    />
  )}
</div>
      </section>
    </div>
                          {rows.length > 1 && (
      <div style={styles.comparePageSection}>
        <PlayerCompare rows={rows} />
      </div>
      
    )}
{rows.length > 0 && (
<SquadBuilder
  rows={rows}
  getPlayerMark={getPlayerMark}
  selectedPlayersCount={selectedPlayersCount}
  onClearCallUps={clearPlayerSelection}
  onSelectPlayer={(row, selectionPosition) => {
    const isAlreadySelected = getPlayerMark(row) === "selected";

    togglePlayerMark(row, "selected");

    if (isAlreadySelected) {
      setPlayerSelectionPosition(row, "");
      return;
    }

    setPlayerSelectionPosition(row, selectionPosition);
  }}
/>

)}
    {selectedPlayer && (
      <PlayerDetailsPanel
        player={selectedPlayer}
          rows={rows}
        roleMatch={selectedPlayerCurrentRoleMatch}
        roleInsights={selectedPlayerRoleInsights}
        topPositions={selectedPlayerTopPositions}
        rolePositionOptions={rolePositionOptions}
        availableAnalysisRoles={availableAnalysisRoles}
        analysisPositionGroup={analysisPositionGroup}
        setAnalysisPositionGroup={setAnalysisPositionGroup}
        analysisPhase={analysisPhase}
        setAnalysisPhase={setAnalysisPhase}
        analysisRoleId={analysisRoleId}
        setAnalysisRoleId={setAnalysisRoleId}
        getPlayerMark={getPlayerMark}
        getPlayerSelectionPosition={getPlayerSelectionPosition}
        onClose={() => setSelectedPlayerKey(null)}
      />
    )}
<CampsDrawer
  rows={rows}
  getPlayerMark={getPlayerMark}
  getPlayerSelectionPosition={getPlayerSelectionPosition}
/>
<NationalCoreDrawer rows={rows} />
    <SquadDepthDrawer
      selectedPlayersCount={selectedPlayersCount}
      selectedPlayersWithPositionCount={selectedPlayersWithPositionCount}
      selectedPlayersWithoutPositionCount={selectedPlayersWithoutPositionCount}
      rejectedPlayersCount={rejectedPlayersCount}
      squadDepthOpen={squadDepthOpen}
      setSquadDepthOpen={setSquadDepthOpen}
      squadDepthWarnings={squadDepthWarnings}
      squadDepthByPosition={squadDepthByPosition}
    />
  </main>
);
  
}