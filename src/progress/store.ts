import type { LedSource } from '../led';
import { PARTS, TIERS, type PartId } from './parts';

export type ViewMode = 'circuit' | 'knobs' | 'both' | 'schematic';

export const LED_OHMS = [100, 330, 470, 1000] as const;

export interface ProgressState {
  unlockedTiers: number[];
  placedParts: PartId[];
  passedQuizzes: string[];
  ledOhms: number;
  ledSource: LedSource;
}

const PROGRESS_KEY = 'dublab.progress.v1';
const VIEW_KEY = 'dublab.view.v1';

export const DEFAULT_PROGRESS: ProgressState = {
  unlockedTiers: [0],
  placedParts: ['audio-555', 'pitch-pot', 'trigger-btn', 'volume-pot'],
  passedQuizzes: [],
  ledOhms: 470,
  ledSource: 'auto',
};

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      unlockedTiers: Array.isArray(parsed.unlockedTiers) ? parsed.unlockedTiers : [0],
      placedParts: Array.isArray(parsed.placedParts)
        ? (parsed.placedParts as PartId[])
        : [...DEFAULT_PROGRESS.placedParts],
      passedQuizzes: Array.isArray(parsed.passedQuizzes) ? parsed.passedQuizzes : [],
      ledOhms: typeof parsed.ledOhms === 'number' ? parsed.ledOhms : DEFAULT_PROGRESS.ledOhms,
      ledSource:
        parsed.ledSource === 'auto' || parsed.ledSource === 'audio' || parsed.ledSource === 'lfo'
          ? parsed.ledSource
          : 'auto',
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'circuit' || v === 'knobs' || v === 'both' || v === 'schematic') return v;
  } catch {
    // ignore
  }
  return 'both';
}

export function saveViewMode(view: ViewMode): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // ignore
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

export function updateLedConfig(
  state: ProgressState,
  patch: Partial<Pick<ProgressState, 'ledOhms' | 'ledSource'>>,
): ProgressState {
  const next: ProgressState = {
    ...state,
    ...patch,
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
    ledOhms: DEFAULT_PROGRESS.ledOhms,
    ledSource: DEFAULT_PROGRESS.ledSource,
  };
  saveProgress(next);
  return next;
}
