import { getGameEuroRate } from "./utils/playerFinance";
import type { PlayerEditResult } from "./services/fmEditor";
import { closeAppModule } from "./utils/moduleDock";
import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CANDIDATE_TYPE_COLUMN,
  BASE_TABLE_COLUMNS,
  CLUB_FORM_COLUMN,
  MONEYBALL_COLUMN,
  OVERALL_ABILITY_COLUMN,
  OVERALL_POSITION_COLUMN,
  OVERALL_ROLE_COLUMN,
  OVERALL_SCORE_COLUMN,
  PLAYER_MARK_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SCORE_COLUMN,
  ROLE_SCORE_RANGE_COLUMN,
  ROLE_SCORE_UNCERTAINTY_COLUMN,
  SELECTION_SCORE_COLUMN,
  ROLE_SIDE_COLUMN,
  ROLE_SIDE_PROFILE_COLUMN,
  ROLE_SIDE_SCORE_COLUMN,
  insertRoleAnalysisColumns,
} from "./constants/appColumns";
import { HIDDEN_COLUMNS } from "./constants/columns";
import {
  ROLE_DEFINITIONS,
  getRolePhaseLabel,
} from "./constants/roles";
import { SELECTION_POSITION_ORDER } from "./constants/selection";
import { AppUpdater } from "./components/AppUpdater/AppUpdater";
import { FmConnectionPanel } from "./components/FmConnection/FmConnectionPanel";
import { AppSideDock } from "./components/app-shell";
import { MainToolbar } from "./components/main-toolbar";
import { PlayerCardGrid } from "./components/player-cards";
import { PlayerTable } from "./components/player-table";
import { SquadDepthDrawer } from "./components/squad-depth";
import { usePlayerSelection } from "./hooks/usePlayerSelection";
import { useSquadDepth } from "./hooks/useSquadDepth";
import {
  loadFootballManagerSeasonStats,
  loadFootballManagerTeamLogo,
  type FmDatabaseLoadResult,
  type FmSeasonStatsResult,
} from "./services/fmConnection";
import type {
  FormationSlot,
  SlotCandidate,
  TacticalView,
} from "./types/squadBuilderTypes";
import type { SortConfig, TableRow } from "./types/table";
import { calculateClubFormImpact, formatClubFormImpact } from "./utils/clubForm";
import { matchesFootFilter, type FootFilter } from "./utils/filters";
import {
  clearFmSnapshot,
  createFmSnapshot,
  type StoredFmSnapshot,
} from "./utils/fmSnapshotStorage";
import {
  createMoneyballContext,
  getMoneyballTableSummary,
  type MoneyballContext,
} from "./utils/moneyball";
import { getPlayerKey } from "./utils/playerIdentity";
import { isGoalkeeper } from "./utils/playerPositionType";
import { getPlayerRoleAttributeInsights } from "./utils/playerRoleInsights";
import {
  calculatePositionFit,
  getPositionGroups,
} from "./utils/positionScoring";
import {
  formatRoleScore,
  formatRoleScoreRange,
  formatRoleUncertainty,
  getBestRoleMatch,
  type RolePhaseFilter,
} from "./utils/roleScoring";
import { scorePlayerForSlot } from "./utils/squadBuilderScoring";
import {
  formatRoleSide,
  formatSideProfile,
  formatSideScore,
  getRoleSideFit,
} from "./utils/sideFit";
import { compareValues, getSortableNumber } from "./utils/sortTable";
import { getPlayerPositionSortRank } from "./utils/playerPositionType";
import { normalizeTextForSearch } from "./utils/textSearch";
import { getNationTheme } from "./utils/nationTheme";

const TransferSearch = lazy(() => import("./components/transfers/TransferSearch").then(module => ({default:module.TransferSearch})));
const PlayerCompare = lazy(() =>
  import("./components/player-compare").then((module) => ({
    default: module.PlayerCompare,
  })),
);
const PlayerDetailsPanel = lazy(() =>
  import("./components/player-details").then((module) => ({
    default: module.PlayerDetailsPanel,
  })),
);
const SquadBuilder = lazy(() =>
  import("./components/squad-builder").then((module) => ({
    default: module.SquadBuilder,
  })),
);
const CampsDrawer = lazy(() =>
  import("./components/camps").then((module) => ({
    default: module.CampsDrawer,
  })),
);
const NationalCoreDrawer = lazy(() =>
  import("./components/national-core").then((module) => ({
    default: module.NationalCoreDrawer,
  })),
);

type PlayerViewMode = "table" | "cards";
type PlayerCardSortMode =
  | "current"
  | "score-desc"
  | "score-asc"
  | "name-asc"
  | "name-desc"
  | "form-desc"
  | "club-asc";

const SEARCH_COLUMNS = [
  "Nazwisko",
  "Imię",
  "Klub",
  "Liga",
  "Pozycja",
  "Narodowość",
] as const;

function getPrimaryAnalysisPhase(
  analysisPhase: RolePhaseFilter,
  analysisRoleId: string,
): TacticalView {
  const selectedRole = ROLE_DEFINITIONS.find(
    (role) => role.id === analysisRoleId,
  );

  if (selectedRole) return selectedRole.phase;
  return analysisPhase === "without-ball" ? "without-ball" : "with-ball";
}

