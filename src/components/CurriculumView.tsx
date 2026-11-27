import React, { useState } from 'react';
import { BOM_ITEMS, CONTROL_MAP, DEBUG_ROWS, WIRING_STEPS } from '../curriculum/data';
import { BreadboardLayout } from './BreadboardLayout';

type CurricTab = 'layout' | 'bom' | 'wiring' | 'map';

export const CurriculumView: React.FC = () => {
  const [tab, setTab] = useState<CurricTab>('layout');

  return (
    <section className="panel-card" data-testid="curriculum-view">
      <div className="panel-head">
        <span className="panel-title">Breadboard Curriculum (+5V)</span>
        <a
          className="panel-link"
          href="/docs/breadboard-curriculum.md"
          target="_blank"
          rel="noreferrer"
        >
          Full Markdown ↗
        </a>
      </div>

      <div className="mode-row">
        <button
          type="button"
          className={`chip-btn ${tab === 'layout' ? 'active' : ''}`}
          onClick={() => setTab('layout')}
        >
          <span>Layout</span>
          <small>Breadboard</small>
        </button>
        <button
          type="button"
          className={`chip-btn ${tab === 'bom' ? 'active' : ''}`}
          onClick={() => setTab('bom')}
        >
          <span>BOM</span>
          <small>Parts list</small>
        </button>
        <button
          type="button"
          className={`chip-btn ${tab === 'wiring' ? 'active' : ''}`}
          onClick={() => setTab('wiring')}
        >
          <span>Wiring</span>
          <small>Step-by-step</small>
        </button>
        <button
          type="button"
          className={`chip-btn ${tab === 'map' ? 'active' : ''}`}
          onClick={() => setTab('map')}
        >
          <span>Debug</span>
          <small>Map + Check</small>
        </button>
      </div>

      {tab === 'layout' && (
        <div className="curric-stack">
          <BreadboardLayout />
          <p className="curric-note">
            Formula: <code>f = 1.44 / ((R1 + 2×R2) × C1)</code> with R1 = 4.7 kΩ, R2 = 10 kΩ pot, C1 = 100 nF → 583 Hz to 3.06 kHz (supply independent). Pin 5 sits at 2/3 Vcc = 3.33 V.
          </p>
        </div>
      )}

      {tab === 'bom' && (
        <div className="curric-table-wrap">
          <table className="curric-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Part</th>
                <th>Teaching note</th>
              </tr>
            </thead>
            <tbody>
              {BOM_ITEMS.map((item) => (
                <tr key={item.part}>
                  <td>{item.qty}</td>
                  <td><strong>{item.part}</strong></td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'wiring' && (
        <div className="curric-stack">
          {WIRING_STEPS.map((ws) => (
            <div key={ws.step} className="curric-step-card">
              <div className="curric-step-title">
                Step {ws.step}: {ws.title}
              </div>
              <ul className="curric-list">
                {ws.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'map' && (
        <div className="curric-stack">
          <div className="curric-table-wrap">
            <table className="curric-table">
              <thead>
                <tr>
                  <th>Control</th>
                  <th>Physical part</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {CONTROL_MAP.map((row) => (
                  <tr key={row.control}>
                    <td><strong>{row.control}</strong></td>
                    <td>{row.physicalPart}</td>
                    <td>{row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="curric-table-wrap">
            <table className="curric-table">
              <thead>
                <tr>
                  <th>Symptom</th>
                  <th>Bench Check</th>
                </tr>
              </thead>
              <tbody>
                {DEBUG_ROWS.map((d) => (
                  <tr key={d.symptom}>
                    <td><strong>{d.symptom}</strong></td>
                    <td>{d.check}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
