import { useEffect, useMemo, useState } from "react";
import type {
  Camp,
  Campaign,
  CampMatch,
  CampMatchAppearance,
  CampMatchType,
  CampPlayerSnapshot,
  CampType,
} from "../../types/camp";

import type { TableRow } from "../../types/table";
import { loadCamps, saveCamps } from "../../utils/campStorage";
import { loadCampaigns, saveCampaigns } from "../../utils/campaignStorage";
import { styles } from "./CampsDrawer.styles";
import { CampSummaryPanel } from "./CampSummaryPanel";
import { CampPlayersGrid } from "./CampPlayersGrid";
import { CampCreatePanel } from "./CampCreatePanel";
import { CampsListPanel } from "./CampsListPanel";
import { CampDetailsHeader } from "./CampDetailsHeader";
import { CampMatchesPanel } from "./CampMatchesPanel";
import { CareerHistoryModal } from "./CareerHistoryModal";
import { CampaignComparePanel } from "./CampaignComparePanel";
import { CampaignCreatePanel } from "./CampaignCreatePanel";
import { CampaignCampsComparisonPanel } from "./CampaignCampsComparisonPanel";
import { CampaignsListPanel } from "./CampaignsListPanel";
import { CampaignDetailsOverview } from "./CampaignDetailsOverview";
import {
  CampaignPlayersPanel,
  type CampaignPlayerFilter,
  type CampaignPlayerSort,
  type SortDirection,
} from "./CampaignPlayersPanel";
import {
  createDefaultAppearance,
  getCampPlayerSummaries,
  getCampTotals,
  getCampaignPlayerExtraStats,
  getCampaignStats,
  getCareerPlayerDetails,
  getCareerPlayerSummaries,
  type CareerPlayerSummary,
} from "../../utils/campStats";
import {
  createPlayerSnapshot,
  getDefaultCampName,
  hasSharedIdentity,
  isValidCampPlayer,
  makeId,
  migrateCampsToUniqueIds,
} from "../../utils/campCore";

type PlayerMark = "selected" | "rejected";


function getPlayerSortValue(
  summary: CareerPlayerSummary,
  sort: CampaignPlayerSort
): string | number {
  if (sort === "name") return summary.player.name;
  if (sort === "rating") return summary.avgRating ?? -1;
  if (sort === "matches") return summary.matches;
  if (sort === "callUps") return summary.callUps;
  if (sort === "goals") return summary.goals;
  if (sort === "assists") return summary.assists;

  return summary.minutes;
}

function comparePlayerSummaries(
  left: CareerPlayerSummary,
  right: CareerPlayerSummary,
  sort: CampaignPlayerSort,
  direction: SortDirection
): number {
  const leftValue = getPlayerSortValue(left, sort);
  const rightValue = getPlayerSortValue(right, sort);

  let result = 0;

  if (typeof leftValue === "string" && typeof rightValue === "string") {
    result = leftValue.localeCompare(rightValue, "pl");
  } else {
    result = Number(leftValue) - Number(rightValue);
  }

  if (result === 0) {
    result = left.player.name.localeCompare(right.player.name, "pl");
  }

  return direction === "asc" ? result : -result;
}

type CampsDrawerProps = {
  rows: TableRow[];
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  getPlayerSelectionPosition?: (row: TableRow) => string;
};

