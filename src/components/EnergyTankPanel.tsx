import React, { useMemo } from 'react';
import { 
  Zap, 
  Flame, 
  Activity, 
  Droplets, 
  Layers, 
  Scale, 
  BarChart2, 
  Info,
  Maximize2
} from 'lucide-react';
import { SimulationState, PhysicsDerivedValues } from '../types';
import { TRANSLATIONS } from '../constants/translations';

interface EnergyTankPanelProps {
  state: SimulationState;
  physics: PhysicsDerivedValues;
}

export const EnergyTankPanel: React.FC<EnergyTankPanelProps> = ({
  state,
  physics
}) => {
  const t = TRANSLATIONS[state.language];

  // Dynamic tank capacity scaling
  const maxTankCapacityJoules = useMemo(() => {
    const currentU = physics.elasticPotentialEnergy;
    if (currentU < 50) return 50;
    if (currentU < 250) return 250;
    if (currentU < 1000) return 1000;
    return Math.ceil(currentU * 1.3);
  }, [physics.elasticPotentialEnergy]);

  // Liquid level percentage (0% to 100%)
  const fillPercentage = Math.min(
    100, 
    Math.max(3, (physics.elasticPotentialEnergy / maxTankCapacityJoules) * 100)
  );

  // Color scheme based on load type (Tension = Electric Amber, Compression = Electric Cyan)
  const isTension = state.appliedForce >= 0;
  const liquidGradient = isTension
    ? 'from-amber-500 via-orange-400 to-amber-300'
    : 'from-cyan-600 via-sky-400 to-cyan-300';
  const liquidBorder = isTension ? 'border-amber-400' : 'border-cyan-400';
  const liquidGlow = isTension ? 'shadow-amber-500/50' : 'shadow-cyan-500/50';

  // Number of animated bubbles based on energy density
  const bubbleCount = Math.min(12, Math.max(2, Math.floor((physics.energyDensity / 500) * 8) + 2));

  // Volume change percentage
  const volumeChangePct = (physics.volumeChangeRatio * 100);

  return (
    <aside className="w-full lg:w-[330px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-sky-200 flex flex-col h-auto lg:h-full overflow-y-auto shadow-xs">
      <div className="p-4 space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-sky-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t.tankTitle}</span>
            </h2>
            <p className="text-[11px] text-slate-500">{t.tankSubtitle}</p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {physics.elasticPotentialEnergy.toFixed(2)} J
          </span>
        </div>

        {/* Visual Glass Energy Liquid Tank */}
        <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-sky-100 relative">
          <div className="flex gap-4 items-center">
            {/* The Translucent Beaker / Glass Cylinder */}
            <div className="relative w-28 h-56 rounded-2xl bg-gradient-to-b from-sky-100/50 to-white/90 border-2 border-sky-300/80 p-1 flex flex-col justify-end shadow-inner overflow-hidden">
              {/* Glass Reflection Highlight */}
              <div className="absolute top-0 left-2 w-2 h-full bg-white/40 rounded-full blur-[1px] pointer-events-none z-20" />
              <div className="absolute top-2 right-2 w-1 h-3/4 bg-white/20 rounded-full blur-[0.5px] pointer-events-none z-20" />

              {/* Tank Graduation Tick Marks */}
              <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-between py-3 px-1.5 pointer-events-none z-10">
                {[100, 75, 50, 25, 0].map((pct) => (
                  <div key={pct} className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span className="w-2 h-px bg-slate-300" />
                    <span>{((maxTankCapacityJoules * pct) / 100).toFixed(0)}J</span>
                  </div>
                ))}
              </div>

              {/* Fluid Volume Container */}
              <div
                className={`w-full rounded-xl transition-all duration-300 ease-out relative overflow-hidden bg-gradient-to-t ${liquidGradient} ${liquidBorder} ${liquidGlow} shadow-lg`}
                style={{ height: `${fillPercentage}%` }}
              >
                {/* Surface Meniscus Wave */}
                <div className="absolute top-0 left-0 w-full h-2.5 bg-white/30 rounded-t-full filter blur-[0.5px]" />

                {/* Animated Rising Bubbles */}
                {Array.from({ length: bubbleCount }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bubble rounded-full bg-white/60 border border-white/80"
                    style={{
                      left: `${15 + (i * 22) % 70}%`,
                      bottom: '0',
                      width: `${4 + (i % 3) * 3}px`,
                      height: `${4 + (i % 3) * 3}px`,
                      animationDuration: `${1.8 + (i % 4) * 0.5}s`,
                      animationDelay: `${(i * 0.35)}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Readouts Beside the Tank */}
            <div className="flex-1 space-y-2.5">
              {/* Stored Energy U */}
              <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.storedEnergy}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black font-mono text-amber-600">
                    {physics.elasticPotentialEnergy.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Joules (J)</span>
                </div>
              </div>

              {/* Energy Density u */}
              <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.energyDensity}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-bold font-mono text-indigo-600">
                    {physics.energyDensity > 1e6
                      ? `${(physics.energyDensity / 1e6).toFixed(2)} MJ/m³`
                      : physics.energyDensity > 1e3
                      ? `${(physics.energyDensity / 1e3).toFixed(2)} kJ/m³`
                      : `${physics.energyDensity.toFixed(1)} J/m³`}
                  </span>
                </div>
              </div>

              {/* Stress P */}
              <div className="p-2 rounded-xl bg-white border border-sky-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.stress} (σ)
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-bold font-mono text-slate-800">
                    {(physics.stress / 1e6).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">MPa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Mathematical Formula Breakdown Card */}
        <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-sky-600" />
              <span>{state.language === 'bn' ? 'গাণিতিক বিশ্লেষণ ও সম্পর্ক' : 'Mathematical Breakdown'}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono font-semibold">
              HSC Equation
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Longitudinal Strain */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <div>
                <span className="font-semibold text-slate-700 block">{t.longitudinalStrain}</span>
                <span className="text-[11px] font-mono text-slate-500">ε_L = ΔL / L₀</span>
              </div>
              <span className="font-mono font-bold text-sky-700">
                {(physics.longitudinalStrain * 100).toFixed(2)}%
              </span>
            </div>

            {/* Lateral Strain */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100">
              <div>
                <span className="font-semibold text-slate-700 block">{t.lateralStrain}</span>
                <span className="text-[11px] font-mono text-slate-500">ε_d = Δd / d₀</span>
              </div>
              <span className={`font-mono font-bold ${physics.lateralStrain < 0 ? 'text-amber-700' : 'text-cyan-700'}`}>
                {(physics.lateralStrain * 100).toFixed(2)}%
              </span>
            </div>

            {/* Poisson's Ratio Verification */}
            <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-950">{t.poissonCalculated}</span>
                <span className="font-mono font-bold text-indigo-700">
                  σ = {state.poissonRatio.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] font-mono text-indigo-600 mt-1">
                σ = - (ε_d / ε_L) = - ({(physics.lateralStrain * 100).toFixed(2)}% / {(physics.longitudinalStrain * 100).toFixed(2)}%)
              </div>
            </div>

            {/* Volume Change Analysis */}
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-950">{t.volumeChange}</span>
                  <span className="text-[10px] text-emerald-700 block font-mono">
                    ΔV/V₀ ≈ ε_L(1 - 2σ)
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-800">
                  {volumeChangePct >= 0 ? `+${volumeChangePct.toFixed(2)}%` : `${volumeChangePct.toFixed(2)}%`}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 mt-1 italic leading-tight">
                {Math.abs(state.poissonRatio - 0.5) < 0.02
                  ? (state.language === 'bn' ? 'σ ≈ ০.৫ হওয়ায় আয়তন পুরোপুরি অপরিবর্তিত (অসংকোচনীয়)।' : 'Since σ ≈ 0.5, volume is constant (incompressible material).')
                  : state.poissonRatio === 0
                  ? (state.language === 'bn' ? 'কর্কের ক্ষেত্রে আয়তন পরিবর্তন সরাসরি দৈর্ঘ্য বৃদ্ধির সমানুপাতিক।' : 'For cork (σ ≈ 0), volume change equals longitudinal strain directly.')
                  : state.poissonRatio < 0
                  ? (state.language === 'bn' ? 'অক্সেটিক উপাদানে দৈর্ঘ্য ও ব্যাস উভয়ই বাড়ায় আয়তন লক্ষণীয়ভাবে বৃদ্ধি পায়!' : 'Auxetic: both length & diameter expand, causing massive volume growth!')
                  : (state.language === 'bn' ? 'ধাতব উপাদানে টান প্রয়োগে সামগ্রিক আয়তন কিছুটা বৃদ্ধি পায়।' : 'For regular metals (σ < 0.5), volume expands slightly under tension.')}
              </p>
            </div>

            {/* Formula Banner */}
            <div className="text-[11px] p-2 bg-slate-100 rounded-lg text-slate-600 font-mono text-center">
              {t.energyFormulaSummary}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
