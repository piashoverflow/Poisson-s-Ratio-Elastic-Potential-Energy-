import React from 'react';
import { 
  Sliders, 
  Play, 
  RotateCcw, 
  Layers, 
  Sparkles, 
  Maximize2, 
  Info, 
  Zap, 
  ArrowLeftRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { SimulationState, Language, MaterialPreset } from '../types';
import { MATERIAL_PRESETS } from '../constants/materials';
import { TRANSLATIONS } from '../constants/translations';

interface ControlsSidebarProps {
  state: SimulationState;
  onChange: (updates: Partial<SimulationState>) => void;
  onReleaseClamps: () => void;
  onResetForce: () => void;
}

export const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  state,
  onChange,
  onReleaseClamps,
  onResetForce
}) => {
  const t = TRANSLATIONS[state.language];

  const handleMaterialChange = (materialId: string) => {
    const preset = MATERIAL_PRESETS.find(p => p.id === materialId);
    if (!preset) return;
    onChange({
      selectedMaterialId: materialId,
      poissonRatio: preset.poissonRatio,
      youngsModulus: preset.youngsModulus,
      directStrainOverride: null,
    });
  };

  const handleForceChange = (newForce: number) => {
    onChange({
      appliedForce: newForce,
      directStrainOverride: null, // manual force slider clears direct drag override
      isOscillating: false,
    });
  };

  const handleSliderChange = (key: keyof SimulationState, value: number) => {
    onChange({ [key]: value });
  };

  const currentPreset = MATERIAL_PRESETS.find(p => p.id === state.selectedMaterialId) || MATERIAL_PRESETS[0];

  return (
    <aside className="w-full lg:w-[320px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-sky-200 flex flex-col h-auto lg:h-full overflow-y-auto shadow-xs">
      <div className="p-4 space-y-4">
        {/* Section: Material Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>{t.presetLabel}</span>
            </label>
            <span className="text-[11px] font-mono text-sky-600 font-semibold">
              σ = {state.poissonRatio.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {MATERIAL_PRESETS.map((preset) => {
              const isSelected = state.selectedMaterialId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleMaterialChange(preset.id)}
                  className={`text-left p-2 rounded-lg border text-xs font-medium transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/80 text-sky-950 shadow-xs ring-1 ring-sky-300'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="truncate font-semibold">
                      {state.language === 'bn' ? preset.nameBn : preset.nameEn}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between gap-1">
                    <span className="shrink-0 font-medium">σ: {preset.poissonRatio.toFixed(2)}</span>
                    <span className="font-mono text-slate-500 shrink-0 text-[9.5px]">
                      {(preset.youngsModulus / 1e9) >= 1 ? `${(preset.youngsModulus / 1e9).toFixed(0)} GPa` : `${(preset.youngsModulus / 1e9).toFixed(2)} GPa`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-600 mt-2 bg-sky-50/60 p-2 rounded-md border border-sky-100 italic">
            {state.language === 'bn' ? currentPreset.descriptionBn : currentPreset.descriptionEn}
          </p>
        </div>

        {/* Section: Axial Force (Tension / Compression) */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-sky-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.appliedForce}</span>
            </label>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                state.appliedForce > 10 
                  ? 'bg-amber-100 text-amber-800' 
                  : state.appliedForce < -10 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {state.appliedForce > 0 ? `+${state.appliedForce}` : state.appliedForce} N
              </span>
              <button
                onClick={onResetForce}
                title={t.equilibrium}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Force Slider */}
          <div>
            <input
              type="range"
              min={-2000}
              max={2000}
              step={20}
              value={state.appliedForce}
              onChange={(e) => handleForceChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[10px] font-medium text-slate-500 mt-1">
              <span className="text-blue-600 font-bold">-2000 N ({t.compression})</span>
              <span className="text-slate-400 font-bold">0 N</span>
              <span className="text-amber-600 font-bold">+2000 N ({t.tension})</span>
            </div>
          </div>

          {/* Quick presets for force */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            <button
              onClick={() => handleForceChange(-1500)}
              className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded hover:bg-blue-50 text-blue-700"
            >
              -1.5 kN
            </button>
            <button
              onClick={() => handleForceChange(0)}
              className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-700"
            >
              0 N
            </button>
            <button
              onClick={() => handleForceChange(800)}
              className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded hover:bg-amber-50 text-amber-700"
            >
              +800 N
            </button>
            <button
              onClick={() => handleForceChange(1800)}
              className="px-1.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded hover:bg-amber-50 text-amber-700"
            >
              +1.8 kN
            </button>
          </div>
        </div>

        {/* Release Clamps / Snap-Back CTA */}
        <div className="pt-1">
          <button
            onClick={onReleaseClamps}
            disabled={state.isOscillating || Math.abs(state.appliedForce) < 10}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
              state.isOscillating
                ? 'bg-amber-500 text-white animate-pulse'
                : Math.abs(state.appliedForce) >= 10
                ? 'bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white shadow-red-500/25'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{state.isOscillating ? t.oscillating : t.snapRelease}</span>
          </button>
        </div>

        {/* Section: Poisson's Ratio Override */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <span>{t.poissonRatio}</span>
              <span className="font-mono text-sky-600">σ = {state.poissonRatio.toFixed(2)}</span>
            </label>
            {state.poissonRatio < 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-cyan-100 text-cyan-800 rounded">
                Auxetic
              </span>
            )}
          </div>
          <input
            type="range"
            min={-0.8}
            max={0.5}
            step={0.01}
            value={state.poissonRatio}
            onChange={(e) => {
              handleSliderChange('poissonRatio', parseFloat(e.target.value));
              if (state.selectedMaterialId !== 'custom') {
                onChange({ selectedMaterialId: 'custom' });
              }
            }}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>-0.8 (Auxetic)</span>
            <span>0.0 (Cork)</span>
            <span>0.5 (Incompressible)</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {t.poissonRangeInfo}
          </p>
        </div>

        {/* Section: Rod Dimensions (L0 & d0) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {/* Initial Length L0 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{t.initialLength}</span>
              <span className="font-mono text-sky-700">{state.initialLength.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={state.initialLength}
              onChange={(e) => handleSliderChange('initialLength', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.5 m</span>
              <span>1.5 m</span>
              <span>3.0 m</span>
            </div>
          </div>

          {/* Initial Diameter d0 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{t.initialDiameter}</span>
              <span className="font-mono text-sky-700">{(state.initialDiameter * 1000).toFixed(0)} mm</span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.1}
              step={0.005}
              value={state.initialDiameter}
              onChange={(e) => handleSliderChange('initialDiameter', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10 mm</span>
              <span>50 mm</span>
              <span>100 mm</span>
            </div>
          </div>

          {/* Young's Modulus Y */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{t.youngsModulus}</span>
              <span className="font-mono text-indigo-700">
                {(state.youngsModulus / 1e9).toFixed(2)} GPa
              </span>
            </div>
            <input
              type="range"
              min={0.01e9}
              max={220e9}
              step={1e9}
              value={state.youngsModulus}
              onChange={(e) => {
                handleSliderChange('youngsModulus', parseFloat(e.target.value));
                if (state.selectedMaterialId !== 'custom') {
                  onChange({ selectedMaterialId: 'custom' });
                }
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        {/* Section: Visual Amplification Scale */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              {t.visualAmplification}
            </span>
            <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">
              {state.visualStrainScale}×
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 5, 20, 100].map((scale) => (
              <button
                key={scale}
                onClick={() => onChange({ visualStrainScale: scale })}
                className={`py-1 text-xs font-medium rounded border transition-colors ${
                  state.visualStrainScale === scale
                    ? 'bg-sky-600 text-white border-sky-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {scale}×
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
            {t.visualAmpHelp}
          </p>
        </div>

        {/* Pro Tip Callout */}
        <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200/80 text-[11px] text-sky-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            {t.dragModeHint}
          </p>
        </div>
      </div>
    </aside>
  );
};