export function CampsDrawer({
  rows,
  getPlayerMark,
  getPlayerSelectionPosition,
}: CampsDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
  const [camps, setCamps] = useState<Camp[]>(() => loadCamps());
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadCampaigns());
  const [activeCampId, setActiveCampId] = useState<string>("");
  const [campName, setCampName] = useState(getDefaultCampName());
  const [campType, setCampType] = useState<CampType>("friendly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [matchOpponent, setMatchOpponent] = useState("");
const [matchDate, setMatchDate] = useState("");
const [matchType, setMatchType] = useState<CampMatchType>("friendly");
const [teamGoals, setTeamGoals] = useState("");
const [opponentGoals, setOpponentGoals] = useState("");
const [activeMatchId, setActiveMatchId] = useState("");
const [isCareerHistoryOpen, setIsCareerHistoryOpen] = useState(false);
const [careerSearch, setCareerSearch] = useState("");
const [selectedCareerPlayerKey, setSelectedCareerPlayerKey] = useState("");
const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
const [activeCampaignId, setActiveCampaignId] = useState("");
const [campaignName, setCampaignName] = useState("");
const [campaignType, setCampaignType] = useState<CampType>("qualifiers");
const [campaignDateFrom, setCampaignDateFrom] = useState("");
const [campaignDateTo, setCampaignDateTo] = useState("");
const [compareLeftCampaignId, setCompareLeftCampaignId] = useState("");
const [compareRightCampaignId, setCompareRightCampaignId] = useState("");
const [campaignPlayerSearch, setCampaignPlayerSearch] = useState("");
const [campaignPlayerFilter, setCampaignPlayerFilter] =
  useState<CampaignPlayerFilter>("all");
const [campaignPlayerSort, setCampaignPlayerSort] =
  useState<CampaignPlayerSort>("minutes");
const [campaignPlayerSortDirection, setCampaignPlayerSortDirection] =
  useState<SortDirection>("desc");

const [careerPlayerSort, setCareerPlayerSort] =
  useState<CampaignPlayerSort>("callUps");
const [careerPlayerSortDirection, setCareerPlayerSortDirection] =
  useState<SortDirection>("desc");

  useEffect(() => {
    saveCamps(camps);
  }, [camps]);

  useEffect(() => {
    saveCampaigns(campaigns);
  }, [campaigns]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }

    setCamps((current) => migrateCampsToUniqueIds(current, rows));
  }, [rows]);

  useEffect(() => {
    if (!activeCampaignId && campaigns.length > 0) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [activeCampaignId, campaigns]);

  useEffect(() => {
    if (campaigns.length === 0) {
      setCompareLeftCampaignId("");
      setCompareRightCampaignId("");
      return;
    }

    setCompareLeftCampaignId((current) => {
      if (campaigns.some((campaign) => campaign.id === current)) {
        return current;
      }

      return campaigns[0].id;
    });

    setCompareRightCampaignId((current) => {
      if (campaigns.some((campaign) => campaign.id === current)) {
        return current;
      }

      return campaigns[1]?.id ?? campaigns[0].id;
    });
  }, [campaigns]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveCampId("");
    setActiveMatchId("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const selectedPlayers = useMemo(() => {
  const snapshots = rows
    .filter((row) => getPlayerMark?.(row) === "selected")
    .map((row) => {
      const snapshot = createPlayerSnapshot(row);
      const callUpPosition = getPlayerSelectionPosition?.(row)?.trim();

      return {
        ...snapshot,
        callUpPosition: callUpPosition || snapshot.callUpPosition || snapshot.position,
      };
    });

  const unique = new Map<string, CampPlayerSnapshot>();

    for (const player of snapshots) {
      unique.set(player.key, player);
    }

    return Array.from(unique.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "pl")
    );
}, [rows, getPlayerMark, getPlayerSelectionPosition]);

  const activeCamp = camps.find((camp) => camp.id === activeCampId) ?? null;
const activeMatch =
  activeCamp?.matches.find((match) => match.id === activeMatchId) ?? null;
  const activeCampSummaries = useMemo(() => {
  if (!activeCamp) {
    return [];
  }

  return getCampPlayerSummaries(activeCamp);
}, [activeCamp]);

const activeCampTotals = useMemo(() => {
  if (!activeCamp) {
    return getCampTotals(null, activeCampSummaries);
  }

  return getCampTotals(activeCamp, activeCampSummaries);
}, [activeCamp, activeCampSummaries]);

const topCampMinutes = useMemo(() => {
  return activeCampSummaries
    .filter((summary) => summary.minutes > 0)
    .slice(0, 5);
}, [activeCampSummaries]);

const topCampGoals = useMemo(() => {
  return [...activeCampSummaries]
    .filter((summary) => summary.goals > 0)
    .sort((left, right) => right.goals - left.goals || right.minutes - left.minutes)
    .slice(0, 5);
}, [activeCampSummaries]);

