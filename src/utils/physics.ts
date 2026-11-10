import { PhysicsDerivedValues, MaterialPreset } from '../types';

export function calculatePhysics(
  L0: number, // m
  d0: number, // m
  Y: number, // Pa
  sigma: number, // Poisson's ratio
  appliedForce: number, // N
  directStrainOverride: number | null,
  material: MaterialPreset
): PhysicsDerivedValues {
  const r0 = d0 / 2;
  const A0 = Math.PI * r0 * r0;
  const V0 = A0 * L0;

  let longitudinalStrain: number;
  let force = appliedForce;

  if (directStrainOverride !== null) {
    longitudinalStrain = directStrainOverride;
    force = longitudinalStrain * A0 * Y;
  } else {
    // F = Y * A0 * (dL / L0) => strain = F / (A0 * Y)
    // Clamp to prevent numerical explosion
    longitudinalStrain = (A0 * Y !== 0) ? (appliedForce / (A0 * Y)) : 0;
  }

  // Bound longitudinal strain to physically sensible visual ranges (-0.4 to +0.8)
  const clampedLongStrain = Math.max(-0.5, Math.min(0.8, longitudinalStrain));
  const elongation = clampedLongStrain * L0;
  const currentLength = L0 + elongation;

  // Poisson's ratio effect: lateral strain = - sigma * longitudinal strain
  // Delta d / d0 = - sigma * (Delta L / L0)
  const lateralStrain = -sigma * clampedLongStrain;
  const diameterChange = lateralStrain * d0;
  const currentDiameter = Math.max(0.001, d0 + diameterChange);

  // Stress = F / A0
  const stress = (A0 !== 0) ? (force / A0) : 0;

  // Elastic Potential Energy U = 1/2 * |F * Delta L|
  // Also = 1/2 * Stress * Strain * V0
  const elasticPotentialEnergy = Math.max(0, 0.5 * Math.abs(force * elongation));

  // Energy density u = U / V0
  const energyDensity = (V0 !== 0) ? (elasticPotentialEnergy / V0) : 0;

  // Exact volume vs initial volume
  const currentArea = (Math.PI * currentDiameter * currentDiameter) / 4;
  const currentVolume = currentArea * currentLength;
  const volumeChangeRatio = (V0 !== 0) ? (currentVolume - V0) / V0 : 0;

  // Spring constant k = Y * A0 / L0
  const springConstant = (L0 !== 0) ? (Y * A0) / L0 : 1000;
  const effectiveMass = (material.density * V0) / 3 + 0.5; // rod mass/3 + clamp
  const resonantFrequency = Math.sqrt(Math.max(1, springConstant / effectiveMass));

  return {
    crossSectionalArea: A0,
    initialVolume: V0,
    longitudinalStrain: clampedLongStrain,
    lateralStrain,
    elongation,
    diameterChange,
    currentLength,
    currentDiameter,
    stress,
    elasticPotentialEnergy,
    energyDensity,
    volumeChangeRatio,
    currentVolume,
    springConstant,
    effectiveMass,
    resonantFrequency,
  };
}