function makeTableAnalysisSlot(
  positionGroup: string,
  phase: TacticalView,
  roleId: string,
): FormationSlot {
  return {
    id: `table-${positionGroup}`,
    label: positionGroup,
    line: "Pomoc",
    positionGroup,
    phase,
    roleId: roleId === "any" ? "best" : roleId,
    footRequirement: "any",
  };
}

function getCandidateRoleScore(candidate: SlotCandidate): number {
  return candidate.roleScore ?? candidate.roleResult.score ?? candidate.finalScore;
}

function getBestOverallTableCandidate(row: TableRow, phase: TacticalView) {
  const goalkeeper = isGoalkeeper(row);
  let bestRoleResult: ReturnType<typeof getBestRoleMatch> = null;

  for (const positionGroup of getPositionGroups()) {
    if ((positionGroup === "Bramkarz") !== goalkeeper) continue;

    const roleResult = getBestRoleMatch(row, { positionGroup, phase });
    if (
      roleResult &&
      (!bestRoleResult || roleResult.score > bestRoleResult.score)
    ) {
      bestRoleResult = roleResult;
    }
  }

  if (!bestRoleResult) return null;

  return scorePlayerForSlot(
    row,
    makeTableAnalysisSlot(
      bestRoleResult.role.positionGroup,
      phase,
      bestRoleResult.role.id,
    ),
  );
}

type TableAnalysisConfig = {
  effectivePhase: TacticalView;
  selectedPositionGroup: string | undefined;
  analysisRoleId: string;
  moneyballContext: MoneyballContext;
};

const ANALYSIS_PENDING = "…";

function createPendingTableRow(
  row: TableRow,
  moneyballContext: MoneyballContext,
): TableRow {
  return {
    ...row,
    [OVERALL_ABILITY_COLUMN]:
      row[OVERALL_ABILITY_COLUMN] ?? row["CA"] ?? "-",
    [CLUB_FORM_COLUMN]: formatClubFormImpact(calculateClubFormImpact(row)),
    [MONEYBALL_COLUMN]: getMoneyballTableSummary(row, moneyballContext),
    [ROLE_SCORE_COLUMN]: ANALYSIS_PENDING,
    [SELECTION_SCORE_COLUMN]: ANALYSIS_PENDING,
    [CANDIDATE_TYPE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_SCORE_RANGE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_SCORE_UNCERTAINTY_COLUMN]: ANALYSIS_PENDING,
    [ROLE_BEST_ROLE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_PHASE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_SIDE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_SIDE_SCORE_COLUMN]: ANALYSIS_PENDING,
    [ROLE_SIDE_PROFILE_COLUMN]: ANALYSIS_PENDING,
    [OVERALL_POSITION_COLUMN]: ANALYSIS_PENDING,
    [OVERALL_ROLE_COLUMN]: ANALYSIS_PENDING,
    [OVERALL_SCORE_COLUMN]: ANALYSIS_PENDING,
  };
}

function createAnalyzedTableRow(
  row: TableRow,
  config: TableAnalysisConfig,
): TableRow {
  const clubFormImpact = calculateClubFormImpact(row);
  const bestOverallCandidate = getBestOverallTableCandidate(
    row,
    config.effectivePhase,
  );
  const selectedCandidate = config.selectedPositionGroup
    ? scorePlayerForSlot(
        row,
        makeTableAnalysisSlot(
          config.selectedPositionGroup,
          config.effectivePhase,
          config.analysisRoleId,
        ),
      )
    : bestOverallCandidate;
  const selectedRoleResult = selectedCandidate?.roleResult ?? null;
  const selectedSideFit = selectedRoleResult
    ? getRoleSideFit(row, selectedRoleResult.role)
    : null;

  return {
    ...row,
    [OVERALL_ABILITY_COLUMN]:
      row[OVERALL_ABILITY_COLUMN] ?? row["CA"] ?? "-",
    [ROLE_SCORE_COLUMN]: selectedCandidate
      ? formatRoleScore(getCandidateRoleScore(selectedCandidate))
      : "-",
    [SELECTION_SCORE_COLUMN]: selectedCandidate
      ? formatRoleScore(selectedCandidate.finalScore)
      : "-",
    [CLUB_FORM_COLUMN]: formatClubFormImpact(clubFormImpact),
    [MONEYBALL_COLUMN]: getMoneyballTableSummary(
      row,
      config.moneyballContext,
    ),
    [CANDIDATE_TYPE_COLUMN]: selectedCandidate?.candidateKindLabel ?? "-",
    [ROLE_SCORE_RANGE_COLUMN]: formatRoleScoreRange(selectedRoleResult),
    [ROLE_SCORE_UNCERTAINTY_COLUMN]: formatRoleUncertainty(selectedRoleResult),
    [ROLE_BEST_ROLE_COLUMN]: selectedRoleResult?.role.name ?? "-",
    [ROLE_PHASE_COLUMN]: selectedRoleResult
      ? getRolePhaseLabel(selectedRoleResult.role.phase)
      : "-",
    [ROLE_SIDE_COLUMN]: formatRoleSide(selectedSideFit),
    [ROLE_SIDE_SCORE_COLUMN]: formatSideScore(selectedSideFit),
    [ROLE_SIDE_PROFILE_COLUMN]: formatSideProfile(selectedSideFit),
    [OVERALL_POSITION_COLUMN]:
      bestOverallCandidate?.roleResult.role.positionGroup ?? "-",
    [OVERALL_ROLE_COLUMN]: bestOverallCandidate?.roleResult.role.name ?? "-",
    [OVERALL_SCORE_COLUMN]: bestOverallCandidate
      ? formatRoleScore(getCandidateRoleScore(bestOverallCandidate))
      : "-",
  };
}

