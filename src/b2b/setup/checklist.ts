import type { SetupProgress, SetupStep, SetupStepKey } from "./api";

export type WizardStep = "employees" | "clients" | "done";

export interface ChecklistItem {
  key: SetupStepKey;
  labelKey: string;
  label: string;
  /** Path below /ops/{org}/ the button opens. */
  to: string;
  buttonKey: string;
  button: string;
  required: boolean;
  done: boolean;
  count?: number;
  /** first_job waits for the first client. */
  waiting: boolean;
}

const META: Record<SetupStepKey, Pick<ChecklistItem, "labelKey" | "label" | "to" | "buttonKey" | "button">> = {
  profile: { labelKey: "b2b.setup.checklist.step.profile", label: "Company profile", to: "settings/profile", buttonKey: "b2b.setup.checklist.btn.profile", button: "Complete profile" },
  team: { labelKey: "b2b.setup.checklist.step.team", label: "Create a team", to: "teams", buttonKey: "b2b.setup.checklist.btn.team", button: "Create a team" },
  employees: { labelKey: "b2b.setup.checklist.step.employees", label: "Add your employees", to: "settings/team", buttonKey: "b2b.setup.checklist.btn.employees", button: "Add employees" },
  invites: { labelKey: "b2b.setup.checklist.step.invites", label: "Invite employees to the app", to: "settings/team", buttonKey: "b2b.setup.checklist.btn.invites", button: "Invite employees" },
  clients: { labelKey: "b2b.setup.checklist.step.clients", label: "Add your clients", to: "customers", buttonKey: "b2b.setup.checklist.btn.clients", button: "Add clients" },
  first_job: { labelKey: "b2b.setup.checklist.step.firstJob", label: "Create your first job", to: "jobs/new", buttonKey: "b2b.setup.checklist.btn.firstJob", button: "Create a job" },
};

const ORDER: SetupStepKey[] = ["profile", "team", "employees", "invites", "clients", "first_job"];

/** The API's steps in the designed order, with copy keys and destinations. Unknown keys from a newer API are ignored. */
export function checklistItems(progress: SetupProgress): ChecklistItem[] {
  const clients = progress.steps.find((s) => s.key === "clients");
  return ORDER.flatMap((key) => {
    const step = progress.steps.find((s) => s.key === key);
    if (!step) return [];
    return [{ key, ...META[key], required: step.required, done: step.done, count: step.count, waiting: key === "first_job" && !clients?.done }];
  });
}

export const requiredCounts = (progress: SetupProgress) => {
  const req = progress.steps.filter((s) => s.required);
  return { done: req.filter((s) => s.done).length, total: req.length };
};

/** Where "Continue setup" resumes: the first unfinished employees/clients step, else the end. */
export function resumeStep(progress: SetupProgress | undefined): WizardStep {
  const open = (k: SetupStepKey) => progress?.steps.find((s) => s.key === k && !s.done);
  if (open("employees")) return "employees";
  if (open("clients")) return "clients";
  return "done";
}

export const parseWizardStep = (raw: string | null | undefined): WizardStep | null => (raw === "employees" || raw === "clients" || raw === "done" ? raw : null);

export const hideKey = (orgId: string) => `w4u.setup.hidden.${orgId}`;

/** What the last wizard screen lists: set up vs still open (required steps only). */
export function doneSummary(progress: SetupProgress | undefined): { ready: SetupStep[]; open: SetupStep[] } {
  const steps = (progress?.steps ?? []).filter((s) => s.required);
  return { ready: steps.filter((s) => s.done), open: steps.filter((s) => !s.done) };
}
