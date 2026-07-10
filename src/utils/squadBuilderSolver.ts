import type {
  FormationSlot,
  SlotCandidate,
} from "../types/squadBuilderTypes";

const MAX_CANDIDATES_PER_SLOT = 14;
const MAX_SEARCH_VISITS = 120000;

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
};

function getCandidateSolveScore(candidate: SlotCandidate): number {
  const selectionScore = (candidate as CandidateWithSelectionScore)
    .selectionScore;

  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) {
    return selectionScore;
  }

  return candidate.finalScore;
}

function sortCandidatesForSolver(candidates: SlotCandidate[]): SlotCandidate[] {
  return [...candidates].sort((left, right) => {
    const selectionDiff =
      getCandidateSolveScore(right) - getCandidateSolveScore(left);

    if (selectionDiff !== 0) {
      return selectionDiff;
    }

    const finalScoreDiff = right.finalScore - left.finalScore;

    if (finalScoreDiff !== 0) {
      return finalScoreDiff;
    }

    const nameDiff = left.name.localeCompare(right.name, "pl");

    if (nameDiff !== 0) {
      return nameDiff;
    }

    return left.key.localeCompare(right.key, "pl");
  });
}

function isGoalkeeperSlot(slot: FormationSlot): boolean {
  return slot.id === "GK" || slot.positionGroup === "Bramkarz";
}

export function solveSquad(
  slots: FormationSlot[],
  candidatesBySlot: Record<string, SlotCandidate[]>
): Record<string, SlotCandidate | null> {
  const fixedResult: Record<string, SlotCandidate | null> = {};
  const fixedUsed = new Set<string>();

  for (const slot of slots) {
    if (!isGoalkeeperSlot(slot)) {
      continue;
    }

    const goalkeeperCandidate = sortCandidatesForSolver(
      candidatesBySlot[slot.id] ?? []
    ).find((candidate) => !fixedUsed.has(candidate.key));

    fixedResult[slot.id] = goalkeeperCandidate ?? null;

    if (goalkeeperCandidate) {
      fixedUsed.add(goalkeeperCandidate.key);
    }
  }

  const freeSlots = slots
    .filter((slot) => !isGoalkeeperSlot(slot))
    .map((slot, originalIndex) => {
      const candidates = sortCandidatesForSolver(
        candidatesBySlot[slot.id] ?? []
      ).slice(0, MAX_CANDIDATES_PER_SLOT);

      return {
        slot,
        originalIndex,
        candidates,
      };
    })
    .sort((left, right) => {
      const leftCount = left.candidates.length;
      const rightCount = right.candidates.length;

      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }

      return left.originalIndex - right.originalIndex;
    });

  const optimisticRemainingScores = new Array(freeSlots.length + 1).fill(0);

  for (let index = freeSlots.length - 1; index >= 0; index -= 1) {
    const bestCandidate = freeSlots[index].candidates[0];
    const bestSlotScore = bestCandidate
      ? Math.max(0, getCandidateSolveScore(bestCandidate))
      : 0;

    optimisticRemainingScores[index] =
      optimisticRemainingScores[index + 1] + bestSlotScore;
  }

  let bestResult: Record<string, SlotCandidate | null> = {};
  let bestSolveScore = Number.NEGATIVE_INFINITY;
  let bestVisibleScore = Number.NEGATIVE_INFINITY;
  let bestFilledCount = -1;
  let visits = 0;

  function considerResult(
    currentResult: Record<string, SlotCandidate | null>,
    solveScore: number,
    visibleScore: number,
    filledCount: number
  ) {
    if (filledCount > bestFilledCount) {
      bestFilledCount = filledCount;
      bestSolveScore = solveScore;
      bestVisibleScore = visibleScore;
      bestResult = { ...currentResult };
      return;
    }

    if (filledCount !== bestFilledCount) {
      return;
    }

    if (solveScore > bestSolveScore) {
      bestSolveScore = solveScore;
      bestVisibleScore = visibleScore;
      bestResult = { ...currentResult };
      return;
    }

    if (solveScore !== bestSolveScore) {
      return;
    }

    if (visibleScore > bestVisibleScore) {
      bestVisibleScore = visibleScore;
      bestResult = { ...currentResult };
    }
  }

  function search(
    index: number,
    currentResult: Record<string, SlotCandidate | null>,
    currentUsed: Set<string>,
    solveScore: number,
    visibleScore: number,
    filledCount: number
  ) {
    visits += 1;

    if (visits > MAX_SEARCH_VISITS) {
      considerResult(currentResult, solveScore, visibleScore, filledCount);
      return;
    }

    if (
      filledCount + (freeSlots.length - index) < bestFilledCount
    ) {
      return;
    }

    if (
      filledCount === bestFilledCount &&
      solveScore + optimisticRemainingScores[index] < bestSolveScore
    ) {
      return;
    }

    if (index >= freeSlots.length) {
      considerResult(currentResult, solveScore, visibleScore, filledCount);
      return;
    }

    const { slot, candidates } = freeSlots[index];

    for (const candidate of candidates) {
      if (currentUsed.has(candidate.key)) {
        continue;
      }

      currentResult[slot.id] = candidate;
      currentUsed.add(candidate.key);

      search(
        index + 1,
        currentResult,
        currentUsed,
        solveScore + getCandidateSolveScore(candidate),
        visibleScore + candidate.finalScore,
        filledCount + 1
      );

      currentUsed.delete(candidate.key);
      delete currentResult[slot.id];
    }

    currentResult[slot.id] = null;

    search(
      index + 1,
      currentResult,
      currentUsed,
      solveScore,
      visibleScore,
      filledCount
    );

    delete currentResult[slot.id];
  }

  const initialFilledCount = Array.from(fixedUsed).length;
  const initialSolveScore = Object.values(fixedResult).reduce(
    (sum, candidate) =>
      candidate ? sum + getCandidateSolveScore(candidate) : sum,
    0
  );
  const initialVisibleScore = Object.values(fixedResult).reduce(
    (sum, candidate) => (candidate ? sum + candidate.finalScore : sum),
    0
  );

  search(
    0,
    { ...fixedResult },
    new Set<string>(fixedUsed),
    initialSolveScore,
    initialVisibleScore,
    initialFilledCount
  );

  const result: Record<string, SlotCandidate | null> = { ...bestResult };

  for (const slot of slots) {
    if (!(slot.id in result)) {
      result[slot.id] = null;
    }
  }

  return result;
}