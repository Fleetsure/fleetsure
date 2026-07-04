import { TyreUnit, calcHealth, healthColor } from "@/lib/tyreCalc";

export default function TruckDiagram({ tyres, selectedPos, onSelect }: {
  tyres: TyreUnit[];
  selectedPos: string | null;
  onSelect: (t: TyreUnit) => void;
}) {
  const main = tyres.filter(t => !t.is_spare);
  const spare = tyres.find(t => t.is_spare);
  const rows = Math.max(1, main.length / 2);

  const W = 300; const CX = W / 2;

  // Wide cabin — fills the full vehicle width
  const CAB_W = 152; const CAB_X = CX - CAB_W / 2;  // 74..226
  const CAB_TOP = 16; const CAB_H = 62;

  // Body slightly narrower
  const BODY_W = 122; const BODY_X = CX - BODY_W / 2; // 89..211
  const BODY_TOP = CAB_TOP + CAB_H + 4;                // 82

  const TW = 22; const TH = 42;
  const TL_X = BODY_X - TW - 5;    // 62
  const TR_X = BODY_X + BODY_W + 5; // 216

  const FIRST_AXY = BODY_TOP + 28;
  const ROW_H = 62;

  const BODY_BOT = FIRST_AXY + (rows - 1) * ROW_H + 28;
  const svgH = BODY_BOT + (spare ? 90 : 22);

  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>

      {/* ── CABIN ── */}
      {/* Cabin roof */}
      <rect x={CAB_X} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={10}
        fill="#1e3a5f" stroke="#152b47" strokeWidth={2} />
      {/* Front bumper / valance */}
      <rect x={CAB_X + 4} y={CAB_TOP} width={CAB_W - 8} height={10} rx={5}
        fill="#2d5282" />
      {/* Headlights — wide amber strips at front corners */}
      <rect x={CAB_X + 4} y={CAB_TOP + 1} width={26} height={9} rx={4}
        fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
      <rect x={CAB_X + CAB_W - 30} y={CAB_TOP + 1} width={26} height={9} rx={4}
        fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
      {/* Grille (horizontal bar + vertical slats) */}
      <rect x={CAB_X + 34} y={CAB_TOP + 2} width={CAB_W - 68} height={8} rx={2}
        fill="#0f1f35" />
      {[0, 1, 2].map(i => (
        <line key={i}
          x1={CAB_X + 40 + i * 22} y1={CAB_TOP + 2}
          x2={CAB_X + 40 + i * 22} y2={CAB_TOP + 10}
          stroke="#2d5282" strokeWidth={2} />
      ))}
      {/* Windshield */}
      <rect x={CAB_X + 12} y={CAB_TOP + 14} width={CAB_W - 24} height={CAB_H - 26} rx={6}
        fill="#7ec8e3" opacity={0.5} stroke="#56adc7" strokeWidth={0.8} />
      {/* Windshield glare */}
      <ellipse cx={CX - 8} cy={CAB_TOP + 21} rx={24} ry={3.5}
        fill="white" opacity={0.35} />
      {/* Dashboard strip */}
      <rect x={CAB_X + 12} y={CAB_TOP + CAB_H - 14} width={CAB_W - 24} height={5} rx={2}
        fill="#0f1f35" opacity={0.45} />
      {/* Side mirrors — small stubby rectangles, NOT tapered paths */}
      <rect x={CAB_X - 15} y={CAB_TOP + 20} width={14} height={22} rx={3}
        fill="#2d5282" stroke="#152b47" strokeWidth={1} />
      <rect x={CAB_X - 14} y={CAB_TOP + 22} width={12} height={10} rx={2}
        fill="#90cdf4" opacity={0.55} />
      <rect x={CAB_X + CAB_W + 1} y={CAB_TOP + 20} width={14} height={22} rx={3}
        fill="#2d5282" stroke="#152b47" strokeWidth={1} />
      <rect x={CAB_X + CAB_W + 2} y={CAB_TOP + 22} width={12} height={10} rx={2}
        fill="#90cdf4" opacity={0.55} />

      {/* ── TRUCK BODY ── */}
      <rect x={BODY_X} y={BODY_TOP} width={BODY_W} height={BODY_BOT - BODY_TOP} rx={4}
        fill="#dde5f8" stroke="#9daae8" strokeWidth={1.5} />
      {/* Chassis side rails */}
      <rect x={BODY_X} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
      <rect x={BODY_X + BODY_W - 9} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
      {/* Cross-member panel dividers */}
      {Array.from({ length: rows - 1 }).map((_, ri) => {
        const y = FIRST_AXY + ri * ROW_H + ROW_H / 2;
        return (
          <line key={ri}
            x1={BODY_X + 9} y1={y} x2={BODY_X + BODY_W - 9} y2={y}
            stroke="#9daae8" strokeWidth={1} strokeDasharray="7,5" />
        );
      })}

      {/* ── AXLES ── */}
      {Array.from({ length: rows }).map((_, r) => {
        const y = FIRST_AXY + r * ROW_H;
        return (
          <g key={r}>
            <line x1={TL_X + TW} y1={y} x2={TR_X} y2={y}
              stroke="#4a5568" strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={TL_X + TW} cy={y} r={4} fill="#4a5568" />
            <circle cx={TR_X} cy={y} r={4} fill="#4a5568" />
          </g>
        );
      })}

      {/* ── TYRES ── */}
      {main.map((tyre, i) => {
        const r = Math.floor(i / 2);
        const isL = i % 2 === 0;
        const yC = FIRST_AXY + r * ROW_H;
        const x = isL ? TL_X : TR_X;
        const h = calcHealth(tyre);
        const { color, bg } = healthColor(h);
        const sel = selectedPos === tyre.position;
        const barH = Math.max(0, (TH - 14) * h / 100);
        return (
          <g key={tyre.position} onClick={() => onSelect(tyre)} style={{ cursor: "pointer" }}>
            {/* Shadow */}
            <rect x={x + 2} y={yC - TH / 2 + 2} width={TW} height={TH} rx={5}
              fill="rgba(0,0,0,0.16)" />
            {/* Outer tyre (dark rubber) */}
            <rect x={x} y={yC - TH / 2} width={TW} height={TH} rx={5}
              fill="#1a202c" stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.5} />
            {/* Tread grooves */}
            <line x1={x + 2} y1={yC - 13} x2={x + TW - 2} y2={yC - 13}
              stroke="#2d3748" strokeWidth={1.5} />
            <line x1={x + 2} y1={yC + 13} x2={x + TW - 2} y2={yC + 13}
              stroke="#2d3748" strokeWidth={1.5} />
            {/* Rim */}
            <rect x={x + 4} y={yC - TH / 2 + 6} width={TW - 8} height={TH - 12} rx={3}
              fill={bg} />
            {/* Health fill bar */}
            <rect x={x + 6} y={yC + TH / 2 - 8 - barH} width={TW - 12} height={barH} rx={2}
              fill={color} opacity={0.8} />
            {/* Hub bolt */}
            <circle cx={x + TW / 2} cy={yC} r={3} fill={color} />
            {/* Selection ring */}
            {sel && (
              <rect x={x - 3} y={yC - TH / 2 - 3} width={TW + 6} height={TH + 6} rx={8}
                fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />
            )}
            {/* Labels */}
            {isL ? (
              <>
                <text x={TL_X - 5} y={yC - 7} textAnchor="end" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</text>
                <text x={TL_X - 5} y={yC + 6} textAnchor="end" fontSize={10} fontWeight="700" fill={color}>{h}%</text>
              </>
            ) : (
              <>
                <text x={TR_X + TW + 5} y={yC - 7} textAnchor="start" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</text>
                <text x={TR_X + TW + 5} y={yC + 6} textAnchor="start" fontSize={10} fontWeight="700" fill={color}>{h}%</text>
              </>
            )}
          </g>
        );
      })}

      {/* ── SPARE ── */}
      {spare && (() => {
        const cy = BODY_BOT + 46;
        const h = calcHealth(spare);
        const { color, bg } = healthColor(h);
        const sel = selectedPos === "Spare";
        return (
          <g onClick={() => onSelect(spare)} style={{ cursor: "pointer" }}>
            <circle cx={CX + 2} cy={cy + 2} r={22} fill="rgba(0,0,0,0.12)" />
            <circle cx={CX} cy={cy} r={21} fill="#1a202c"
              stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.8} />
            <circle cx={CX} cy={cy} r={13} fill={bg} />
            <circle cx={CX} cy={cy} r={5} fill={color} />
            {sel && <circle cx={CX} cy={cy} r={24} fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />}
            <text x={CX} y={cy + 35} textAnchor="middle" fontSize={9} fontWeight="600" fill="#4a5568">Spare</text>
            <text x={CX} y={cy + 48} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>{h}%</text>
          </g>
        );
      })()}
    </svg>
  );
}