const topCampAssists = useMemo(() => {
  return [...activeCampSummaries]
    .filter((summary) => summary.assists > 0)
    .sort(
      (left, right) =>
        right.assists - left.assists || right.minutes - left.minutes
    )
    .slice(0, 5);
}, [activeCampSummaries]);

const topCampRatings = useMemo(() => {
  return [...activeCampSummaries]
    .filter((summary) => summary.avgRating !== null)
    .sort(
      (left, right) =>
        (right.avgRating ?? 0) - (left.avgRating ?? 0) ||
        right.minutes - left.minutes
    )
    .slice(0, 5);
}, [activeCampSummaries]);

const playersWithoutCampAppearance = useMemo(() => {
  return activeCampSummaries.filter((summary) => summary.matches === 0);
}, [activeCampSummaries]);
const careerPlayerSummaries = useMemo(() => {
  return getCareerPlayerSummaries(camps);
}, [camps]);

const filteredCareerPlayerSummaries = useMemo(() => {
  const normalizedSearch = careerSearch.trim().toLowerCase();

  return [...careerPlayerSummaries]
    .filter((summary) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        summary.player.name,
        summary.player.callUpPosition,
        summary.player.position,
        summary.player.club,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) =>
      comparePlayerSummaries(
        left,
        right,
        careerPlayerSort,
        careerPlayerSortDirection
      )
    );
}, [
  careerPlayerSummaries,
  careerSearch,
  careerPlayerSort,
  careerPlayerSortDirection,
]);
const selectedCareerSummary =
  filteredCareerPlayerSummaries.find(
    (summary) => summary.player.key === selectedCareerPlayerKey
  ) ??
  filteredCareerPlayerSummaries[0] ??
  null;

const selectedCareerDetails = useMemo(() => {
  if (!selectedCareerSummary) {
    return null;
  }

  return getCareerPlayerDetails(camps, selectedCareerSummary.player.key);
}, [camps, selectedCareerSummary]);
const activeCampaign =
  campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;

const activeCampaignCamps = useMemo(() => {
  if (!activeCampaign) {
    return [];
  }

  return camps.filter((camp) => camp.campaignId === activeCampaign.id);
}, [activeCampaign, camps]);

const activeCampaignStats = useMemo(() => {
  return getCampaignStats(activeCampaignCamps);
}, [activeCampaignCamps]);

const activeCampaignPlayers = useMemo(() => {
  return getCareerPlayerSummaries(activeCampaignCamps);
}, [activeCampaignCamps]);
const compareLeftCampaign =
  campaigns.find((campaign) => campaign.id === compareLeftCampaignId) ??
  campaigns[0] ??
  null;

const compareRightCampaign =
  campaigns.find((campaign) => campaign.id === compareRightCampaignId) ??
  campaigns.find((campaign) => campaign.id !== compareLeftCampaign?.id) ??
  campaigns[0] ??
  null;

const compareLeftCampaignCamps = useMemo(() => {
  if (!compareLeftCampaign) {
    return [];
  }

  return camps.filter((camp) => camp.campaignId === compareLeftCampaign.id);
}, [camps, compareLeftCampaign]);

const compareRightCampaignCamps = useMemo(() => {
  if (!compareRightCampaign) {
    return [];
  }

  return camps.filter((camp) => camp.campaignId === compareRightCampaign.id);
}, [camps, compareRightCampaign]);

const compareLeftCampaignStats = useMemo(() => {
  return getCampaignStats(compareLeftCampaignCamps);
}, [compareLeftCampaignCamps]);

const compareRightCampaignStats = useMemo(() => {
  return getCampaignStats(compareRightCampaignCamps);
}, [compareRightCampaignCamps]);

const compareLeftCampaignPlayers = useMemo(() => {
  return getCareerPlayerSummaries(compareLeftCampaignCamps);
}, [compareLeftCampaignCamps]);

const compareRightCampaignPlayers = useMemo(() => {
  return getCareerPlayerSummaries(compareRightCampaignCamps);
}, [compareRightCampaignCamps]);

const compareLeftCampaignExtraStats = useMemo(() => {
  return getCampaignPlayerExtraStats(compareLeftCampaignPlayers);
}, [compareLeftCampaignPlayers]);

