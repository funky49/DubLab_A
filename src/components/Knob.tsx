import React, { useRef, useState } from 'react';

interface KnobProps {
  id: string;
  label: string;
  chipRole: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (val: number) => string;
  accent?: string;
  onChange: (val: number) => void;
  onTouchControl?: (id: string) => void;
}

export const Knob: React.FC<KnobProps> = ({
  id,
  label,
  chipRole,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  format,
  accent = 'var(--accent)',
  onChange,
  onTouchControl,
}) => {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + ratio * 270;

  const snap = (raw: number) => {
    const clamped = Math.max(min, Math.min(max, raw));
    const stepped = Math.round((clamped - min) / step) * step + min;
    return Number(Math.max(min, Math.min(max, stepped)).toFixed(4));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onTouchControl?.(id);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dy = startY.current - e.clientY;
    const span = max - min;
    const next = snap(startVal.current + (dy / 140) * span);
    onChange(next);
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const display = format
    ? format(value)
    : `${step >= 1 ? Math.round(value) : value.toFixed(1)}${unit}`;

  const arcLen = 2 * Math.PI * 24 * (270 / 360);
  const dashOffset = arcLen * (1 - ratio);

  return (
    <div className={`knob-wrap ${dragging ? 'active' : ''}`} data-control-id={id}>
      <div
        className="knob-dial"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          onTouchControl?.(id);
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(snap(value + (max - min) * 0.04));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(snap(value - (max - min) * 0.04));
          }
        }}
      >
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle
            cx="30"
            cy="30"
            r="24"
            fill="none"
            stroke="#223129"
            strokeWidth="3"
            strokeDasharray={`${arcLen} 200`}
            strokeLinecap="round"
            transform="rotate(135 30 30)"
          />
          <circle
            cx="30"
            cy="30"
            r="24"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeDasharray={`${arcLen} 200`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(135 30 30)"
          />
        </svg>
        <span
          className="knob-pointer"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            background: accent,
          }}
        />
        <span className="knob-val">{display}</span>
      </div>
      <span className="knob-label">{label}</span>
      <span className="knob-chip">{chipRole}</span>
      <input
        className="sr-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} slider`}
        onChange={(e) => {
          onTouchControl?.(id);
          onChange(Number(e.target.value));
        }}
      />
    </div>
  );
};
