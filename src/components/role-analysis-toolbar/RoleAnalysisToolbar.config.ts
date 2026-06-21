import type { AppSelectOption } from "../ui";
import type { RolePhaseFilter } from "../../utils/roleScoring";

export const ROLE_PHASE_OPTIONS: AppSelectOption[] = [
  { value: "any", label: "Dowolna" },
  { value: "with-ball", label: "Przy piłce" },
  { value: "without-ball", label: "Bez piłki" },
];

export function isRolePhaseFilter(value: string): value is RolePhaseFilter {
  return value === "any" || value === "with-ball" || value === "without-ball";
}