const compareRightCampaignExtraStats = useMemo(() => {
  return getCampaignPlayerExtraStats(compareRightCampaignPlayers);
}, [compareRightCampaignPlayers]);

const filteredCampaignPlayers = useMemo(() => {
  const normalizedSearch = campaignPlayerSearch.trim().toLowerCase();

  return [...activeCampaignPlayers]
    .filter((summary) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        summary.player.name,
        summary.player.callUpPosition,
        summary.player.position,
        summary.player.club,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .filter((summary) => {
      if (campaignPlayerFilter === "played") return summary.minutes > 0;
      if (campaignPlayerFilter === "without-minutes") return summary.minutes === 0;
      if (campaignPlayerFilter === "min-180") return summary.minutes >= 180;
      if (campaignPlayerFilter === "scored") return summary.goals > 0;
      if (campaignPlayerFilter === "assisted") return summary.assists > 0;

      return true;
    })
    .sort((left, right) =>
      comparePlayerSummaries(
        left,
        right,
        campaignPlayerSort,
        campaignPlayerSortDirection
      )
    );
}, [
  activeCampaignPlayers,
  campaignPlayerFilter,
  campaignPlayerSearch,
  campaignPlayerSort,
  campaignPlayerSortDirection,
]);
function createCampaign() {
  if (!campaignName.trim()) {
    alert("Wpisz nazwę kampanii.");
    return;
  }

  const nextCampaign: Campaign = {
    id: makeId(),
    name: campaignName.trim(),
    type: campaignType,
    dateFrom: campaignDateFrom,
    dateTo: campaignDateTo,
    createdAt: new Date().toISOString(),
  };

  setCampaigns((current) => [nextCampaign, ...current]);
  setActiveCampaignId(nextCampaign.id);
  setCampaignName("");
  setCampaignType("qualifiers");
  setCampaignDateFrom("");
  setCampaignDateTo("");
}

function deleteCampaign(campaignId: string) {
  const campaign = campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    return;
  }

  const confirmed = confirm(`Usunąć kampanię: ${campaign.name}?`);

  if (!confirmed) {
    return;
  }

  setCampaigns((current) => current.filter((item) => item.id !== campaignId));

  setCamps((current) =>
    current.map((camp) => {
      if (camp.campaignId !== campaignId) {
        return camp;
      }

      return {
        ...camp,
        campaignId: undefined,
      };
    })
  );

  if (activeCampaignId === campaignId) {
    setActiveCampaignId("");
  }
}
function toggleActiveCamp(campId: string) {
  if (activeCampId === campId) {
    setActiveCampId("");
    setActiveMatchId("");
    return;
  }

  setActiveCampId(campId);
  setActiveMatchId("");
}

function toggleActiveMatch(matchId: string) {
  if (activeMatchId === matchId) {
    setActiveMatchId("");
    return;
  }

  setActiveMatchId(matchId);
}
function assignActiveCampToCampaign(nextCampaignId: string) {
  if (!activeCamp) {
    return;
  }

  updateCamp(activeCamp.id, (camp) => ({
    ...camp,
    campaignId: nextCampaignId || undefined,
  }));
}
  function createCampFromSelectedPlayers() {
    if (selectedPlayers.length === 0) {
      alert("Najpierw powołaj zawodników w tabeli.");
      return;
    }

    const nextCamp: Camp = {
      id: makeId(),
      name: campName.trim() || getDefaultCampName(),
      type: campType,
      dateFrom,
      dateTo,
      players: selectedPlayers,
      matches: [],
      createdAt: new Date().toISOString(),
    };

    setCamps((current) => [nextCamp, ...current]);
setActiveCampId(nextCamp.id);
setActiveMatchId("");
setCampName(getDefaultCampName());
    setDateFrom("");
    setDateTo("");
  }

  function deleteCamp(campId: string) {
    const camp = camps.find((item) => item.id === campId);

    if (!camp) {
      return;
    }

    const confirmed = confirm(`Usunąć zgrupowanie: ${camp.name}?`);

    if (!confirmed) {
      return;
    }

    setCamps((current) => current.filter((item) => item.id !== campId));

    if (activeCampId === campId) {
      setActiveCampId("");
    }
  }
