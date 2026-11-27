import React, { useState } from 'react';
import { QUIZZES } from '../progress/quiz';

interface QuizPanelProps {
  quizId: string;
  onPass: (quizId: string, tier: number) => void;
  onClose: () => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({ quizId, onPass, onClose }) => {
  const quiz = QUIZZES[quizId];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) return null;

  const allCorrect = quiz.questions.every((q) => answers[q.id] === q.answerIndex);

  const handleSubmit = () => {
    setSubmitted(true);
    if (allCorrect) {
      onPass(quiz.id, quiz.tierToUnlock);
    }
  };

  return (
    <div className="panel-card quiz-card" data-testid={`quiz-panel-${quizId}`}>
      <div className="panel-head">
        <span className="panel-title">{quiz.title}</span>
        <button type="button" className="mini-btn" onClick={onClose}>
          Close
        </button>
      </div>

      {quiz.questions.map((q, idx) => {
        const picked = answers[q.id];
        const isRight = picked === q.answerIndex;
        return (
          <div key={q.id} className="quiz-q">
            <div className="quiz-prompt">
              {idx + 1}. {q.prompt}
            </div>
            <div className="quiz-opts">
              {q.options.map((opt, oi) => (
                <button
                  key={opt}
                  type="button"
                  className={`quiz-opt ${picked === oi ? 'selected' : ''}`}
                  data-testid={`quiz-opt-${q.id}-${oi}`}
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers((prev) => ({ ...prev, [q.id]: oi }));
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {submitted && (
              <div className={`quiz-feedback ${isRight ? 'ok' : 'err'}`}>
                {isRight ? `Correct — ${q.explanation}` : 'Check the pin/bias hint and try again.'}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="play-banner"
        data-testid="quiz-submit"
        onClick={handleSubmit}
      >
        Submit Quiz Answers
      </button>
    </div>
  );
};
