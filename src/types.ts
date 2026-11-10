export type Language = 'en' | 'bn';

export interface MaterialPreset {
  id: string;
  nameEn: string;
  nameBn: string;
  poissonRatio: number; // sigma
  youngsModulus: number; // in Pa (e.g. 200e9 for steel)
  density: number; // kg/m3
  color: string;
  secondaryColor: string;
  specularColor: string;
  descriptionEn: string;
  descriptionBn: string;
  isAuxetic?: boolean;
}

export interface SimulationState {
  // Preset or custom
  selectedMaterialId: string;
  
  // Dimensions
  initialLength: number; // L0 in meters (0.5 to 3.0 m)
  initialDiameter: number; // d0 in meters (0.01 to 0.1 m)
  
  // Material properties
  youngsModulus: number; // Y in Pa
  poissonRatio: number; // sigma (-0.8 to 0.5)
  
  // Loading
  appliedForce: number; // F in Newtons (-2000 to +2000 N)
  directStrainOverride: number | null; // direct strain from mouse drag if active
  
  // Visualization mode
  visualStrainScale: number; // 1x, 5x, 20x, 100x amplification for visual clarity on stiff materials
  autoScaleStiff: boolean;
  
  // Oscillation & Dynamics
  isOscillating: boolean;
  oscillationAmplitude: number;
  oscillationPhase: number;
  dampingFactor: number;
  velocity: number;
  
  // Settings
  audioEnabled: boolean;
  language: Language;
  showGridLines: boolean;
  showDimensionArrows: boolean;
  showStressHeatmap: boolean;
}

export interface PhysicsDerivedValues {
  crossSectionalArea: number; // A0 (m^2)
  initialVolume: number; // V0 (m^3)
  longitudinalStrain: number; // epsilon_L = dL / L0
  lateralStrain: number; // epsilon_d = dd / d0 = -sigma * epsilon_L
  elongation: number; // delta L (m)
  diameterChange: number; // delta d (m)
  currentLength: number; // L (m)
  currentDiameter: number; // d (m)
  stress: number; // sigma_stress = F / A0 (Pa)
  elasticPotentialEnergy: number; // U = 1/2 * F * delta L (Joules)
  energyDensity: number; // u = U / V0 (J/m^3)
  volumeChangeRatio: number; // dV / V0 approx epsilon_L * (1 - 2*sigma)
  currentVolume: number; // V (m^3)
  springConstant: number; // k = Y * A0 / L0 (N/m)
  effectiveMass: number; // mass of rod (kg)
  resonantFrequency: number; // omega = sqrt(k / m) (rad/s)
}