function updateCamp(campId: string, updater: (camp: Camp) => Camp) {
  setCamps((current) =>
    current.map((camp) => {
      if (camp.id !== campId) {
        return camp;
      }

      return updater(camp);
    })
  );
}
function addCurrentSelectedPlayersToActiveCamp() {
  if (!activeCamp) {
    return;
  }

const currentSnapshots = selectedPlayers.filter(isValidCampPlayer);

  const playersToAdd = currentSnapshots.filter((currentPlayer) => {
    return !activeCamp.players.some((campPlayer) =>
      hasSharedIdentity(currentPlayer, campPlayer)
    );
  });

  if (playersToAdd.length === 0) {
    alert(
      `Brak nowych powołanych do dodania.\n\nAktualnie powołani w tabeli: ${currentSnapshots.length}\nW tym zgrupowaniu: ${activeCamp.players.length}`
    );
    return;
  }

  updateCamp(activeCamp.id, (camp) => ({
    ...camp,
    players: [...camp.players, ...playersToAdd],
    matches: camp.matches.map((match) => {
      const appearanceKeys = new Set(
        (match.appearances ?? []).map((appearance) => appearance.playerKey)
      );

      return {
        ...match,
        appearances: [
          ...(match.appearances ?? []),
          ...playersToAdd
            .filter((player) => !appearanceKeys.has(player.key))
            .map((player) => createDefaultAppearance(player.key)),
        ],
      };
    }),
  }));

  alert(
    `Dodano nowych zawodników: ${playersToAdd.length}\n\n${playersToAdd
      .map((player) => player.name)
      .join(", ")}`
  );
}
function removePlayerFromActiveCamp(playerKey: string) {
  if (!activeCamp) {
    return;
  }

  const player = activeCamp.players.find((item) => item.key === playerKey);

  if (!player) {
    return;
  }

  const confirmed = confirm(
    `Usunąć ze zgrupowania zawodnika: ${player.name}?\n\nJeśli miał wpisane występy w meczach, one też zostaną usunięte.`
  );

  if (!confirmed) {
    return;
  }

  updateCamp(activeCamp.id, (camp) => ({
    ...camp,
    players: camp.players.filter((item) => item.key !== playerKey),
    matches: camp.matches.map((match) => ({
      ...match,
      appearances: (match.appearances ?? []).filter(
        (appearance) => appearance.playerKey !== playerKey
      ),
    })),
  }));
}

function createMatchForActiveCamp() {
  if (!activeCamp) {
    return;
  }

  if (!matchOpponent.trim()) {
    alert("Wpisz rywala.");
    return;
  }

  const nextMatch: CampMatch = {
    id: makeId(),
    opponent: matchOpponent.trim(),
    date: matchDate,
    type: matchType,
    teamGoals,
    opponentGoals,
    appearances: activeCamp.players.map((player) => ({
      playerKey: player.key,
      played: false,
      minutes: "",
      goals: "",
      assists: "",
      rating: "",
    })),
  };

updateCamp(activeCamp.id, (camp) => ({
  ...camp,
  matches: [nextMatch, ...camp.matches],
}));

setActiveMatchId(nextMatch.id);

setMatchOpponent("");
  setMatchDate("");
  setMatchType("friendly");
  setTeamGoals("");
  setOpponentGoals("");
}

function deleteMatch(campId: string, matchId: string) {
  const confirmed = confirm("Usunąć ten mecz?");

  if (!confirmed) {
    return;
  }

  updateCamp(campId, (camp) => ({
    ...camp,
    matches: camp.matches.filter((match) => match.id !== matchId),
  }));

  if (activeMatchId === matchId) {
    setActiveMatchId("");
  }
}
function updateMatchAppearance(
  campId: string,
  matchId: string,
  playerKey: string,
  patch: Partial<CampMatchAppearance>
) {
  updateCamp(campId, (camp) => ({
    ...camp,
    matches: camp.matches.map((match) => {
      if (match.id !== matchId) {
        return match;
      }

      const appearances = match.appearances ?? [];
      const hasAppearance = appearances.some(
        (appearance) => appearance.playerKey === playerKey
      );

      const nextAppearances = hasAppearance
        ? appearances
        : [...appearances, createDefaultAppearance(playerKey)];

      return {
        ...match,
        appearances: nextAppearances.map((appearance) => {
          if (appearance.playerKey !== playerKey) {
            return appearance;
          }

          return {
            ...appearance,
            ...patch,
          };
        }),
      };
    }),
  }));
}



