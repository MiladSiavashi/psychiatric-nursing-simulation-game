import type { Axis, Mood, Quality } from "../../data/scenarios";

export type PatientStatus = "stable" | "distressed" | "critical";

export interface SimulatedPatientState {
  tension: number;
  trust: number;
  mood: Mood;
  status: PatientStatus;
}

export interface PatientInteractionResult {
  patient: SimulatedPatientState;
  quality: Quality;
  tensionDelta: number;
  trustDelta: number;
  axes: Partial<Record<Axis, number>>;
  timedOut: boolean;
}
