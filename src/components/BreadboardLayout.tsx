import React from 'react';

interface BreadboardLayoutProps {
  showLfo?: boolean;
  showOpamp?: boolean;
  showFilters?: boolean;
  showEcho?: boolean;
}

export const BreadboardLayout: React.FC<BreadboardLayoutProps> = ({
  showLfo = true,
  showOpamp = true,
  showFilters = true,
  showEcho = true,
}) => {
  return (
    <div className="breadboard-wrap" data-testid="breadboard-svg">
      <svg
        viewBox="0 0 380 225"
        className="breadboard-svg"
        role="img"
        aria-label="Solderless breadboard layout map for dual 555 and PT2399 dub siren"
      >
        <rect x="4" y="4" width="372" height="217" rx="10" fill="#101713" stroke="#28382f" strokeWidth="1.5" />

        {/* +5V Top Rail */}
        <line x1="16" y1="20" x2="364" y2="20" stroke="#ff5544" strokeWidth="2.5" />
        <text x="18" y="15" className="bb-rail-pos">+5V RAIL (USB 5V / 3×AA · bypass 100µF + 100nF)</text>

        {/* GND Bottom Rail */}
        <line x1="16" y1="204" x2="364" y2="204" stroke="#5da9e9" strokeWidth="2.5" />
        <text x="18" y="216" className="bb-rail-gnd">GND RAIL (0V common reference)</text>

        {/* Center trench */}
        <rect x="16" y="106" width="348" height="8" rx="3" fill="#080c0a" stroke="#1e2b24" />

        {/* Audio NE555 */}
        <rect x="24" y="54" width="84" height="58" rx="6" fill="#162920" stroke="#3ecf8e" strokeWidth="1.6" />
        <text x="66" y="72" textAnchor="middle" className="bb-chip-title">U1 NE555</text>
        <text x="66" y="84" textAnchor="middle" className="bb-chip-sub">AUDIO ASTABLE</text>
        <text x="66" y="96" textAnchor="middle" className="bb-chip-sub">R1 4.7k · R2 10k</text>
        <text x="66" y="106" textAnchor="middle" className="bb-chip-sub">C1 100n · p5 3.33V</text>
        <line x1="66" y1="20" x2="66" y2="54" stroke="#ff5544" strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1="42" y1="112" x2="42" y2="204" stroke="#5da9e9" strokeWidth="1.2" strokeDasharray="3 2" />

        {/* LFO NE555 */}
        <rect
          x="126"
          y="54"
          width="84"
          height="58"
          rx="6"
          fill={showLfo ? '#271e12' : '#121815'}
          stroke={showLfo ? '#e8a54b' : '#2b3a32'}
          strokeWidth="1.5"
          strokeDasharray={showLfo ? undefined : '4 3'}
        />
        <text x="168" y="72" textAnchor="middle" className="bb-chip-title">U3 NE555</text>
        <text x="168" y="84" textAnchor="middle" className="bb-chip-sub">LFO (100µF)</text>
        <text x="168" y="96" textAnchor="middle" className="bb-chip-sub">Rate + Depth</text>
        <text x="168" y="106" textAnchor="middle" className="bb-chip-sub">→ U1 pin 5 CV</text>
        <path d="M 126 78 L 108 78" stroke={showLfo ? '#e8a54b' : '#324239'} strokeWidth="1.6" />

        {/* Op-Amp & Filters */}
        <rect
          x="228"
          y="54"
          width="130"
          height="58"
          rx="6"
          fill={showOpamp || showFilters ? '#17232c' : '#121815'}
          stroke={showOpamp || showFilters ? '#38bdf8' : '#2b3a32'}
          strokeWidth="1.5"
          strokeDasharray={showOpamp || showFilters ? undefined : '4 3'}
        />
        <text x="293" y="72" textAnchor="middle" className="bb-chip-title">U2 MCP6002 + RC</text>
        <text x="293" y="84" textAnchor="middle" className="bb-chip-sub">IN+ bias Vcc/2 = 2.5V</text>
        <text x="293" y="96" textAnchor="middle" className="bb-chip-sub">Integrator · HPF/LPF</text>
        <text x="293" y="106" textAnchor="middle" className="bb-chip-sub">LED + 470Ω (~6.4 mA)</text>

        {/* Output + Trigger row */}
        <rect x="24" y="132" width="150" height="52" rx="6" fill="#131e18" stroke="#3ecf8e" strokeWidth="1.3" />
        <text x="99" y="150" textAnchor="middle" className="bb-chip-title">TRIGGER · 10µF · VOL</text>
        <text x="99" y="164" textAnchor="middle" className="bb-chip-sub">Pin 3 → S1 → 10k pot → 6.35mm jack</text>
        <text x="99" y="176" textAnchor="middle" className="bb-chip-sub">LED indicator off Audio / LFO</text>

        {/* PT2399 Echo module */}
        <rect
          x="192"
          y="132"
          width="166"
          height="52"
          rx="6"
          fill={showEcho ? '#14222c' : '#111614'}
          stroke={showEcho ? '#38bdf8' : '#2b3a32'}
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />
        <text x="275" y="150" textAnchor="middle" className="bb-chip-title">PT2399 ECHO MODULE</text>
        <text x="275" y="164" textAnchor="middle" className="bb-chip-sub">Same +5V rail · 100n + 10µF</text>
        <text x="275" y="176" textAnchor="middle" className="bb-chip-sub">Delay 50ms–1s · FB · Wet Mix</text>
      </svg>
    </div>
  );
};
