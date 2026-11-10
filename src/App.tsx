import React, { useState, useMemo, useCallback } from 'react';
import { 
  SimulationState, 
  Language, 
  MaterialPreset 
} from './types';
import { MATERIAL_PRESETS } from './constants/materials';
import { calculatePhysics } from './utils/physics';
import { Navbar } from './components/Navbar';
import { ControlsSidebar } from './components/ControlsSidebar';
import { RodCanvasStage } from './components/RodCanvasStage';
import { StressStrainCurve } from './components/StressStrainCurve';
import { EnergyTankPanel } from './components/EnergyTankPanel';

export default function App() {
  const [state, setState] = useState<SimulationState>({
    selectedMaterialId: 'rubber',
    initialLength: 1.5, // 1.5 m
    initialDiameter: 0.04, // 40 mm
    youngsModulus: MATERIAL_PRESETS[0].youngsModulus,
    poissonRatio: MATERIAL_PRESETS[0].poissonRatio,
    appliedForce: 1000, // 1000 N default tension
    directStrainOverride: null,
    visualStrainScale: 5,
    autoScaleStiff: true,
    isOscillating: false,
    oscillationAmplitude: 0,
    oscillationPhase: 0,
    dampingFactor: 3.0,
    velocity: 0,
    audioEnabled: false,
    language: 'bn',
    showGridLines: false, // Rings and internal grid removed from wire
    showDimensionArrows: true,
    showStressHeatmap: true,
  });

  // Current material preset
  const currentMaterial = useMemo(() => {
    return MATERIAL_PRESETS.find(p => p.id === state.selectedMaterialId) || MATERIAL_PRESETS[0];
  }, [state.selectedMaterialId]);

  // Real-time Physics calculations
  const physics = useMemo(() => {
    return calculatePhysics(
      state.initialLength,
      state.initialDiameter,
      state.youngsModulus,
      state.poissonRatio,
      state.appliedForce,
      state.directStrainOverride,
      currentMaterial
    );
  }, [
    state.initialLength,
    state.initialDiameter,
    state.youngsModulus,
    state.poissonRatio,
    state.appliedForce,
    state.directStrainOverride,
    currentMaterial
  ]);

  // State update helper
  const handleStateChange = useCallback((updates: Partial<SimulationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Language toggle
  const handleToggleLanguage = useCallback(() => {
    setState(prev => ({
      ...prev,
      language: prev.language === 'en' ? 'bn' : 'en'
    }));
  }, []);

  // Reset to initial clean state
  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedMaterialId: 'rubber',
      initialLength: 1.5,
      initialDiameter: 0.04,
      youngsModulus: MATERIAL_PRESETS[0].youngsModulus,
      poissonRatio: MATERIAL_PRESETS[0].poissonRatio,
      appliedForce: 0,
      directStrainOverride: null,
      isOscillating: false,
    }));
  }, []);

  // Release Clamps (Slow Graceful Return)
  const handleReleaseClamps = useCallback(() => {
    if (state.isOscillating || Math.abs(state.appliedForce) < 10) return;

    setState(prev => ({
      ...prev,
      isOscillating: true,
      directStrainOverride: null
    }));
  }, [state.isOscillating, state.appliedForce]);

  // Synchronized slow oscillation progress
  const handleOscillationProgress = useCallback((currentForce: number) => {
    setState(prev => ({
      ...prev,
      appliedForce: Math.round(currentForce)
    }));
  }, []);

  // Handle direct LENGTH drag on canvas
  const handleDragStrainChange = useCallback((strain: number) => {
    const A0 = (Math.PI * state.initialDiameter * state.initialDiameter) / 4;
    const forceEquivalent = strain * A0 * state.youngsModulus;

    setState(prev => ({
      ...prev,
      directStrainOverride: strain,
      appliedForce: Math.round(forceEquivalent),
      isOscillating: false
    }));
  }, [state.initialDiameter, state.youngsModulus]);

  // Handle direct BREADTH / DIAMETER drag on canvas
  const handleDiameterChange = useCallback((newDiameter: number) => {
    setState(prev => ({
      ...prev,
      initialDiameter: Math.max(0.01, Math.min(0.10, newDiameter))
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setState(prev => ({
      ...prev,
      directStrainOverride: null
    }));
  }, []);

  // Oscillation finish (settled completely at equilibrium)
  const handleOscillationFinished = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOscillating: false,
      appliedForce: 0,
      directStrainOverride: null
    }));
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col text-slate-800">
      {/* 1. Top Navigation Bar with Title and Bold Red UDVASH */}
      <Navbar
        language={state.language}
        onToggleLanguage={handleToggleLanguage}
        onReset={handleReset}
      />

      {/* 2. Main Studio Workspace - Direct 3-Column flexbox (Zero Overlap!) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Left Column: Material Presets, Sliders, and Controls */}
        <ControlsSidebar
          state={state}
          onChange={handleStateChange}
          onReleaseClamps={handleReleaseClamps}
          onResetForce={() => handleStateChange({ appliedForce: 0, directStrainOverride: null })}
        />

        {/* Center: Interactive 3D Cylindrical Rod Stage & Real-time Stress-Strain Energy Density Curve */}
        <div className="flex-1 min-w-0 flex flex-col h-full relative overflow-y-auto lg:overflow-hidden bg-slate-50">
          {/* Top: 3D Cylindrical Rod Simulation */}
          <div className="flex-1 min-h-[280px] relative">
            <RodCanvasStage
              state={state}
              physics={physics}
              onDragStrainChange={handleDragStrainChange}
              onDiameterChange={handleDiameterChange}
              onDragEnd={handleDragEnd}
              onOscillationProgress={handleOscillationProgress}
              onOscillationFinished={handleOscillationFinished}
            />
          </div>

          {/* Bottom: Live Synced Stress vs Strain Energy Density Curve */}
          <StressStrainCurve
            state={state}
            physics={physics}
            onDragStrainChange={handleDragStrainChange}
            onDragEnd={handleDragEnd}
          />
        </div>

        {/* Right Column: Elastic Potential Energy Tank & Live Calculations */}
        <EnergyTankPanel
          state={state}
          physics={physics}
        />
      </main>
    </div>
  );
}
