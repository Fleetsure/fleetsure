import React from "react";
import { View } from "react-native";
import Svg, { Rect, Circle, Line, Text as SvgText, G, Ellipse } from "react-native-svg";
import { TyreUnit, calcHealth, healthColor } from "../utils/tyreCalc";

export default function TruckDiagram({ tyres, selectedPos, onSelect }: {
  tyres: TyreUnit[];
  selectedPos: string | null;
  onSelect: (t: TyreUnit) => void;
}) {
  const main = tyres.filter(t => !t.is_spare);
  const spare = tyres.find(t => t.is_spare);
  const rows = Math.max(1, main.length / 2);

  const W = 300; const CX = W / 2;

  const CAB_W = 152; const CAB_X = CX - CAB_W / 2;
  const CAB_TOP = 16; const CAB_H = 62;

  const BODY_W = 122; const BODY_X = CX - BODY_W / 2;
  const BODY_TOP = CAB_TOP + CAB_H + 4;

  const TW = 22; const TH = 42;
  const TL_X = BODY_X - TW - 5;
  const TR_X = BODY_X + BODY_W + 5;

  const FIRST_AXY = BODY_TOP + 28;
  const ROW_H = 62;

  const BODY_BOT = FIRST_AXY + (rows - 1) * ROW_H + 28;
  const svgH = BODY_BOT + (spare ? 90 : 22);

  return (
    <View style={{ width: "100%", maxWidth: 280, alignSelf: "center" }}>
      <Svg width="100%" height={svgH * (280 / W)} viewBox={`0 0 ${W} ${svgH}`}>

        {/* Cabin roof */}
        <Rect x={CAB_X} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={10} fill="#1e3a5f" stroke="#152b47" strokeWidth={2} />
        <Rect x={CAB_X + 4} y={CAB_TOP} width={CAB_W - 8} height={10} rx={5} fill="#2d5282" />
        <Rect x={CAB_X + 4} y={CAB_TOP + 1} width={26} height={9} rx={4} fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
        <Rect x={CAB_X + CAB_W - 30} y={CAB_TOP + 1} width={26} height={9} rx={4} fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
        <Rect x={CAB_X + 34} y={CAB_TOP + 2} width={CAB_W - 68} height={8} rx={2} fill="#0f1f35" />
        {[0, 1, 2].map(i => (
          <Line key={i} x1={CAB_X + 40 + i * 22} y1={CAB_TOP + 2} x2={CAB_X + 40 + i * 22} y2={CAB_TOP + 10} stroke="#2d5282" strokeWidth={2} />
        ))}
        <Rect x={CAB_X + 12} y={CAB_TOP + 14} width={CAB_W - 24} height={CAB_H - 26} rx={6} fill="#7ec8e3" fillOpacity={0.5} stroke="#56adc7" strokeWidth={0.8} />
        <Ellipse cx={CX - 8} cy={CAB_TOP + 21} rx={24} ry={3.5} fill="white" fillOpacity={0.35} />
        <Rect x={CAB_X + 12} y={CAB_TOP + CAB_H - 14} width={CAB_W - 24} height={5} rx={2} fill="#0f1f35" fillOpacity={0.45} />
        <Rect x={CAB_X - 15} y={CAB_TOP + 20} width={14} height={22} rx={3} fill="#2d5282" stroke="#152b47" strokeWidth={1} />
        <Rect x={CAB_X - 14} y={CAB_TOP + 22} width={12} height={10} rx={2} fill="#90cdf4" fillOpacity={0.55} />
        <Rect x={CAB_X + CAB_W + 1} y={CAB_TOP + 20} width={14} height={22} rx={3} fill="#2d5282" stroke="#152b47" strokeWidth={1} />
        <Rect x={CAB_X + CAB_W + 2} y={CAB_TOP + 22} width={12} height={10} rx={2} fill="#90cdf4" fillOpacity={0.55} />

        {/* Body */}
        <Rect x={BODY_X} y={BODY_TOP} width={BODY_W} height={BODY_BOT - BODY_TOP} rx={4} fill="#dde5f8" stroke="#9daae8" strokeWidth={1.5} />
        <Rect x={BODY_X} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
        <Rect x={BODY_X + BODY_W - 9} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
        {Array.from({ length: rows - 1 }).map((_, ri) => {
          const y = FIRST_AXY + ri * ROW_H + ROW_H / 2;
          return (
            <Line key={ri} x1={BODY_X + 9} y1={y} x2={BODY_X + BODY_W - 9} y2={y} stroke="#9daae8" strokeWidth={1} strokeDasharray="7,5" />
          );
        })}

        {/* Axles */}
        {Array.from({ length: rows }).map((_, r) => {
          const y = FIRST_AXY + r * ROW_H;
          return (
            <G key={r}>
              <Line x1={TL_X + TW} y1={y} x2={TR_X} y2={y} stroke="#4a5568" strokeWidth={3.5} strokeLinecap="round" />
              <Circle cx={TL_X + TW} cy={y} r={4} fill="#4a5568" />
              <Circle cx={TR_X} cy={y} r={4} fill="#4a5568" />
            </G>
          );
        })}

        {/* Tyres */}
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
            <G key={tyre.position} onPress={() => onSelect(tyre)}>
              <Rect x={x + 2} y={yC - TH / 2 + 2} width={TW} height={TH} rx={5} fill="rgba(0,0,0,0.16)" />
              <Rect x={x} y={yC - TH / 2} width={TW} height={TH} rx={5} fill="#1a202c" stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.5} />
              <Line x1={x + 2} y1={yC - 13} x2={x + TW - 2} y2={yC - 13} stroke="#2d3748" strokeWidth={1.5} />
              <Line x1={x + 2} y1={yC + 13} x2={x + TW - 2} y2={yC + 13} stroke="#2d3748" strokeWidth={1.5} />
              <Rect x={x + 4} y={yC - TH / 2 + 6} width={TW - 8} height={TH - 12} rx={3} fill={bg} />
              <Rect x={x + 6} y={yC + TH / 2 - 8 - barH} width={TW - 12} height={barH} rx={2} fill={color} fillOpacity={0.8} />
              <Circle cx={x + TW / 2} cy={yC} r={3} fill={color} />
              {sel && (
                <Rect x={x - 3} y={yC - TH / 2 - 3} width={TW + 6} height={TH + 6} rx={8} fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />
              )}
              {isL ? (
                <>
                  <SvgText x={TL_X - 5} y={yC - 7} textAnchor="end" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</SvgText>
                  <SvgText x={TL_X - 5} y={yC + 6} textAnchor="end" fontSize={10} fontWeight="700" fill={color}>{h}%</SvgText>
                </>
              ) : (
                <>
                  <SvgText x={TR_X + TW + 5} y={yC - 7} textAnchor="start" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</SvgText>
                  <SvgText x={TR_X + TW + 5} y={yC + 6} textAnchor="start" fontSize={10} fontWeight="700" fill={color}>{h}%</SvgText>
                </>
              )}
            </G>
          );
        })}

        {/* Spare */}
        {spare && (() => {
          const cy = BODY_BOT + 46;
          const h = calcHealth(spare);
          const { color, bg } = healthColor(h);
          const sel = selectedPos === "Spare";
          return (
            <G onPress={() => onSelect(spare)}>
              <Circle cx={CX + 2} cy={cy + 2} r={22} fill="rgba(0,0,0,0.12)" />
              <Circle cx={CX} cy={cy} r={21} fill="#1a202c" stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.8} />
              <Circle cx={CX} cy={cy} r={13} fill={bg} />
              <Circle cx={CX} cy={cy} r={5} fill={color} />
              {sel && <Circle cx={CX} cy={cy} r={24} fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />}
              <SvgText x={CX} y={cy + 35} textAnchor="middle" fontSize={9} fontWeight="600" fill="#4a5568">Spare</SvgText>
              <SvgText x={CX} y={cy + 48} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>{h}%</SvgText>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}
