import type { RoleDefinition, RoleImportance } from "../constants/roles";
import type { TableRow } from "../types/table";
import { parseAttributeValue } from "./attributeValue";

export type PlayerRoleAttributeInsight = {
  attribute: string;
  value: number;
  valueText: string;
  importance: RoleImportance;
  weight: number;
  weightedScore: number;
};

const ROLE_IMPORTANCE_WEIGHTS: Record<RoleImportance, number> = {
  core: 3.4,
  key: 2.2,
  important: 1.0,
  support: 0.45,
};

function getRoleAttributeList(role: RoleDefinition) {
  const result: { attribute: string; importance: RoleImportance }[] = [];
  const usedAttributes = new Set<string>();

  function add(attributes: string[] | undefined, importance: RoleImportance) {
    for (const attribute of attributes ?? []) {
      if (usedAttributes.has(attribute)) {
        continue;
      }

      usedAttributes.add(attribute);
      result.push({
        attribute,
        importance,
      });
    }
  }

  add(role.coreAttributes, "core");
  add(role.keyAttributes, "key");
  add(role.importantAttributes, "important");
  add(role.supportAttributes, "support");

  return result;
}

export function getPlayerRoleAttributeInsights(
  row: TableRow,
  role: RoleDefinition
): {
  strengths: PlayerRoleAttributeInsight[];
  weaknesses: PlayerRoleAttributeInsight[];
} {
  const insights = getRoleAttributeList(role)
    .map(({ attribute, importance }) => {
      const parsed = parseAttributeValue(row[attribute] ?? "");

      if (!parsed) {
        return null;
      }

      const value = parsed.average;
      const weight = ROLE_IMPORTANCE_WEIGHTS[importance];

      return {
        attribute,
        value,
        valueText: parsed.isRange
          ? `${parsed.min.toFixed(0)}–${parsed.max.toFixed(0)}`
          : value.toFixed(0),
        importance,
        weight,
        weightedScore: value * weight,
      };
    })
    .filter((item): item is PlayerRoleAttributeInsight => item !== null);

  const strengths = [...insights]
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 6);

  const weaknesses = [...insights]
    .filter((item) => item.importance !== "support")
    .sort((a, b) => {
      if (a.value !== b.value) {
        return a.value - b.value;
      }

      return b.weight - a.weight;
    })
    .slice(0, 6);

  return {
    strengths,
    weaknesses,
  };
}