import type { FootFilter } from "../../utils/filters";

export const FOOT_FILTER_OPTIONS: { value: FootFilter; label: string }[] = [
  { value: "any", label: "Dowolna noga" },

  { value: "left-decent", label: "Lewa minimum przyzwoita" },
  { value: "right-decent", label: "Prawa minimum przyzwoita" },

  { value: "left-strong", label: "Lewa minimum względnie mocna" },
  { value: "right-strong", label: "Prawa minimum względnie mocna" },

  { value: "left-very-strong", label: "Lewa minimum wysoka" },
  { value: "right-very-strong", label: "Prawa minimum wysoka" },

  { value: "left-dominant", label: "Lewonożny" },
  { value: "right-dominant", label: "Prawonożny" },

  { value: "both-decent", label: "Obie minimum przyzwoite" },
  { value: "both-strong", label: "Obie minimum względnie mocne" },
];