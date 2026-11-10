import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  SimulationState, 
  PhysicsDerivedValues, 
  MaterialPreset 
} from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { MATERIAL_PRESETS } from '../constants/materials';
import { Layers } from 'lucide-react';

interface RodCanvasStageProps {
  state: SimulationState;
  physics: PhysicsDerivedValues;
  onDragStrainChange: (strain: number) => void;
  onDiameterChange: (newDiameter: number) => void;
  onDragEnd: () => void;
  onOscillationProgress?: (currentForce: number) => void;
  onOscillationFinished: () => void;
}

type DragMode = 'none' | 'length' | 'diameter';

export const RodCanvasStage: React.FC<RodCanvasStageProps> = ({
  state,
  physics,
  onDragStrainChange,
  onDiameterChange,
  onDragEnd,
  onOscillationProgress,
  onOscillationFinished
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction tracking in refs to prevent render loop
  const dragModeRef = useRef<DragMode>('none');
  const [activeDragMode, setActiveDragMode] = useState<DragMode>('none');
  const [hoverCursor, setHoverCursor] = useState<string>('default');

  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const initialStrainOnDragRef = useRef(0);
  const initialDiameterOnDragRef = useRef(0);
  const clampScreenXRef = useRef(320);
  const wireGeometryRef = useRef({
    wallX: 90,
    rightClampX: 320,
    centerY: 240,
    radius: 30,
    diamDimX: 400
  });

  const t = TRANSLATIONS[state.language];
  const material = MATERIAL_PRESETS.find(p => p.id === state.selectedMaterialId) || MATERIAL_PRESETS[0];

  // Latest props ref
  const latestPropsRef = useRef({
    state,
    physics,
    material,
    t,
  });

  useEffect(() => {
    latestPropsRef.current = {
      state,
      physics,
      material,
      t,
    };
  }, [state, physics, material, t]);

  // Oscillation state ref
  const oscRef = useRef({
    startTime: 0,
    active: false,
    initialAmplitude: 0,
    initialForce: 0,
    decay: 0.92, // Slow gentle damping envelope (takes ~3.6s)
    omega: 4.2,  // ~0.67 Hz slow, elegant, clearly visible harmonic cycle
    lastProgressTime: 0,
  });

  useEffect(() => {
    if (state.isOscillating && !oscRef.current.active) {
      oscRef.current.active = true;
      oscRef.current.startTime = performance.now();
      oscRef.current.initialAmplitude = physics.longitudinalStrain || 0.05;
      oscRef.current.initialForce = state.appliedForce || 800;
      oscRef.current.lastProgressTime = performance.now();
      oscRef.current.decay = 0.92;
      oscRef.current.omega = 4.2;
    }
  }, [state.isOscillating, physics.longitudinalStrain, state.appliedForce]);

  // 60 FPS Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { 
        state: curState, 
        physics: curPhysics, 
        material: curMat, 
        t: curT 
      } = latestPropsRef.current;

      const dpr = window.devicePixelRatio || 1;
      const rect = container ? container.getBoundingClientRect() : null;
      const width = Math.max(340, Math.floor(rect?.width || canvas.clientWidth || 640));
      const height = Math.max(360, Math.floor(rect?.height || canvas.clientHeight || 460));

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      try {
        // Soft gradient laboratory background
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#f1f5f9');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle engineering grid
        drawGrid(ctx, width, height);

        // Slow, elegant damped harmonic restoration computation
        let currentVisualStrain = curPhysics.longitudinalStrain || 0;
        if (oscRef.current.active) {
          const now = performance.now();
          const elapsed = (now - oscRef.current.startTime) / 1000;
          
          // Damped harmonic motion: x(t) = A * e^(-gamma * t) * cos(omega * t)
          const damping = Math.exp(-oscRef.current.decay * elapsed);
          const oscillation = Math.cos(oscRef.current.omega * elapsed);
          const currentAmp = oscRef.current.initialAmplitude * damping * oscillation;
          currentVisualStrain = currentAmp;

          // Throttled progress update to App every 50ms so Energy Tank drains smoothly in sync!
          if (now - oscRef.current.lastProgressTime > 50 && onOscillationProgress) {
            oscRef.current.lastProgressTime = now;
            const currentDynamicForce = oscRef.current.initialForce * damping * oscillation;
            onOscillationProgress(currentDynamicForce);
          }

          if (elapsed > 3.6 || (damping < 0.03 && Math.abs(currentAmp) < 0.0005)) {
            oscRef.current.active = false;
            onOscillationFinished();
          }
        }

        // Strain magnification for visual clarity
        const scaleMultiplier = curState.visualStrainScale || 5;
        const visualDeltaL = currentVisualStrain * scaleMultiplier;
        const visualLateralStrain = -curState.poissonRatio * visualDeltaL;

        // Coordinates
        const wallX = 90;
        const centerY = height / 2;
        const baseRodLengthPx = Math.min(width * 0.46, 380);

        // Dimensions
        const currentRodLengthPx = Math.max(70, Math.min(width - 170, baseRodLengthPx * (1 + visualDeltaL * 0.65)));
        const baseDiameterPx = Math.min(height * 0.32, Math.max(32, ((curState.initialDiameter || 0.04) / 0.04) * 55));
        const currentDiameterPx = Math.max(12, Math.min(height * 0.72, baseDiameterPx * (1 + visualLateralStrain * 0.65)));
        const currentRadiusPx = currentDiameterPx / 2;

        const rightClampX = wallX + currentRodLengthPx;
        const diamDimX = rightClampX + 80;

        // Cache positions for pointer drag hit tests
        clampScreenXRef.current = rightClampX;
        wireGeometryRef.current = {
          wallX,
          rightClampX,
          centerY,
          radius: currentRadiusPx,
          diamDimX
        };

        // 1. Draw Immovable Wall on Left
        drawRigidWall(ctx, wallX, centerY, height);

        // 2. Reference Baseline Guidelines
        drawReferenceGuides(ctx, wallX, rightClampX, centerY, baseRodLengthPx, baseDiameterPx, width);

        // 3. Draw Clean, Smooth Cylindrical Wire (NO rings or grid lines!)
        drawSmoothCylindricalWire(
          ctx, 
          wallX, 
          rightClampX, 
          centerY, 
          currentRadiusPx, 
          curMat, 
          curState.poissonRatio, 
          visualDeltaL
        );

        // 4. Draw Left Mounting Bracket
        drawLeftClampBracket(ctx, wallX, centerY, currentRadiusPx);

        // 5. Draw Right Tensile Grip / Sliding Clamp with Length Drag Handle
        drawRightSlidingGrip(
          ctx, 
          rightClampX, 
          centerY, 
          currentRadiusPx, 
          curState.appliedForce, 
          dragModeRef.current === 'length',
          curT
        );

        // 6. Draw Interactive Breadth / Diameter Drag Handles
        drawBreadthDragHandles(
          ctx,
          wallX,
          rightClampX,
          centerY,
          currentRadiusPx,
          dragModeRef.current === 'diameter',
          curState.language
        );

        // 7. Dimension Callipers & Overlays
        drawDimensionOverlays(
          ctx, 
          wallX, 
          rightClampX, 
          centerY, 
          currentRadiusPx, 
          diamDimX,
          curPhysics, 
          curState, 
          curT
        );
      } catch (e) {
        console.error("Canvas draw error", e);
      } finally {
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onOscillationFinished]);

  // Pointer Movement for Dynamic Cursor Feedback
  const handlePointerHover = (e: React.PointerEvent) => {
    if (dragModeRef.current !== 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { wallX, rightClampX, centerY, radius, diamDimX } = wireGeometryRef.current;

    // Check near right clamp (Length drag)
    if (x >= rightClampX - 25 && x <= rightClampX + 60 && Math.abs(y - centerY) <= radius + 35) {
      setHoverCursor('ew-resize');
      return;
    }

    // Check near top or bottom wire edge (Breadth drag)
    const isOverWireX = x >= wallX + 10 && x <= rightClampX - 10;
    const nearTopEdge = Math.abs(y - (centerY - radius)) <= 18;
    const nearBottomEdge = Math.abs(y - (centerY + radius)) <= 18;
    const nearCaliper = Math.abs(x - diamDimX) <= 25 && Math.abs(y - centerY) <= radius + 35;

    if ((isOverWireX && (nearTopEdge || nearBottomEdge)) || nearCaliper) {
      setHoverCursor('ns-resize');
      return;
    }

    setHoverCursor('default');
  };

  // Pointer Down for Starting Dual Drag (Length OR Breadth)
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { wallX, rightClampX, centerY, radius, diamDimX } = wireGeometryRef.current;

    // 1. Length Drag: Hit Right Clamp
    if (x >= rightClampX - 30 && x <= rightClampX + 70 && Math.abs(y - centerY) <= radius + 40) {
      dragModeRef.current = 'length';
      setActiveDragMode('length');
      dragStartXRef.current = e.clientX;
      initialStrainOnDragRef.current = physics.longitudinalStrain || 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 2. Breadth / Diameter Drag: Hit Top Handle, Bottom Handle, Wire Edges, or Caliper
    const isOverWireX = x >= wallX && x <= rightClampX + 20;
    const nearTopEdge = Math.abs(y - (centerY - radius)) <= 24;
    const nearBottomEdge = Math.abs(y - (centerY + radius)) <= 24;
    const nearCaliper = Math.abs(x - diamDimX) <= 30 && Math.abs(y - centerY) <= radius + 40;

    if ((isOverWireX && (nearTopEdge || nearBottomEdge)) || nearCaliper) {
      dragModeRef.current = 'diameter';
      setActiveDragMode('diameter');
      dragStartYRef.current = e.clientY;
      initialDiameterOnDragRef.current = state.initialDiameter;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
  };

  // Pointer Move for Length or Breadth Drag
  const handlePointerMove = (e: React.PointerEvent) => {
    handlePointerHover(e);

    const mode = dragModeRef.current;
    if (mode === 'none' || !canvasRef.current) return;

    if (mode === 'length') {
      const deltaPx = e.clientX - dragStartXRef.current;
      const canvas = canvasRef.current;
      const baseLengthPx = Math.min(canvas.clientWidth * 0.46, 380);
      const scale = state.visualStrainScale || 5;

      const strainDelta = (deltaPx / Math.max(100, baseLengthPx)) / (scale * 0.65);
      const newStrain = Math.max(-0.35, Math.min(0.55, initialStrainOnDragRef.current + strainDelta));
      onDragStrainChange(newStrain);
    } else if (mode === 'diameter') {
      // Dragging vertically: moving further from center increases diameter, moving closer decreases
      const deltaY = Math.abs(e.clientY - dragStartYRef.current);
      const direction = (e.clientY < dragStartYRef.current) ? 1 : -1; // drag up vs down
      
      // Calculate delta diameter
      const diamDeltaMeters = (direction * (e.clientY < wireGeometryRef.current.centerY ? -deltaY : deltaY)) * 0.0003;
      const newDiam = Math.max(0.01, Math.min(0.10, initialDiameterOnDragRef.current + diamDeltaMeters));
      onDiameterChange(newDiam);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragModeRef.current !== 'none') {
      dragModeRef.current = 'none';
      setActiveDragMode('none');
      onDragEnd();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 w-full min-h-[280px] h-full flex flex-col bg-slate-50 select-none overflow-hidden"
    >
      {/* Top stage badges */}
      <div className="absolute top-3 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white/95 text-slate-700 shadow-xs border border-sky-200">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>{state.language === 'bn' ? material.nameBn : material.nameEn}</span>
        </span>

        {/* Dynamic Deformation Badge */}
        {state.appliedForce > 20 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {state.poissonRatio > 0 ? t.lateralContraction : t.lateralExpansion}
          </span>
        )}
        {state.appliedForce < -20 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            {t.compression}
          </span>
        )}
        {Math.abs(state.appliedForce) <= 20 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            {t.equilibrium}
          </span>
        )}
      </div>

      {/* Floating Canvas Drag Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-white/95 backdrop-blur-xs px-4 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm border border-sky-200 flex items-center gap-3">
        <span className="flex items-center gap-1 text-sky-700">
          <span className="font-bold">↔</span>
          <span>{state.language === 'bn' ? 'টেনে দৈর্ঘ্য পরিবর্তন' : 'Drag Length'}</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1 text-indigo-700">
          <span className="font-bold">↕</span>
          <span>{state.language === 'bn' ? 'টেনে ব্যাস/প্রস্থ পরিবর্তন' : 'Drag Breadth'}</span>
        </span>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '260px',
          cursor: activeDragMode === 'length' 
            ? 'ew-resize' 
            : activeDragMode === 'diameter' 
            ? 'ns-resize' 
            : hoverCursor 
        }}
        className="w-full h-full block touch-none"
      />
    </div>
  );
};

// Canvas Drawing Helper Functions

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const gridSize = 30;

  ctx.beginPath();
  for (let x = 0; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Center horizontal line
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.restore();
}

function drawRigidWall(ctx: CanvasRenderingContext2D, wallX: number, centerY: number, canvasHeight: number) {
  ctx.save();
  const wallWidth = 28;
  const topY = centerY - 150;
  const bottomY = centerY + 150;

  const grad = ctx.createLinearGradient(wallX - wallWidth, 0, wallX, 0);
  grad.addColorStop(0, '#64748b');
  grad.addColorStop(0.7, '#94a3b8');
  grad.addColorStop(1, '#475569');

  ctx.fillStyle = grad;
  ctx.fillRect(wallX - wallWidth, topY, wallWidth, bottomY - topY);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(wallX - wallWidth, topY, wallWidth, bottomY - topY);

  // Diagonal hash lines
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = topY; y < bottomY; y += 14) {
    ctx.moveTo(wallX - wallWidth, y + 14);
    ctx.lineTo(wallX - 4, y);
  }
  ctx.stroke();

  // Mounting bolts
  ctx.fillStyle = '#1e293b';
  [topY + 20, topY + 60, bottomY - 60, bottomY - 20].forEach(boltY => {
    ctx.beginPath();
    ctx.arc(wallX - 14, boltY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.restore();
}

function drawReferenceGuides(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  rightClampX: number,
  centerY: number,
  baseLengthPx: number,
  baseDiameterPx: number,
  canvasWidth: number
) {
  ctx.save();
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.2;

  const baseRightX = wallX + baseLengthPx;
  const baseRadius = baseDiameterPx / 2;

  // Baseline right clamp position
  ctx.beginPath();
  ctx.moveTo(baseRightX, centerY - baseRadius - 35);
  ctx.lineTo(baseRightX, centerY + baseRadius + 35);
  ctx.stroke();

  // Baseline diameter reference
  ctx.beginPath();
  ctx.moveTo(wallX, centerY - baseRadius);
  ctx.lineTo(wallX + Math.max(rightClampX - wallX + 50, baseLengthPx + 50), centerY - baseRadius);
  ctx.moveTo(wallX, centerY + baseRadius);
  ctx.lineTo(wallX + Math.max(rightClampX - wallX + 50, baseLengthPx + 50), centerY + baseRadius);
  ctx.stroke();

  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('L₀ reference', baseRightX - 32, centerY + baseRadius + 48);

  ctx.restore();
}

/**
 * Renders a pristine, smooth cylindrical wire with realistic 3D lighting.
 * Notice: ALL internal rings and grid lines have been removed as requested!
 */
function drawSmoothCylindricalWire(
  ctx: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  centerY: number,
  radius: number,
  material: MaterialPreset,
  sigma: number,
  strainRatio: number
) {
  ctx.save();

  const length = Math.max(30, endX - startX);
  const safeRadius = Math.max(6, radius);
  const topY = centerY - safeRadius;
  const bottomY = centerY + safeRadius;
  const rx = Math.max(4, Math.min(safeRadius * 0.35, 20));

  // Cylinder Body Path
  ctx.beginPath();
  ctx.moveTo(startX, topY);
  ctx.lineTo(endX, topY);
  ctx.ellipse(endX, centerY, rx, safeRadius, 0, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(startX, bottomY);
  ctx.closePath();

  // 3D Lighting Specular Gradient
  const bodyGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
  
  if (material.isAuxetic) {
    bodyGrad.addColorStop(0, '#0e7490');
    bodyGrad.addColorStop(0.2, '#38bdf8');
    bodyGrad.addColorStop(0.4, '#e0f2fe');
    bodyGrad.addColorStop(0.7, '#0284c7');
    bodyGrad.addColorStop(1, '#075985');
  } else if (material.id === 'rubber') {
    bodyGrad.addColorStop(0, '#1e293b');
    bodyGrad.addColorStop(0.25, '#475569');
    bodyGrad.addColorStop(0.4, '#94a3b8');
    bodyGrad.addColorStop(0.7, '#334155');
    bodyGrad.addColorStop(1, '#0f172a');
  } else if (material.id === 'cork') {
    bodyGrad.addColorStop(0, '#b45309');
    bodyGrad.addColorStop(0.3, '#f59e0b');
    bodyGrad.addColorStop(0.5, '#fde68a');
    bodyGrad.addColorStop(0.8, '#d97706');
    bodyGrad.addColorStop(1, '#78350f');
  } else {
    // Structural steel / aluminum
    bodyGrad.addColorStop(0, '#64748b');
    bodyGrad.addColorStop(0.2, '#cbd5e1');
    bodyGrad.addColorStop(0.35, '#ffffff'); // bright metallic highlight line
    bodyGrad.addColorStop(0.65, '#94a3b8');
    bodyGrad.addColorStop(1, '#475569');
  }

  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Dynamic Stress Heatmap / Color Overlay under Tension or Compression
  if (Math.abs(strainRatio) > 0.005) {
    ctx.save();
    ctx.clip();
    const stressGrad = ctx.createLinearGradient(startX, 0, endX, 0);
    if (strainRatio > 0) {
      const alpha = Math.min(0.45, Math.abs(strainRatio) * 0.9);
      stressGrad.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.3})`);
      stressGrad.addColorStop(1, `rgba(245, 158, 11, ${alpha})`);
    } else {
      const alpha = Math.min(0.45, Math.abs(strainRatio) * 0.9);
      stressGrad.addColorStop(0, `rgba(59, 130, 246, ${alpha * 0.3})`);
      stressGrad.addColorStop(1, `rgba(6, 182, 212, ${alpha})`);
    }
    ctx.fillStyle = stressGrad;
    ctx.fillRect(startX, topY, length + rx, safeRadius * 2);
    ctx.restore();
  }

  // Smooth Cylinder Edge Outline
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, topY);
  ctx.lineTo(endX, topY);
  ctx.moveTo(startX, bottomY);
  ctx.lineTo(endX, bottomY);
  ctx.stroke();

  // Right Circular Face Ellipse
  ctx.beginPath();
  ctx.ellipse(endX, centerY, rx, safeRadius, 0, 0, Math.PI * 2);
  const endCapGrad = ctx.createRadialGradient(endX, centerY, 2, endX, centerY, safeRadius);
  endCapGrad.addColorStop(0, '#f1f5f9');
  endCapGrad.addColorStop(0.7, '#94a3b8');
  endCapGrad.addColorStop(1, '#475569');
  ctx.fillStyle = endCapGrad;
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center cross on right circular cross section
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(endX, centerY - safeRadius * 0.7);
  ctx.lineTo(endX, centerY + safeRadius * 0.7);
  ctx.moveTo(endX - rx * 0.7, centerY);
  ctx.lineTo(endX + rx * 0.7, centerY);
  ctx.stroke();

  ctx.restore();
}

function drawLeftClampBracket(
  ctx: CanvasRenderingContext2D, 
  wallX: number, 
  centerY: number, 
  radius: number
) {
  ctx.save();
  const bracketW = 16;
  const bracketH = Math.max(radius * 2 + 20, 50);

  const grad = ctx.createLinearGradient(wallX, 0, wallX + bracketW, 0);
  grad.addColorStop(0, '#334155');
  grad.addColorStop(0.5, '#475569');
  grad.addColorStop(1, '#1e293b');

  ctx.fillStyle = grad;
  ctx.fillRect(wallX, centerY - bracketH / 2, bracketW, bracketH);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wallX, centerY - bracketH / 2, bracketW, bracketH);

  // Clamping screws
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(wallX + 8, centerY - bracketH / 2 + 8, 3, 0, Math.PI * 2);
  ctx.arc(wallX + 8, centerY + bracketH / 2 - 8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRightSlidingGrip(
  ctx: CanvasRenderingContext2D,
  clampX: number,
  centerY: number,
  radius: number,
  appliedForce: number,
  isDragging: boolean,
  t: typeof TRANSLATIONS.en
) {
  ctx.save();

  const gripWidth = 24;
  const gripHeight = Math.max(radius * 2 + 28, 60);

  // Grip collar
  const collarGrad = ctx.createLinearGradient(clampX, 0, clampX + gripWidth, 0);
  if (isDragging) {
    collarGrad.addColorStop(0, '#0284c7');
    collarGrad.addColorStop(0.5, '#38bdf8');
    collarGrad.addColorStop(1, '#0369a1');
  } else {
    collarGrad.addColorStop(0, '#334155');
    collarGrad.addColorStop(0.5, '#64748b');
    collarGrad.addColorStop(1, '#1e293b');
  }

  ctx.fillStyle = collarGrad;
  if ('roundRect' in ctx && typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(clampX, centerY - gripHeight / 2, gripWidth, gripHeight, 6);
  } else {
    ctx.rect(clampX, centerY - gripHeight / 2, gripWidth, gripHeight);
  }
  ctx.fill();
  ctx.strokeStyle = isDragging ? '#0284c7' : '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Grip texture ridges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  for (let y = centerY - gripHeight / 2 + 10; y < centerY + gripHeight / 2 - 6; y += 8) {
    ctx.beginPath();
    ctx.moveTo(clampX + 5, y);
    ctx.lineTo(clampX + gripWidth - 5, y);
    ctx.stroke();
  }

  // Pulling Ring Handle for LENGTH DRAG
  const handleStartX = clampX + gripWidth;
  ctx.strokeStyle = isDragging ? '#0284c7' : '#475569';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(handleStartX, centerY);
  ctx.lineTo(handleStartX + 18, centerY);
  ctx.stroke();

  // Large grab ring
  ctx.beginPath();
  ctx.arc(handleStartX + 28, centerY, 14, 0, Math.PI * 2);
  ctx.fillStyle = isDragging ? '#e0f2fe' : '#ffffff';
  ctx.fill();
  ctx.stroke();

  // Length drag horizontal arrow icon inside ring
  ctx.strokeStyle = isDragging ? '#0284c7' : '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(handleStartX + 22, centerY);
  ctx.lineTo(handleStartX + 34, centerY);
  // arrows
  ctx.moveTo(handleStartX + 24, centerY - 3);
  ctx.lineTo(handleStartX + 22, centerY);
  ctx.lineTo(handleStartX + 24, centerY + 3);
  ctx.moveTo(handleStartX + 32, centerY - 3);
  ctx.lineTo(handleStartX + 34, centerY);
  ctx.lineTo(handleStartX + 32, centerY + 3);
  ctx.stroke();

  // Force Vector Arrow
  if (Math.abs(appliedForce) >= 15) {
    const isTension = appliedForce > 0;
    const arrowLength = Math.min(Math.abs(appliedForce) * 0.05 + 30, 95);
    const arrowY = centerY;
    const arrowStartX = handleStartX + 46;
    const arrowEndX = isTension ? arrowStartX + arrowLength : arrowStartX - arrowLength;

    const arrowColor = isTension ? '#d97706' : '#2563eb';

    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 3.5;

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowEndX, arrowY);
    ctx.stroke();

    // Arrow head
    const headSize = 8;
    ctx.beginPath();
    if (isTension) {
      ctx.moveTo(arrowEndX, arrowY);
      ctx.lineTo(arrowEndX - headSize, arrowY - headSize * 0.7);
      ctx.lineTo(arrowEndX - headSize, arrowY + headSize * 0.7);
    } else {
      ctx.moveTo(arrowEndX, arrowY);
      ctx.lineTo(arrowEndX + headSize, arrowY - headSize * 0.7);
      ctx.lineTo(arrowEndX + headSize, arrowY + headSize * 0.7);
    }
    ctx.closePath();
    ctx.fill();

    // Force label
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const labelX = (arrowStartX + arrowEndX) / 2;
    ctx.fillText(`${appliedForce > 0 ? '+' : ''}${appliedForce.toFixed(0)} N`, labelX, arrowY - 10);
  }

  ctx.restore();
}

/**
 * Draws visible, intuitive handles to drag and change Breadth / Diameter directly
 */
function drawBreadthDragHandles(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  rightClampX: number,
  centerY: number,
  radius: number,
  isDraggingDiameter: boolean,
  language: string
) {
  ctx.save();
  const midX = (wallX + rightClampX) / 2;
  const topY = centerY - radius;
  const bottomY = centerY + radius;

  const handleWidth = 46;
  const handleHeight = 16;
  const handleColor = isDraggingDiameter ? '#6366f1' : '#4f46e5';

  // 1. Top Breadth Handle (▲)
  ctx.fillStyle = handleColor;
  if ('roundRect' in ctx && typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(midX - handleWidth / 2, topY - handleHeight - 4, handleWidth, handleHeight, 5);
  } else {
    ctx.rect(midX - handleWidth / 2, topY - handleHeight - 4, handleWidth, handleHeight);
  }
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow up icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(midX, topY - handleHeight - 1);
  ctx.lineTo(midX - 5, topY - 8);
  ctx.lineTo(midX + 5, topY - 8);
  ctx.closePath();
  ctx.fill();

  // 2. Bottom Breadth Handle (▼)
  ctx.fillStyle = handleColor;
  if ('roundRect' in ctx && typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(midX - handleWidth / 2, bottomY + 4, handleWidth, handleHeight, 5);
  } else {
    ctx.rect(midX - handleWidth / 2, bottomY + 4, handleWidth, handleHeight);
  }
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow down icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(midX, bottomY + handleHeight + 1);
  ctx.lineTo(midX - 5, bottomY + 8);
  ctx.lineTo(midX + 5, bottomY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawDimensionOverlays(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  rightClampX: number,
  centerY: number,
  currentRadius: number,
  diamDimX: number,
  physics: PhysicsDerivedValues,
  state: SimulationState,
  t: typeof TRANSLATIONS.en
) {
  ctx.save();

  // 1. TOP DIMENSION ARROW FOR LENGTH (L and Delta L)
  const lengthDimY = centerY - currentRadius - 32;
  ctx.strokeStyle = '#0284c7';
  ctx.fillStyle = '#0284c7';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(wallX, lengthDimY);
  ctx.lineTo(rightClampX, lengthDimY);
  ctx.stroke();

  // End ticks
  ctx.beginPath();
  ctx.moveTo(wallX, lengthDimY - 6);
  ctx.lineTo(wallX, lengthDimY + 6);
  ctx.moveTo(rightClampX, lengthDimY - 6);
  ctx.lineTo(rightClampX, lengthDimY + 6);
  ctx.stroke();

  ctx.font = 'bold 11px "Fira Code", monospace';
  ctx.textAlign = 'center';
  const midX = (wallX + rightClampX) / 2;
  const elong = physics.elongation || 0;
  const deltaStr = elong >= 0 
    ? `+${(elong * 100).toFixed(1)} cm` 
    : `${(elong * 100).toFixed(1)} cm`;

  ctx.fillText(
    `L = ${(physics.currentLength || state.initialLength).toFixed(3)} m  (ΔL: ${deltaStr})`,
    midX,
    lengthDimY - 8
  );

  // 2. RIGHT VERTICAL DIMENSION ARROW FOR DIAMETER (d and Delta d)
  const topDiamY = centerY - currentRadius;
  const bottomDiamY = centerY + currentRadius;

  ctx.strokeStyle = state.poissonRatio < 0 ? '#0891b2' : '#6366f1';
  ctx.fillStyle = state.poissonRatio < 0 ? '#0891b2' : '#6366f1';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(diamDimX, topDiamY);
  ctx.lineTo(diamDimX, bottomDiamY);
  ctx.stroke();

  // Horizontal guide lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(rightClampX + 24, topDiamY);
  ctx.lineTo(diamDimX, topDiamY);
  ctx.moveTo(rightClampX + 24, bottomDiamY);
  ctx.lineTo(diamDimX, bottomDiamY);
  ctx.stroke();

  // Caliper ticks
  ctx.setLineDash([]);
  ctx.strokeStyle = state.poissonRatio < 0 ? '#0891b2' : '#6366f1';
  ctx.beginPath();
  ctx.moveTo(diamDimX - 5, topDiamY);
  ctx.lineTo(diamDimX + 5, topDiamY);
  ctx.moveTo(diamDimX - 5, bottomDiamY);
  ctx.lineTo(diamDimX + 5, bottomDiamY);
  ctx.stroke();

  ctx.font = 'bold 10px "Fira Code", monospace';
  ctx.textAlign = 'left';
  const diamChange = physics.diameterChange || 0;
  const deltaDStr = diamChange >= 0
    ? `+${(diamChange * 1000).toFixed(1)} mm`
    : `${(diamChange * 1000).toFixed(1)} mm`;

  ctx.fillText(`d = ${((physics.currentDiameter || state.initialDiameter) * 1000).toFixed(1)} mm`, diamDimX + 8, centerY - 4);
  ctx.font = '9px "Fira Code", monospace';
  ctx.fillText(`(Δd: ${deltaDStr})`, diamDimX + 8, centerY + 10);

  ctx.restore();
}
