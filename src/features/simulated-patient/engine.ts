import type { Choice, Mood, Scenario } from "../../data/scenarios";
import type {
  PatientInteractionResult,
  PatientStatus,
  SimulatedPatientState,
} from "./model";

const TENSION_MIN = 0;
const TENSION_MAX = 118;
const TRUST_MIN = 0;
const TRUST_MAX = 100;
const CRISIS_THRESHOLD = 100;

const TIMEOUT_TENSION_DELTA = 12;
const TIMEOUT_TRUST_DELTA = -5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getPatientStatus(tension: number): PatientStatus {
  if (tension >= CRISIS_THRESHOLD) return "critical";
  if (tension >= 70) return "distressed";
  return "stable";
}

export function createSimulatedPatient(
  scenario: Scenario,
  mood: Mood = scenario.stages[0]?.mood ?? "anxious"
): SimulatedPatientState {
  const tension = clamp(scenario.startTension, TENSION_MIN, TENSION_MAX);
  const trust = clamp(scenario.startTrust, TRUST_MIN, TRUST_MAX);

  return {
    tension,
    trust,
    mood,
    status: getPatientStatus(tension),
  };
}

export function resolvePatientInteraction(
  patient: SimulatedPatientState,
  choice: Choice | null
): PatientInteractionResult {
  const tensionDelta = choice?.tension ?? TIMEOUT_TENSION_DELTA;
  const trustDelta = choice?.trust ?? TIMEOUT_TRUST_DELTA;
  const tension = clamp(patient.tension + tensionDelta, TENSION_MIN, TENSION_MAX);
  const trust = clamp(patient.trust + trustDelta, TRUST_MIN, TRUST_MAX);

  return {
    patient: {
      ...patient,
      tension,
      trust,
      status: getPatientStatus(tension),
    },
    quality: choice?.quality ?? "poor",
    tensionDelta,
    trustDelta,
    axes: choice?.axes ?? {},
    timedOut: choice === null,
  };
}

export function isPatientInCrisis(patient: Pick<SimulatedPatientState, "tension">) {
  return patient.tension >= CRISIS_THRESHOLD;
}

export function avertPatientCrisis(patient: SimulatedPatientState): SimulatedPatientState {
  const tension = clamp(patient.tension - 38, 40, 84);
  const trust = clamp(patient.trust + 4, TRUST_MIN, TRUST_MAX);

  return {
    ...patient,
    tension,
    trust,
    status: getPatientStatus(tension),
  };
}
