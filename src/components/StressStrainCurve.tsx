import React, { useRef, useMemo, useState, useCallback } from 'react';
import { 
  SimulationState, 
  PhysicsDerivedValues, 
  MaterialPreset 
} from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { MATERIAL_PRESETS } from '../constants/materials';
import { TrendingUp, Activity, MoveHorizontal, Sparkles } from 'lucide-react';

interface StressStrainCurveProps {
  state: SimulationState;
  physics: PhysicsDerivedValues;
  onDragStrainChange: (strain: number) => void;
  onDragEnd: () => void;
}

export const StressStrainCurve: React.FC<StressStrainCurveProps> = ({
  state,
  physics,
  onDragStrainChange,
  onDragEnd
}) => {
  const t = TRANSLATIONS[state.language];
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDraggingGraph, setIsDraggingGraph] = useState(false);

  const material = useMemo(() => {
    return MATERIAL_PRESETS.find(p => p.id === state.selectedMaterialId) || MATERIAL_PRESETS[0];
  }, [state.selectedMaterialId]);

  // SVG coordinate dimensions
  const svgWidth = 640;
  const svgHeight = 185;

  // Plot margins
  const marginLeft = 65;
  const marginRight = 40;
  const marginTop = 22;
  const marginBottom = 34;

  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = svgHeight - marginTop - marginBottom;

  // Dynamic axis range:
  // Strain range: -0.15 (compression) to +0.35 (tension)
  const minStrain = -0.15;
  const maxStrain = 0.35;
  const strainSpan = maxStrain - minStrain;

  // Origin height for zero stress (72% from top gives headroom for positive tension)
  const originY = marginTop + plotHeight * 0.72;

  // Stress range based on material Young's modulus & maximum expected strain
  const maxStressPa = Math.max(1e6, material.youngsModulus * maxStrain * 0.7);
  const minStressPa = -maxStressPa * 0.45;
  const stressSpan = maxStressPa - minStressPa;

  // Coordinate transformation functions
  const getX = useCallback((strain: number) => {
    const fraction = (strain - minStrain) / strainSpan;
    return marginLeft + fraction * plotWidth;
  }, [minStrain, strainSpan, marginLeft, plotWidth]);

  const getY = useCallback((stressPa: number) => {
    // Stress 0 is at originY, positive stress goes up (-), negative goes down (+)
    const maxUpwardPx = originY - marginTop;
    const fraction = stressPa / maxStressPa;
    return originY - fraction * maxUpwardPx * 0.88;
  }, [originY, marginTop, maxStressPa]);

  // Origin X position: precisely where strain = 0 (getX(0))
  const originX = getX(0);

  // Current operating point
  const currentStrain = physics.longitudinalStrain || 0;
  const currentStress = physics.stress || 0;

  const pointX = getX(currentStrain);
  const pointY = getY(currentStress);

  // Hooke's Line endpoints: from minStrain to maxStrain passing through (originX, originY)
  const lineStartStrain = minStrain * 0.85;
  const lineStartStress = material.youngsModulus * lineStartStrain;
  const lineEndStrain = maxStrain * 0.85;
  const lineEndStress = material.youngsModulus * lineEndStrain;

  const lineStartX = getX(lineStartStrain);
  const lineStartY = getY(lineStartStress);
  const lineEndX = getX(lineEndStrain);
  const lineEndY = getY(lineEndStress);

  // Shaded polygon under the curve (Area = Energy Density u)
  // Polygon vertices: Origin (0,0) -> Base on axis (currentStrain, 0) -> Peak on curve (currentStrain, currentStress)
  const polygonPoints = useMemo(() => {
    const pOriginX = originX;
    const pOriginY = originY;
    const pBaseX = pointX;
    const pBaseY = originY;
    const pPeakX = pointX;
    const pPeakY = pointY;

    return `${pOriginX},${pOriginY} ${pBaseX},${pBaseY} ${pPeakX},${pPeakY}`;
  }, [originX, originY, pointX, pointY]);

  // Pointer dragging along the curve to adjust strain
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingGraph(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateStrainFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingGraph) return;
    updateStrainFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingGraph) {
      setIsDraggingGraph(false);
      onDragEnd();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const updateStrainFromPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgX = clientX * scaleX;

    // Invert getX
    const fraction = (svgX - marginLeft) / plotWidth;
    const targetStrain = minStrain + fraction * strainSpan;
    const clampedStrain = Math.max(-0.25, Math.min(0.40, targetStrain));
    onDragStrainChange(clampedStrain);
  };

  // Formatted Energy Density string
  const uFormatted = useMemo(() => {
    const u = physics.energyDensity || 0;
    if (u >= 1e6) return `${(u / 1e6).toFixed(2)} MJ/m³`;
    if (u >= 1e3) return `${(u / 1e3).toFixed(2)} kJ/m³`;
    return `${u.toFixed(1)} J/m³`;
  }, [physics.energyDensity]);

  // Formatted Young's Modulus string
  const yFormatted = useMemo(() => {
    const yGPa = material.youngsModulus / 1e9;
    return yGPa >= 1 ? `${yGPa.toFixed(0)} GPa` : `${yGPa.toFixed(2)} GPa`;
  }, [material.youngsModulus]);

  // Is tension or compression
  const isTension = currentStrain >= 0;

  return (
    <div className="bg-white border-t border-sky-200 p-2.5 sm:p-3 shrink-0 select-none shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-none">
                {t.curveTitle}
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-300 font-semibold hidden sm:inline-block">
                u = ½ × σ × ε
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 hidden md:block">
              {t.curveFormula}
            </p>
          </div>
        </div>

        {/* Live Badges: Area (u) & Slope (Y) */}
        <div className="flex items-center gap-2">
          {/* Slope Badge */}
          <div className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-mono flex items-center gap-1">
            <span className="text-indigo-600 font-semibold">{state.language === 'bn' ? 'ঢাল (Slope):' : 'Slope:'}</span>
            <span className="font-bold">{yFormatted}</span>
          </div>

          {/* Shaded Area = Energy Density Badge */}
          <div className={`px-2.5 py-0.5 rounded-md border text-[11px] font-mono flex items-center gap-1.5 shadow-2xs ${
            isTension 
              ? 'bg-orange-50 border-orange-300 text-orange-950' 
              : 'bg-cyan-50 border-cyan-300 text-cyan-900'
          }`}>
            <span className="font-semibold text-orange-800">{state.language === 'bn' ? 'ক্ষেত্রফল u:' : 'Area u:'}</span>
            <span className="font-bold text-orange-600">{uFormatted}</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Stress-Strain Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50 border border-sky-100">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={`w-full h-auto block select-none ${isDraggingGraph ? 'cursor-grabbing' : 'cursor-pointer'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            {/* Shaded Area Gradient (Tension = Deep Rich Orange) */}
            <linearGradient id="areaGradTension" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ffedd5" stopOpacity="0.30" />
            </linearGradient>

            {/* Shaded Area Gradient (Compression = Cyan) */}
            <linearGradient id="areaGradCompression" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.55" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Coordinate Grid Lines */}
          {/* Vertical grid lines (Strain %) */}
          {[-0.1, 0, 0.1, 0.2, 0.3].map((val) => {
            const gx = getX(val);
            const isZero = Math.abs(val) < 0.001;
            return (
              <g key={`x-${val}`}>
                <line
                  x1={gx}
                  y1={marginTop}
                  x2={gx}
                  y2={svgHeight - marginBottom}
                  stroke={isZero ? '#94a3b8' : '#e2e8f0'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? undefined : '2,2'}
                />
                <text
                  x={gx}
                  y={svgHeight - marginBottom + 13}
                  fontSize="9"
                  fontFamily="'Fira Code', monospace"
                  textAnchor="middle"
                  fill="#64748b"
                >
                  {(val * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Horizontal grid lines (Stress) */}
          {[0.8, 0.4, 0, -0.4].map((frac) => {
            const gy = getY(maxStressPa * frac);
            const isZero = Math.abs(frac) < 0.001;
            const stressValMPa = ((maxStressPa * frac) / 1e6).toFixed(1);
            return (
              <g key={`y-${frac}`}>
                <line
                  x1={marginLeft}
                  y1={gy}
                  x2={svgWidth - marginRight}
                  y2={gy}
                  stroke={isZero ? '#94a3b8' : '#e2e8f0'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? undefined : '2,2'}
                />
                <text
                  x={marginLeft - 8}
                  y={gy + 3}
                  fontSize="9"
                  fontFamily="'Fira Code', monospace"
                  textAnchor="end"
                  fill="#64748b"
                >
                  {isZero ? '0' : `${stressValMPa}M`}
                </text>
              </g>
            );
          })}

          {/* Axes Titles */}
          {/* X Axis Label */}
          <text
            x={svgWidth - marginRight - 10}
            y={originY - 8}
            fontSize="10"
            fontWeight="bold"
            fill="#475569"
            textAnchor="end"
          >
            {state.language === 'bn' ? 'বিকৃতি ε (Strain)' : 'Strain ε (%)'} →
          </text>

          {/* Y Axis Label */}
          <text
            x={originX + 8}
            y={marginTop + 10}
            fontSize="10"
            fontWeight="bold"
            fill="#475569"
            textAnchor="start"
          >
            ↑ {state.language === 'bn' ? 'পীড়ন σ (Stress, MPa)' : 'Stress σ (MPa)'}
          </text>

          {/* 1. Shaded Energy Density Area (Area under the curve = u) */}
          {Math.abs(currentStrain) > 0.001 && (
            <polygon
              points={polygonPoints}
              fill={isTension ? 'url(#areaGradTension)' : 'url(#areaGradCompression)'}
              stroke={isTension ? '#ea580c' : '#0891b2'}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          )}

          {/* 2. Hookean Proportional Straight Line (σ = Y · ε) */}
          <line
            x1={lineStartX}
            y1={lineStartY}
            x2={lineEndX}
            y2={lineEndY}
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 3. Dashed Projection Lines to Axes */}
          {Math.abs(currentStrain) > 0.001 && (
            <>
              {/* Vertical line down to Strain Axis */}
              <line
                x1={pointX}
                y1={originY}
                x2={pointX}
                y2={pointY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Horizontal line across to Stress Axis */}
              <line
                x1={originX}
                y1={pointY}
                x2={pointX}
                y2={pointY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </>
          )}

          {/* 4. Active Operating Point Dot on the Curve */}
          <g transform={`translate(${pointX}, ${pointY})`}>
            {/* Subtle pulse halo */}
            <circle
              r="8"
              fill={isTension ? 'rgba(234, 88, 12, 0.35)' : 'rgba(6, 182, 212, 0.25)'}
              className="animate-ping"
            />
            {/* Main point */}
            <circle
              r="5.5"
              fill={isTension ? '#ea580c' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#glowEffect)"
            />

            {/* Value Callout Box above the Dot */}
            <g transform="translate(0, -14)">
              <rect
                x="-36"
                y="-13"
                width="72"
                height="15"
                rx="4"
                fill="#1e293b"
                opacity="0.9"
              />
              <text
                x="0"
                y="-3"
                fontSize="8.5"
                fontFamily="'Fira Code', monospace"
                fontWeight="bold"
                fill="#f8fafc"
                textAnchor="middle"
              >
                {((currentStress / 1e6)).toFixed(1)}M, {(currentStrain * 100).toFixed(1)}%
              </text>
            </g>
          </g>

          {/* Area Label Inside the Shaded Triangle */}
          {Math.abs(currentStrain) > 0.04 && (
            <text
              x={(originX + pointX) / 2 + (isTension ? 12 : -12)}
              y={(originY + pointY) / 2 + (isTension ? 12 : -8)}
              fontSize="10"
              fontFamily="'Fira Code', monospace"
              fontWeight="bold"
              fill={isTension ? '#7c2d12' : '#0369a1'}
              textAnchor={isTension ? 'start' : 'end'}
            >
              Area = u
            </text>
          )}
        </svg>

        {/* Small Drag Hint at Bottom Center */}
        <div className="absolute bottom-1 right-2 pointer-events-none flex items-center gap-1 text-[9.5px] font-medium text-slate-400">
          <MoveHorizontal className="w-3 h-3 text-sky-500" />
          <span>{t.dragCurveHint}</span>
        </div>
      </div>
    </div>
  );
};