function mergeSeasonStats(
  rows: TableRow[],
  stats: FmSeasonStatsResult,
): TableRow[] {
  if (Object.keys(stats.rows).length === 0) return rows;

  return rows.map((row) => {
    const uid = row.UID;
    const seasonStats = uid ? stats.rows[uid] : undefined;
    return seasonStats ? { ...row, ...seasonStats } : row;
  });
}

export default function App() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [snapshot, setSnapshot] = useState<StoredFmSnapshot | null>(null);
  const managedMode = snapshot?.managedMode ?? "unknown";
  useEffect(() => {
    // Close drawers when the managed context changes or FM disconnects.
    closeAppModule();
  }, [managedMode, snapshot?.managedTeamUid, snapshot?.managedClubUid, snapshot?.managedNationUid]);
  const editorSession=useRef(0);
  editorSession.current=snapshot?.sessionId??0;
  const handlePlayerEdited=useCallback((result:PlayerEditResult)=>{
    if(editorSession.current!==result.sessionId)return;
    setRows(current=>current.map(row=>row.UID===String(result.uid)?{...row,...result.row}:row));
    setSnapshot(current=>current?.sessionId===result.sessionId?{...current,rows:current.rows.map(row=>row.UID===String(result.uid)?{...row,...result.row}:row)}:current);
  },[]);
  const [error, setError] = useState("");
  const [supplementaryDataLoading, setSupplementaryDataLoading] =
    useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scoredRows, setScoredRows] = useState<TableRow[]>([]);
  const databaseLoadSequence = useRef(0);
  const lastManagedScope = useRef<string | null>(null);
  const analysisSequence = useRef(0);

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [clubSquadScope, setClubSquadScope] = useState("all");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [footFilter, setFootFilter] = useState<FootFilter>("any");
  const [analysisPositionGroup, setAnalysisPositionGroup] = useState("any");
  const [analysisPhase, setAnalysisPhase] =
    useState<RolePhaseFilter>("any");
  const [analysisRoleId, setAnalysisRoleId] = useState("any");
  const [minRoleScore, setMinRoleScore] = useState("60");
  const [onlyRoleMatches, setOnlyRoleMatches] = useState(false);
  const [showOnlySelectedPlayers, setShowOnlySelectedPlayers] = useState(false);
  const [hideMarkedPlayers, setHideMarkedPlayers] = useState(false);
  const [playerViewMode, setPlayerViewMode] =
    useState<PlayerViewMode>("table");
  const [compactCardMode, setCompactCardMode] = useState(false);
  const [cardSortMode, setCardSortMode] =
    useState<PlayerCardSortMode>("score-desc");
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(
    null,
  );
  const [squadDepthOpen, setSquadDepthOpen] = useState(false);
  const [comparePlayerKey, setComparePlayerKey] = useState("");
  const [compareRequestId, setCompareRequestId] = useState(0);

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
  } = usePlayerSelection({ analysisPositionGroup });

  const {
    selectedPlayersWithoutPositionCount,
    squadDepthByPosition,
    squadDepthWarnings,
  } = useSquadDepth({
    rows,
    playerMarks,
    playerSelectionPositions,
  });

  useEffect(() => {
    // Snapshoty z poprzednich wersji nie mogą udawać aktywnego połączenia z FM.
    // Dane zawodników są od tej wersji wyłącznie stanem bieżącej sesji.
    void clearFmSnapshot().catch(() => undefined);
  }, []);

  const rolePositionOptions = useMemo(
    () =>
      Array.from(
        new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup)),
      ),
    [],
  );

  const availableAnalysisRoles = useMemo(
    () =>
      ROLE_DEFINITIONS.filter((role) => {
        if (
          analysisPositionGroup !== "any" &&
          role.positionGroup !== analysisPositionGroup
        ) {
          return false;
        }
        return analysisPhase === "any" || role.phase === analysisPhase;
      }),
    [analysisPhase, analysisPositionGroup],
  );

  const visibleHeaders = useMemo(
    () => headers.filter((header) => !HIDDEN_COLUMNS.has(header) && header!=="Numer w składzie"),
    [headers],
  );
  const availableTableHeaders = useMemo(
    () => insertRoleAnalysisColumns(visibleHeaders),
    [visibleHeaders],
  );
  const tableHeaders = useMemo(
    () =>
      headers.length === 0
        ? []
        : (snapshot?.managedMode === "club" ? [PLAYER_MARK_COLUMN,"Nazwisko","Pozycja","Narodowość",OVERALL_ABILITY_COLUMN,"PA","Wiek","Kondycja","Wartość","Pensja","Koniec kontraktu",ROLE_SCORE_COLUMN] : BASE_TABLE_COLUMNS).filter((header) =>
            availableTableHeaders.includes(header),
          ),
    [availableTableHeaders, headers.length, snapshot?.managedMode],
  );

  const searchIndex = useMemo(
    () =>
      rows.map((row) =>
        normalizeTextForSearch(
          SEARCH_COLUMNS.map((column) => row[column] ?? "").join("\u0000"),
        ),
      ),
    [rows],
  );
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const baseFilteredRows = useMemo(() => {
    const normalizedSearch = normalizeTextForSearch(deferredSearchTerm);
    const minAgeNumber = minAge.trim() ? Number(minAge) : null;
    const maxAgeNumber = maxAge.trim() ? Number(maxAge) : null;

    return rows.filter((row, rowIndex) => {
      if (snapshot?.managedMode === "club" && clubSquadScope !== "all") {
        const first = row["Grupa klubowa"] === "Pierwsza drużyna";
        if ((clubSquadScope === "first" && !first) || (clubSquadScope === "development" && first)) return false;
      }
      const matchesSearch =
        !normalizedSearch || searchIndex[rowIndex]?.includes(normalizedSearch);
      const age = getSortableNumber(row["Wiek"] ?? "");
      const matchesMinAge =
        minAgeNumber === null ||
        !Number.isFinite(minAgeNumber) ||
        (age !== null && age >= minAgeNumber);
      const matchesMaxAge =
        maxAgeNumber === null ||
        !Number.isFinite(maxAgeNumber) ||
        (age !== null && age <= maxAgeNumber);

      return (
        matchesSearch &&
        matchesMinAge &&
        matchesMaxAge &&
        matchesFootFilter(row, footFilter)
      );
    });
  }, [
    deferredSearchTerm,
    clubSquadScope,
    snapshot?.managedMode,
    footFilter,
    maxAge,
    minAge,
    rows,
    searchIndex,
  ]);

  const moneyballContext = useMemo(
    () => createMoneyballContext(rows),
    [rows],
  );

  useEffect(() => {
    const sequence = ++analysisSequence.current;
    if (baseFilteredRows.length === 0) {
      const emptyTimerId = window.setTimeout(() => {
        if (analysisSequence.current !== sequence) return;
        setScoredRows([]);
        setAnalysisLoading(false);
      }, 0);
      return () => window.clearTimeout(emptyTimerId);
    }

    const effectivePhase = getPrimaryAnalysisPhase(
      analysisPhase,
      analysisRoleId,
    );
    const selectedRoleDefinition = ROLE_DEFINITIONS.find(
      (role) => role.id === analysisRoleId,
    );
    const selectedPositionGroup =
      analysisPositionGroup !== "any"
        ? analysisPositionGroup
        : selectedRoleDefinition?.positionGroup;
    const config: TableAnalysisConfig = {
      effectivePhase,
      selectedPositionGroup,
      analysisRoleId,
      moneyballContext,
    };

    const result = new Array<TableRow>(baseFilteredRows.length);
    let rowIndex = 0;
    let timerId = 0;

    const analyzeChunk = () => {
      if (analysisSequence.current !== sequence) return;

      const deadline = performance.now() + 12;
      do {
        result[rowIndex] = createAnalyzedTableRow(
          baseFilteredRows[rowIndex],
          config,
        );
        rowIndex += 1;
      } while (
        rowIndex < baseFilteredRows.length &&
        performance.now() < deadline
      );

      if (rowIndex < baseFilteredRows.length) {
        timerId = window.setTimeout(analyzeChunk, 0);
        return;
      }

      startTransition(() => {
        setScoredRows(result);
        setAnalysisLoading(false);
      });
    };

    timerId = window.setTimeout(() => {
      if (analysisSequence.current !== sequence) return;
      setScoredRows(
        baseFilteredRows.map((row) =>
          createPendingTableRow(row, moneyballContext),
        ),
      );
      setAnalysisLoading(true);
      timerId = window.setTimeout(analyzeChunk, 0);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    baseFilteredRows,
    moneyballContext,
  ]);

  const roleFilteredRows = useMemo(() => {
    if (analysisLoading || !onlyRoleMatches) return scoredRows;
    const minimumScore = getSortableNumber(minRoleScore) ?? 0;
    return scoredRows.filter((row) => {
      const score = getSortableNumber(row[ROLE_SCORE_COLUMN] ?? "");
      return score !== null && score >= minimumScore;
    });
  }, [analysisLoading, minRoleScore, onlyRoleMatches, scoredRows]);

  const analyzedRows = useMemo(() => {
    if (!showOnlySelectedPlayers && !hideMarkedPlayers) {
      return roleFilteredRows;
    }

    return roleFilteredRows.filter((row) => {
      const mark = getPlayerMark(row);
      if (showOnlySelectedPlayers) {
        return (
          mark === "selected" &&
          getPlayerSelectionPosition(row).trim() !== ""
        );
      }
      return !hideMarkedPlayers || (mark !== "selected" && mark !== "rejected");
    });
  }, [
    getPlayerMark,
    getPlayerSelectionPosition,
    hideMarkedPlayers,
    roleFilteredRows,
    showOnlySelectedPlayers,
  ]);

  const sortedRows = useMemo(() => {
    if (showOnlySelectedPlayers && sortConfig?.column !== "Pozycja") {
      return [...analyzedRows].sort((a, b) => {
        const orderA =
          SELECTION_POSITION_ORDER[getPlayerSelectionPosition(a)] ?? 999;
        const orderB =
          SELECTION_POSITION_ORDER[getPlayerSelectionPosition(b)] ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return compareValues(
          a["Nazwisko"] ?? "",
          b["Nazwisko"] ?? "",
          "asc",
        );
      });
    }

    if (!sortConfig) return analyzedRows;
    if (sortConfig.column === "Pozycja") {
      return [...analyzedRows].sort((a,b) => {
        const left = getPlayerPositionSortRank(a), right = getPlayerPositionSortRank(b);
        if (left === 999 && right !== 999) return 1;
        if (right === 999 && left !== 999) return -1;
        const order = sortConfig.direction === "asc" ? left-right : right-left;
        return order || compareValues(a["Nazwisko"] ?? "",b["Nazwisko"] ?? "","asc");
      });
    }
    return [...analyzedRows].sort((a, b) =>
      compareValues(
        a[sortConfig.column],
        b[sortConfig.column],
        sortConfig.direction,
      ),
    );
  }, [
    analyzedRows,
    getPlayerSelectionPosition,
    showOnlySelectedPlayers,
    sortConfig,
  ]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerKey) return null;
    return (
      analyzedRows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
      rows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
      null
    );
  }, [analyzedRows, rows, selectedPlayerKey]);

  const selectedPlayerTopPositions = useMemo(() => {
    if (!selectedPlayer) return [];
    return getPositionGroups()
      .map((positionGroup) =>
        calculatePositionFit(selectedPlayer, positionGroup),
      )
      .filter((result) => result !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [selectedPlayer]);

  const selectedPlayerCurrentRoleMatch = useMemo(() => {
    if (!selectedPlayer) return null;
    return getBestRoleMatch(selectedPlayer, {
      positionGroup:
        analysisPositionGroup === "any"
          ? undefined
          : analysisPositionGroup,
      phase: getPrimaryAnalysisPhase(analysisPhase, analysisRoleId),
      roleId: analysisRoleId,
    });
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    selectedPlayer,
  ]);

  const selectedPlayerRoleInsights = useMemo(() => {
    if (!selectedPlayer || !selectedPlayerCurrentRoleMatch) {
      return { strengths: [], weaknesses: [] };
    }
    return getPlayerRoleAttributeInsights(
      selectedPlayer,
      selectedPlayerCurrentRoleMatch.role,
    );
  }, [selectedPlayer, selectedPlayerCurrentRoleMatch]);

  const playerCardsAnalysisLabel = useMemo(() => {
    const positionLabel =
      analysisPositionGroup === "any" ? "Wszyscy" : analysisPositionGroup;
    const phaseLabel =
      analysisPhase === "with-ball"
        ? "Przy piłce"
        : analysisPhase === "without-ball"
          ? "Bez piłki"
          : "Dowolna faza";
    const roleLabel =
      analysisRoleId === "any"
        ? "Dowolna rola"
        : availableAnalysisRoles.find((role) => role.id === analysisRoleId)
            ?.name ?? "Wybrana rola";
    return `${positionLabel} · ${phaseLabel} · ${roleLabel}`;
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    availableAnalysisRoles,
  ]);

  const cardRows = useMemo(() => {
    const result = [...sortedRows];
    switch (cardSortMode) {
      case "score-desc":
        return result.sort((a, b) =>
          compareValues(b[ROLE_SCORE_COLUMN], a[ROLE_SCORE_COLUMN], "asc"),
        );
      case "score-asc":
        return result.sort((a, b) =>
          compareValues(a[ROLE_SCORE_COLUMN], b[ROLE_SCORE_COLUMN], "asc"),
        );
      case "name-asc":
        return result.sort((a, b) =>
          compareValues(a["Nazwisko"], b["Nazwisko"], "asc"),
        );
      case "name-desc":
        return result.sort((a, b) =>
          compareValues(a["Nazwisko"], b["Nazwisko"], "desc"),
        );
      case "form-desc":
        return result.sort((a, b) =>
          compareValues(b[CLUB_FORM_COLUMN], a[CLUB_FORM_COLUMN], "asc"),
        );
      case "club-asc":
        return result.sort((a, b) =>
          compareValues(a["Klub"], b["Klub"], "asc"),
        );
      default:
        return result;
    }
  }, [cardSortMode, sortedRows]);

  const handleFmDatabaseLoaded = useCallback(
    (result: FmDatabaseLoadResult) => {
      const loadSequence = ++databaseLoadSequence.current;
      if(result.stage==="database-refreshed") {
        // Live fields replace native data; retain already loaded save statistics
        // and graphics without opening/parsing a large save again.
        const merge=(current:TableRow[])=>{
          const existing=new Map(current.map(row=>[row.UID,row]));
          return result.rows.map(row=>({...existing.get(row.UID),...row}));
        };
        startTransition(()=>{
          setRows(current=>merge(current));
          setHeaders(current=>Array.from(new Set([...current,...result.headers])));
        });
        setSnapshot(current=>createFmSnapshot({...result,
          rows:merge(current?.rows??[]),headers:Array.from(new Set([...(current?.headers??[]),...result.headers])),
          teamLogoDataUrl:current?.teamLogoDataUrl??null}));
        setSupplementaryDataLoading(false);
        return;
      }

      // Metadane reprezentacji (w tym motyw) pokazujemy od razu. Statystyki
      // z dużego pliku zapisu i herb z graphics są doładowywane niezależnie.
      const nextScope = `${result.managedMode}:${result.managedClubUid ?? result.managedNationUid ?? result.managedTeamUid}`;
      if ((lastManagedScope.current !== null && lastManagedScope.current !== nextScope) || (lastManagedScope.current === null && result.managedMode === "club")) clearPlayerSelection();
      lastManagedScope.current = nextScope;
      setSnapshot(createFmSnapshot(result));
      setSupplementaryDataLoading(true);

      startTransition(() => {
        setHeaders(result.headers);
        setRows(result.rows);
        setClubSquadScope("all");
        setSortConfig(null);
        setSearchTerm("");
        setMinAge("");
        setMaxAge("");
        setFootFilter("any");
        setAnalysisPositionGroup("any");
        setAnalysisPhase("any");
        setAnalysisRoleId("any");
        setMinRoleScore("0");
        setOnlyRoleMatches(false);
        setShowOnlySelectedPlayers(false);
        setHideMarkedPlayers(false);
        setSelectedPlayerKey(null);
        setError("");
      });

      const uids = result.rows
        .map((row) => Number(row.UID))
        .filter((uid) => Number.isInteger(uid) && uid > 0);

      const statsPromise = loadFootballManagerSeasonStats(uids).catch(() => ({
        headers: [],
        rows: {},
        playerCount: 0,
      } satisfies FmSeasonStatsResult));
      const logoPromise = loadFootballManagerTeamLogo(
        result.managedNationUid,
        result.managedClubUid ?? result.managedTeamUid,
      ).catch(() => null);

      void logoPromise.then((teamLogoDataUrl) => {
        if (
          databaseLoadSequence.current !== loadSequence ||
          !teamLogoDataUrl
        ) {
          return;
        }
        setSnapshot((current) =>
          current ? { ...current, teamLogoDataUrl } : current,
        );
      });

      void Promise.all([statsPromise, logoPromise]).then(
        ([stats, teamLogoDataUrl]) => {
          if (databaseLoadSequence.current !== loadSequence) return;

          const enrichedRows = mergeSeasonStats(result.rows, stats);
          const enrichedHeaders = Array.from(
            new Set([...result.headers, ...stats.headers]),
          );
          const enrichedResult: FmDatabaseLoadResult = {
            ...result,
            rows: enrichedRows,
            headers: enrichedHeaders,
            teamLogoDataUrl,
          };

          startTransition(() => {
            setRows(enrichedRows);
            setHeaders(enrichedHeaders);
          });
          setSnapshot(createFmSnapshot(enrichedResult));
          setSupplementaryDataLoading(false);
        },
      );
    },
    [clearPlayerSelection],
  );

  const handleFmUnavailable = useCallback(() => {
    // Unieważnia również ewentualne doładowywanie statystyk lub herbu.
    databaseLoadSequence.current += 1;
    setSupplementaryDataLoading(false);
    setSnapshot(null);
    startTransition(() => {
      setHeaders([]);
      setRows([]);
      setSelectedPlayerKey(null);
      setError("");
    });
    clearPlayerSelection();
    void clearFmSnapshot().catch(() => undefined);
  }, [clearPlayerSelection]);

  const handleSort = useCallback((column: string) => {
    setSortConfig((current) => {
      if (!current || current.column !== column) {
        return { column, direction: column === "Pozycja" ? "asc" : "desc" };
      }
      return {
        column,
        direction: current.direction === "desc" ? "asc" : "desc",
      };
    });
  }, []);

  const handleComparePlayer = useCallback((playerKey: string) => {
    setComparePlayerKey(playerKey);
    setCompareRequestId((current) => current + 1);
  }, []);

  const handleSquadBuilderSelectPlayer = useCallback(
    (row: TableRow, selectionPosition: string) => {
      const isAlreadySelected = getPlayerMark(row) === "selected";
      togglePlayerMark(row, "selected");
      setPlayerSelectionPosition(
        row,
        isAlreadySelected ? "" : selectionPosition,
      );
    },
    [getPlayerMark, setPlayerSelectionPosition, togglePlayerMark],
  );

  const dataLabel =
    snapshot?.managedNation ??
    snapshot?.managedTeam ??
    (rows.length > 0 ? "Reprezentacja" : "Brak danych");
  const nationTheme = getNationTheme(snapshot?.managedNation);

  return (
    <main
      className="desktop-app"
      aria-labelledby="app-title"
      style={nationTheme.style}
    >
      <header className="desktop-header">
        <div className="desktop-brand">
          <span
            className="desktop-brand__mark"
            data-logo={snapshot?.teamLogoDataUrl ? "image" : undefined}
            aria-hidden="true"
          >
            {snapshot?.teamLogoDataUrl ? (
              <img src={snapshot.teamLogoDataUrl} alt="" />
            ) : snapshot?.managedNation ? (
              nationTheme.flag
            ) : (
              "FM"
            )}
          </span>
          <span>
            <strong id="app-title">FM Player Sorter</strong>
            {managedMode !== "unknown" && <small>{managedMode === "club" ? "Tryb klubowy" : "Tryb reprezentacji"}</small>}
          </span>
        </div>

        <AppSideDock mode={managedMode} />

        <div className="desktop-header__actions">
          <AppUpdater />
          <FmConnectionPanel
            loadedNation={snapshot?.managedMode === "club" ? snapshot.managedTeam : snapshot?.managedNation ?? null}
            loadedPlayerCount={rows.length}
            onDatabaseLoaded={handleFmDatabaseLoaded}
            onFmUnavailable={handleFmUnavailable}
          />
        </div>
      </header>

      <section className="desktop-workspace" aria-label="Baza zawodników">
        {snapshot?.managedMode === "club" && <section className="club-roster" aria-label="Skład klubu">
          <div className="club-roster__heading"><div><strong>{snapshot.managedTeam}</strong><span>Pełna lista zawodników · {rows.length} piłkarzy w klubie</span></div><span className="club-roster__badge">KLUB</span></div>
          <div className="club-roster__tabs" role="tablist" aria-label="Zespoły klubu">{[
            {id:"all",label:"Cały klub",count:rows.length},
            {id:"first",label:"Pierwsza drużyna",count:rows.filter(row=>row["Grupa klubowa"]==="Pierwsza drużyna").length},
            {id:"development",label:"Rezerwy i juniorzy",count:rows.filter(row=>row["Grupa klubowa"]!=="Pierwsza drużyna").length},
          ].map(group=><button key={group.id} role="tab" aria-selected={clubSquadScope===group.id} onClick={()=>setClubSquadScope(group.id)}>{group.label}<span>{group.count}</span></button>)}</div>
        </section>}
        <MainToolbar
          clubMode={snapshot?.managedMode === "club"}
          clubSquadScope={clubSquadScope}
          onClubSquadScopeChange={setClubSquadScope}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          minAge={minAge}
          setMinAge={setMinAge}
          maxAge={maxAge}
          setMaxAge={setMaxAge}
          footFilter={footFilter}
          setFootFilter={setFootFilter}
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
          showOnlySelectedPlayers={showOnlySelectedPlayers}
          setShowOnlySelectedPlayers={setShowOnlySelectedPlayers}
          hideMarkedPlayers={hideMarkedPlayers}
          setHideMarkedPlayers={setHideMarkedPlayers}
          selectedPlayersCount={selectedPlayersCount}
          selectedPlayersWithPositionCount={
            selectedPlayersWithPositionCount
          }
          rejectedPlayersCount={rejectedPlayersCount}
          onClearPlayerSelection={clearPlayerSelection}
        />

        <div className="desktop-context-bar" role="status">
          <span>
            {snapshot && <span>{snapshot.managedMode === "club" ? "Klub" : "Reprezentacja"} · </span>}<strong>{dataLabel}</strong>
            {snapshot?.managedTeam &&
              snapshot.managedMode !== "club" && snapshot.managedTeam !== snapshot.managedNation && (
                <> · {snapshot.managedTeam}</>
              )}
          </span>
          <span>
            Pokazano{" "}
            <strong>{sortedRows.length.toLocaleString("pl-PL")}</strong> z{" "}
            {rows.length.toLocaleString("pl-PL")} kandydatów
          </span>
          {snapshot?.databasePlayerCount ? (
            <span>
              Baza FM:{" "}
              {snapshot.databasePlayerCount.toLocaleString("pl-PL")}
            </span>
          ) : null}
          {snapshot?.gameDate && <span>Dane: {snapshot.gameDate}</span>}
          {supplementaryDataLoading && (
            <span>Doładowywanie statystyk i herbu w tle…</span>
          )}
          {analysisLoading && <span>Obliczanie ocen w tle…</span>}
          {error && <span className="desktop-context-bar__error">{error}</span>}
        </div>

        {rows.length > 0 ? (
          <section className="desktop-data-panel">
            <div className="desktop-viewbar">
              <span className="desktop-viewbar__analysis">
                Analiza: <strong>{playerCardsAnalysisLabel}</strong>
              </span>

              <div className="desktop-viewbar__actions">
                {playerViewMode === "cards" && (
                  <>
                    <select
                      value={cardSortMode}
                      onChange={(event) =>
                        setCardSortMode(
                          event.target.value as PlayerCardSortMode,
                        )
                      }
                      aria-label="Sortowanie kafelków"
                    >
                      <option value="score-desc">Wynik malejąco</option>
                      <option value="score-asc">Wynik rosnąco</option>
                      <option value="name-asc">Nazwisko A–Z</option>
                      <option value="name-desc">Nazwisko Z–A</option>
                      <option value="form-desc">Forma klubu</option>
                      <option value="club-asc">Klub A–Z</option>
                      <option value="current">Jak tabela</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={compactCardMode}
                        onChange={(event) =>
                          setCompactCardMode(event.target.checked)
                        }
                      />
                      Kompaktowe
                    </label>
                  </>
                )}

                <div className="desktop-viewbar__switch" role="group">
                  <button
                    type="button"
                    data-active={playerViewMode === "table" || undefined}
                    onClick={() => setPlayerViewMode("table")}
                  >
                    Tabela
                  </button>
                  <button
                    type="button"
                    data-active={playerViewMode === "cards" || undefined}
                    onClick={() => setPlayerViewMode("cards")}
                  >
                    Kafelki
                  </button>
                </div>
              </div>
            </div>

            <div className="desktop-data-panel__body">
              {playerViewMode === "table" ? (
                <PlayerTable
                  key={snapshot?.managedMode === "club" ? "club-roster" : "nation-roster"}
                  columnStorageKey={snapshot?.managedMode === "club" ? "fm-player-sorter.club-roster-columns.v1" : undefined}
                  pageSize={snapshot?.managedMode === "club" ? Math.max(100, rows.length) : undefined}
                  tableHeaders={tableHeaders}
                  availableHeaders={availableTableHeaders}
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
              ) : (
                <PlayerCardGrid
                  rows={cardRows}
                  analysisLabel={playerCardsAnalysisLabel}
                  compact={compactCardMode}
                  getPlayerMark={getPlayerMark}
                  onTogglePlayerMark={togglePlayerMark}
                  onOpenDetails={setSelectedPlayerKey}
                  onComparePlayer={handleComparePlayer}
                />
              )}
            </div>
          </section>
        ) : (
          <section className="desktop-empty-state">
            <span aria-hidden="true">◎</span>
            <h2>Połącz aplikację z Football Managerem</h2>
            <p>
              Otwórz karierę klubową lub reprezentacyjną w FM26 albo FM27 i użyj przycisku
              „Połącz z grą”. Aplikacja rozpozna prowadzony zespół. W klubie wczyta pierwszą drużynę,
              rezerwy i juniorów; w reprezentacji — uprawnionych zawodników.
            </p>
          </section>
        )}
      </section>

      <footer className="desktop-statusbar">
        <span>
          <i data-online={rows.length > 0 || undefined} />
          {rows.length > 0
            ? `${dataLabel}: ${rows.length.toLocaleString("pl-PL")} zawodników`
            : "Oczekiwanie na dane gry"}
        </span>
        <span>
          {snapshot?.savedAt
            ? `Snapshot ${new Date(snapshot.savedAt).toLocaleString("pl-PL")}`
            : "Oczekiwanie na połączenie"}
        </span>
      </footer>

      <Suspense fallback={null}>
        {managedMode === "club" && <TransferSearch euroPerGbp={getGameEuroRate(rows[0])} sessionId={snapshot?.sessionId ?? 0} clubName={snapshot?.managedTeam ?? null} onPlayerEdited={handlePlayerEdited} />}
        {rows.length > 1 && (
          <PlayerCompare
            rows={rows}
            requestedLeftPlayerKey={comparePlayerKey}
            compareRequestId={compareRequestId}
          />
        )}
        {rows.length > 0 && (
          <SquadBuilder
            rows={rows}
            playerMarks={playerMarks}
            selectedPositionByPlayerKey={playerSelectionPositions}
            getPlayerMark={getPlayerMark}
            selectedPlayersCount={selectedPlayersCount}
            onClearCallUps={clearPlayerSelection}
            onSelectPlayer={handleSquadBuilderSelectPlayer}
          />
        )}
        {selectedPlayer && (
          <PlayerDetailsPanel
            sessionId={snapshot?.sessionId??0}
            onPlayerEdited={handlePlayerEdited}
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
        {managedMode === "nation" && <CampsDrawer
          rows={rows}
          getPlayerMark={getPlayerMark}
          getPlayerSelectionPosition={getPlayerSelectionPosition}
        />}
        {managedMode === "nation" && <NationalCoreDrawer rows={rows} />}
      </Suspense>

      <SquadDepthDrawer
        selectedPlayersCount={selectedPlayersCount}
        selectedPlayersWithPositionCount={selectedPlayersWithPositionCount}
        selectedPlayersWithoutPositionCount={
          selectedPlayersWithoutPositionCount
        }
        rejectedPlayersCount={rejectedPlayersCount}
        squadDepthOpen={squadDepthOpen}
        setSquadDepthOpen={setSquadDepthOpen}
        squadDepthWarnings={squadDepthWarnings}
        squadDepthByPosition={squadDepthByPosition}
      />
    </main>
  );
}
