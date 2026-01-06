/**
 * Converts Praat features to MeasureValues
 * Since the backend only extracts basic features (RMS, ZCR, Spectral Centroid, Spectral Flatness, MFCC),
 * we need to estimate the biomarkers (jitter, shimmer, f0Mean, f0Range, speechRate, f1, f2)
 * from these available features.
 */

import type { PraatFeatures } from '../services/praat';
import type { MeasureValues } from './stressAnalysis';

/**
 * Estimates MeasureValues from Praat features
 * This function uses heuristics based on acoustic properties to estimate
 * voice biomarkers from spectral and energy features.
 */
export function convertPraatFeaturesToMeasureValues(features: PraatFeatures, durationSeconds?: number): MeasureValues {
  // Estimate F0 Mean from spectral centroid
  // Higher spectral centroid generally correlates with higher pitch
  // Typical F0 range: 80-300 Hz, spectral centroid range: 500-3000 Hz
  const f0Mean = Math.max(80, Math.min(300, features.spectralCentroid * 0.12));

  // Estimate F0 Range from spectral variability (inverse of flatness)
  // Lower flatness = more tonal = more pitch variation
  const spectralVariability = 1 - features.spectralFlatness;
  const f0Range = Math.max(10, Math.min(80, spectralVariability * 60 + 20));

  // Estimate Jitter from spectral flatness and RMS variability
  // Higher flatness (less tonal) and more RMS variation = more jitter
  const jitter = Math.max(0.1, Math.min(3.0, features.spectralFlatness * 2.5 + (1 - features.spectralFlatness) * 0.5));

  // Estimate Shimmer from RMS and spectral features
  // Higher RMS variability and lower flatness = more shimmer
  const shimmer = Math.max(1.0, Math.min(8.0, (1 - features.spectralFlatness) * 5 + features.rms * 3));

  // Estimate F1 from MFCC (first few coefficients relate to formants)
  // Use weighted average of first 3 MFCCs to estimate F1
  const mfccSum = features.mfcc.slice(0, 3).reduce((sum, val) => sum + Math.abs(val), 0);
  const f1 = Math.max(300, Math.min(800, 400 + mfccSum * 100));

  // Estimate F2 from MFCC (later coefficients relate to higher formants)
  // Use weighted average of MFCCs 3-6 to estimate F2
  const mfccSum2 = features.mfcc.slice(3, 6).reduce((sum, val) => sum + Math.abs(val), 0);
  const f2 = Math.max(1000, Math.min(2000, 1200 + mfccSum2 * 150));

  // Estimate Speech Rate
  // Higher RMS and ZCR (more activity) = faster speech rate
  // This is a rough estimate, ideally would need actual word count
  const activityLevel = features.rms * 2 + features.zcr * 10;
  const speechRate = Math.max(100, Math.min(200, 120 + activityLevel * 20));

  return {
    jitter,
    shimmer,
    f0Mean,
    f0Range,
    speechRate,
    f1,
    f2,
  };
}

