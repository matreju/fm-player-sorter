export type ParsedAttributeValue = {
  min: number;
  average: number;
  max: number;
  isRange: boolean;
};

function parseNumber(value: string): number | null {
  const normalized = value
    .trim()
    .replace("cm", "")
    .replace(",", ".")
    .replace(/\s+/g, "");

  if (!normalized || normalized === "-") {
    return null;
  }

  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

export function parseAttributeValue(value: string): ParsedAttributeValue | null {
  const cleaned = value.trim();

  if (!cleaned || cleaned === "-") {
    return null;
  }

  const normalized = cleaned
    .replace("cm", "")
    .replace(",", ".")
    .replace(/\s+/g, "");

  const rangeMatch = normalized.match(
    /^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/
  );

  if (rangeMatch) {
    const first = Number(rangeMatch[1]);
    const second = Number(rangeMatch[2]);

    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    const min = Math.min(first, second);
    const max = Math.max(first, second);

    return {
      min,
      max,
      average: (min + max) / 2,
      isRange: min !== max,
    };
  }

  const number = parseNumber(cleaned);

  if (number === null) {
    return null;
  }

  return {
    min: number,
    average: number,
    max: number,
    isRange: false,
  };
}