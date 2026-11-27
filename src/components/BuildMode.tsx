import React, { useState } from 'react';
import { PARTS, TIERS, type PartId } from '../progress/parts';
import { canPlacePart, type ProgressState } from '../progress/store';
import { CurriculumView } from './CurriculumView';
import { QuizPanel } from './QuizPanel';

interface BuildModeProps {
  progress: ProgressState;
  onTogglePart: (id: PartId) => void;
  onCheckBuild: () => void;
  onUnlockQuiz: (quizId: string, tier: number) => void;
  onClearBoard: () => void;
  onResetAll: () => void;
  onGoPlay: () => void;
  statusBanner: string | null;
}

export const BuildMode: React.FC<BuildModeProps> = ({
  progress,
  onTogglePart,
  onCheckBuild,
  onUnlockQuiz,
  onClearBoard,
  onResetAll,
  onGoPlay,
  statusBanner,
}) => {
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  const highestTier = Math.max(...progress.unlockedTiers);
  const coreCount = ['audio-555', 'pitch-pot', 'trigger-btn', 'volume-pot'].filter((id) =>
    progress.placedParts.includes(id as PartId),
  ).length;

  return (
    <div className="build-stack" data-testid="build-mode">
      <div className="tier-bar">
        <span className="tier-pill">LVL {highestTier}</span>
        <div className="tier-pills-scroll">
          {TIERS.map((t) => {
            const unlocked = progress.unlockedTiers.includes(t.tier);
            return (
              <span
                key={t.tier}
                className={`tier-step ${unlocked ? 'unlocked' : 'locked'}`}
              >
                {unlocked ? `✓ L${t.tier}` : `🔒 L${t.tier}`}
              </span>
            );
          })}
        </div>
        <button type="button" className="mini-btn" onClick={onResetAll} data-testid="reset-progress">
          Reset
        </button>
      </div>

      {statusBanner && (
        <div className="unlock-banner" data-testid="unlock-banner">
          {statusBanner}
        </div>
      )}

      {activeQuizId && (
        <QuizPanel
          quizId={activeQuizId}
          onPass={(qid, tier) => {
            onUnlockQuiz(qid, tier);
            setActiveQuizId(null);
          }}
          onClose={() => setActiveQuizId(null)}
        />
      )}

      <section className="panel-card">
        <div className="panel-head">
          <span className="panel-title">Circuit Board — {coreCount}/4 Core Placed</span>
          <div className="row-actions">
            <button type="button" className="mini-btn" onClick={onClearBoard}>
              Clear
            </button>
            <button
              type="button"
              className="mini-btn accent"
              data-testid="check-build-btn"
              onClick={onCheckBuild}
            >
              Check Build
            </button>
            <button
              type="button"
              className="mini-btn"
              data-testid="go-play-btn"
              onClick={onGoPlay}
            >
              Play ▶
            </button>
          </div>
        </div>

        <div className="board-slots">
          {PARTS.filter((p) => progress.unlockedTiers.includes(p.tier)).map((part) => {
            const placed = progress.placedParts.includes(part.id);
            const check = canPlacePart(progress, part.id);
            return (
              <button
                key={part.id}
                type="button"
                data-testid={`board-part-${part.id}`}
                className={`part-slot ${placed ? 'placed' : 'empty'} ${!placed && !check.ok ? 'blocked' : ''}`}
                onClick={() => onTogglePart(part.id)}
              >
                <div className="part-slot-top">
                  <strong>{part.name}</strong>
                  <span className="part-badge">{placed ? 'PLACED' : 'TAP TO ADD'}</span>
                </div>
                <small>{placed ? part.enables : check.ok ? part.chipNote : check.reason}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <span className="panel-title">Unlock Roadmap</span>
          <span className="panel-chip">Quiz or Build to unlock</span>
        </div>
        <div className="tier-list">
          {TIERS.filter((t) => t.tier > 0).map((t) => {
            const unlocked = progress.unlockedTiers.includes(t.tier);
            const prevUnlocked = progress.unlockedTiers.includes(t.tier - 1);
            return (
              <div key={t.tier} className={`tier-row-card ${unlocked ? 'unlocked' : ''}`}>
                <div className="tier-row-info">
                  <strong>{t.title}</strong>
                  <small>{t.subtitle}</small>
                </div>
                {unlocked ? (
                  <span className="ctx-pill running">UNLOCKED</span>
                ) : t.lockedReason ? (
                  <span className="ctx-pill">LOCKED STUB</span>
                ) : t.quizId && prevUnlocked ? (
                  <button
                    type="button"
                    className="mini-btn accent"
                    data-testid={`open-quiz-${t.quizId}`}
                    onClick={() => setActiveQuizId(t.quizId!)}
                  >
                    Pass L{t.tier} Quiz
                  </button>
                ) : (
                  <span className="ctx-pill">Need L{t.tier - 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        className="chip-btn"
        onClick={() => setShowDocs((v) => !v)}
        data-testid="toggle-curriculum"
      >
        <span>{showDocs ? 'Hide Breadboard Docs' : 'Show Breadboard Curriculum (BOM · Layout · Wiring)'}</span>
        <small>sound-system.fr +5V guide</small>
      </button>

      {showDocs && <CurriculumView />}
    </div>
  );
};