function toggleCampaignPlayerSort(nextSort: CampaignPlayerSort) {
  if (campaignPlayerSort === nextSort) {
    setCampaignPlayerSortDirection((current) =>
      current === "asc" ? "desc" : "asc"
    );
    return;
  }

  setCampaignPlayerSort(nextSort);
  setCampaignPlayerSortDirection(nextSort === "name" ? "asc" : "desc");
}

function selectCampaignPlayerSort(nextSort: CampaignPlayerSort) {
  setCampaignPlayerSort(nextSort);
  setCampaignPlayerSortDirection(nextSort === "name" ? "asc" : "desc");
}

function toggleCareerPlayerSort(nextSort: CampaignPlayerSort) {
  if (careerPlayerSort === nextSort) {
    setCareerPlayerSortDirection((current) =>
      current === "asc" ? "desc" : "asc"
    );
    return;
  }

  setCareerPlayerSort(nextSort);
  setCareerPlayerSortDirection(nextSort === "name" ? "asc" : "desc");
}
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={styles.tab}
      >
        ZGRUP.
      </button>

      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)} />

          <aside style={styles.drawer}>
            <header style={styles.header}>
              <div>
                <h2 style={styles.title}>Zgrupowania i historia kadry</h2>
                <div style={styles.subtitle}>
                  Uniwersalny moduł: zapis powołań, później mecze i występy.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </header>

            <div style={styles.body}>
<CampCreatePanel
  campName={campName}
  campType={campType}
  dateFrom={dateFrom}
  dateTo={dateTo}
  selectedPlayersCount={selectedPlayers.length}
  onCampNameChange={setCampName}
  onCampTypeChange={setCampType}
  onDateFromChange={setDateFrom}
  onDateToChange={setDateTo}
  onOpenCampaigns={() => setIsCampaignsOpen(true)}
  onOpenCareerHistory={() => {
    setSelectedCareerPlayerKey(careerPlayerSummaries[0]?.player.key ?? "");
    setIsCareerHistoryOpen(true);
  }}
  onAddSelectedPlayersToActiveCamp={addCurrentSelectedPlayersToActiveCamp}
  onCreateCamp={createCampFromSelectedPlayers}
/>

              <section style={styles.mainGrid}>
<CampsListPanel
  camps={camps}
  activeCampId={activeCampId}
  onSelectCamp={toggleActiveCamp}
