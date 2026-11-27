import { PARTS, TIERS, type PartId } from './parts';

export interface ProgressState {
  unlockedTiers: number[];
  placedParts: PartId[];
  passedQuizzes: string[];
}

const STORAGE_KEY = 'dublab.progress.v1';

export const DEFAULT_PROGRESS: ProgressState = {
  unlockedTiers: [0],
  placedParts: ['audio-555', 'pitch-pot', 'trigger-btn', 'volume-pot'],
  passedQuizzes: [],
};

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      unlockedTiers: Array.isArray(parsed.unlockedTiers) ? parsed.unlockedTiers : [0],
      placedParts: Array.isArray(parsed.placedParts)
        ? (parsed.placedParts as PartId[])
        : [...DEFAULT_PROGRESS.placedParts],
      passedQuizzes: Array.isArray(parsed.passedQuizzes) ? parsed.passedQuizzes : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function canPlacePart(state: ProgressState, partId: PartId): { ok: boolean; reason?: string } {
  const def = PARTS.find((p) => p.id === partId);
  if (!def) return { ok: false, reason: 'Unknown part' };
  if (!state.unlockedTiers.includes(def.tier)) {
    return { ok: false, reason: `Tier ${def.tier} locked` };
  }
  for (const dep of def.needs) {
    if (!state.placedParts.includes(dep)) {
      const depDef = PARTS.find((p) => p.id === dep);
      return { ok: false, reason: `Needs ${depDef?.shortName ?? dep} first` };
    }
  }
  return { ok: true };
}

export function togglePlacedPart(state: ProgressState, partId: PartId): ProgressState {
  const exists = state.placedParts.includes(partId);
  if (exists) {
    // Also remove parts that depend on this part
    const toRemove = new Set<PartId>([partId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of PARTS) {
        if (!toRemove.has(p.id) && p.needs.some((n) => toRemove.has(n))) {
          if (state.placedParts.includes(p.id)) {
            toRemove.add(p.id);
            changed = true;
          }
        }
      }
    }
    const next: ProgressState = {
      ...state,
      placedParts: state.placedParts.filter((id) => !toRemove.has(id)),
    };
    saveProgress(next);
    return next;
  }

  const check = canPlacePart(state, partId);
  if (!check.ok) return state;

  const next: ProgressState = {
    ...state,
    placedParts: [...state.placedParts, partId],
  };
  saveProgress(next);
  return next;
}

export function checkBuildUnlock(state: ProgressState): { next: ProgressState; unlockedTier: number | null } {
  let unlockedTier: number | null = null;
  const tiers = new Set(state.unlockedTiers);

  for (const tierDef of TIERS) {
    if (!tiers.has(tierDef.tier)) continue;
    const nextTier = TIERS.find((t) => t.tier === tierDef.tier + 1);
    if (!nextTier || tiers.has(nextTier.tier) || nextTier.lockedReason) continue;
    if (
      tierDef.buildRequirement &&
      tierDef.buildRequirement.every((req) => state.placedParts.includes(req))
    ) {
      tiers.add(nextTier.tier);
      unlockedTier = nextTier.tier;
    }
  }

  const next: ProgressState = {
    ...state,
    unlockedTiers: Array.from(tiers).sort((a, b) => a - b),
  };
  if (unlockedTier !== null) {
    saveProgress(next);
  }
  return { next, unlockedTier };
}

export function unlockTierViaQuiz(state: ProgressState, quizId: string, tier: number): ProgressState {
  const tiers = new Set(state.unlockedTiers);
  tiers.add(tier);
  const quizzes = new Set(state.passedQuizzes);
  quizzes.add(quizId);
  const next: ProgressState = {
    ...state,
    unlockedTiers: Array.from(tiers).sort((a, b) => a - b),
    passedQuizzes: Array.from(quizzes),
  };
  saveProgress(next);
  return next;
}

export function clearBoardParts(state: ProgressState): ProgressState {
  const next: ProgressState = {
    ...state,
    placedParts: [],
  };
  saveProgress(next);
  return next;
}

export function resetAllProgress(): ProgressState {
  const next: ProgressState = {
    unlockedTiers: [0],
    placedParts: [],
    passedQuizzes: [],
  };
  saveProgress(next);
  return next;
}