/>

                <section style={styles.detailsPanel}>
                  {!activeCamp && (
                    <div style={styles.empty}>
                      Wybierz zgrupowanie albo utwórz nowe.
                    </div>
                  )}

                  {activeCamp && (
                    <>
 <CampDetailsHeader
  camp={activeCamp}
  campaigns={campaigns}
  onDeleteCamp={deleteCamp}
  onAssignCampaign={assignActiveCampToCampaign}
/>
<CampSummaryPanel
  matchesCount={activeCamp.matches.length}
  totals={activeCampTotals}
  topMinutes={topCampMinutes}
  topGoals={topCampGoals}
  topAssists={topCampAssists}
  topRatings={topCampRatings}
  playersWithoutAppearance={playersWithoutCampAppearance}
/>
<CampMatchesPanel
  camp={activeCamp}
  activeMatch={activeMatch}
  matchOpponent={matchOpponent}
  matchDate={matchDate}
  matchType={matchType}
  teamGoals={teamGoals}
  opponentGoals={opponentGoals}
  onMatchOpponentChange={setMatchOpponent}
  onMatchDateChange={setMatchDate}
  onMatchTypeChange={setMatchType}
  onTeamGoalsChange={setTeamGoals}
  onOpponentGoalsChange={setOpponentGoals}
  onCreateMatch={createMatchForActiveCamp}
onSelectMatch={toggleActiveMatch}
  onDeleteMatch={deleteMatch}
  onUpdateAppearance={updateMatchAppearance}
/>
<CampPlayersGrid
  players={activeCamp.players}
  onRemovePlayer={removePlayerFromActiveCamp}
/>
                    </>
                  )}
                </section>
              </section>
            </div>
          </aside>
        </>
      )}

      {isCampaignsOpen && (
  <div style={styles.historyOverlay}>
    <section style={styles.campaignModal}>
      <div style={styles.historyHeader}>
        <div>
          <h2 style={styles.historyTitle}>Kampanie</h2>

          <div style={styles.historySubtitle}>
            Zbiorczy widok kilku zgrupowań, np. eliminacje do EURO albo Liga Narodów.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCampaignsOpen(false)}
          style={styles.historyCloseButton}
        >
          ✕
        </button>
      </div>

    <CampaignCreatePanel
  campaignName={campaignName}
  campaignType={campaignType}
  campaignDateFrom={campaignDateFrom}
  campaignDateTo={campaignDateTo}
  onCampaignNameChange={setCampaignName}
  onCampaignTypeChange={setCampaignType}
  onCampaignDateFromChange={setCampaignDateFrom}
  onCampaignDateToChange={setCampaignDateTo}
  onCreateCampaign={createCampaign}
/>

      <div style={styles.campaignContent}>
<CampaignsListPanel
  campaigns={campaigns}
  camps={camps}
  activeCampaignId={activeCampaignId}
  onSelectCampaign={setActiveCampaignId}
/>

        <section style={styles.campaignDetailsPanel}>
          {!activeCampaign && (
            <div style={styles.empty}>
              Wybierz kampanię albo utwórz nową.
            </div>
          )}

          {activeCampaign && (
            <>
 <CampaignDetailsOverview
  campaign={activeCampaign}
  stats={activeCampaignStats}
  onDeleteCampaign={deleteCampaign}
/>
<CampaignComparePanel
  campaigns={campaigns}
  compareLeftCampaign={compareLeftCampaign}
  compareRightCampaign={compareRightCampaign}
  compareLeftCampaignStats={compareLeftCampaignStats}
  compareRightCampaignStats={compareRightCampaignStats}
  compareLeftCampaignExtraStats={compareLeftCampaignExtraStats}
  compareRightCampaignExtraStats={compareRightCampaignExtraStats}
  onCompareLeftCampaignChange={setCompareLeftCampaignId}
  onCompareRightCampaignChange={setCompareRightCampaignId}
/>
<CampaignCampsComparisonPanel camps={activeCampaignCamps} />

<CampaignPlayersPanel
  campaignPlayerSearch={campaignPlayerSearch}
  campaignPlayerFilter={campaignPlayerFilter}
  campaignPlayerSort={campaignPlayerSort}
  campaignPlayerSortDirection={campaignPlayerSortDirection}
  activeCampaignPlayersCount={activeCampaignPlayers.length}
  filteredCampaignPlayers={filteredCampaignPlayers}
  onCampaignPlayerSearchChange={setCampaignPlayerSearch}
  onCampaignPlayerFilterChange={setCampaignPlayerFilter}
  onCampaignPlayerSortSelect={selectCampaignPlayerSort}
  onToggleCampaignPlayerSort={toggleCampaignPlayerSort}
/>
            </>
          )}
        </section>
      </div>
    </section>
  </div>
)}
{isCareerHistoryOpen && (
<CareerHistoryModal
  careerSearch={careerSearch}
  careerPlayerSummariesCount={careerPlayerSummaries.length}
  filteredCareerPlayerSummaries={filteredCareerPlayerSummaries}
  selectedCareerSummary={selectedCareerSummary}
  selectedCareerDetails={selectedCareerDetails}
  careerPlayerSort={careerPlayerSort}
  careerPlayerSortDirection={careerPlayerSortDirection}
  onCareerSearchChange={setCareerSearch}
  onSelectCareerPlayer={setSelectedCareerPlayerKey}
  onToggleCareerPlayerSort={toggleCareerPlayerSort}
  onClose={() => setIsCareerHistoryOpen(false)}
/>
)}
    </>
    
  );
}
