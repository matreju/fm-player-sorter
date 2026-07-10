export type CampType =
  | "friendly"
  | "qualifiers"
  | "nations-league"
  | "tournament"
  | "other";

export type CampPlayerStatus = "active" | "released";

export type CampPlayerSnapshot = {
  key: string;
  name: string;
  club: string;

  // Pozycje z FM, np. "OP (PL), N (Ś)"
  position: string;

  // Pozycja ustawiona przez Ciebie przy powołaniu, np. "Skrzydłowy"
  callUpPosition?: string;

  age: string;
  uid?: string;
  legacyKey?: string;

  // active = normalnie w kadrze zgrupowania
  // released = odesłany po redukcji kadry, ale zostaje w historii/statystykach
  status?: CampPlayerStatus;
  releasedAt?: string;
};
export type CampMatchType =
  | "friendly"
  | "qualifiers"
  | "nations-league"
  | "tournament"
  | "other";

export type CampMatchAppearance = {
  playerKey: string;
  played: boolean;
  minutes: string;
  goals: string;
  assists: string;
  rating: string;
};

export type CampMatch = {
  id: string;
  opponent: string;
  date: string;
  type: CampMatchType;
  teamGoals: string;
  opponentGoals: string;
  appearances: CampMatchAppearance[];
};

export type Camp = {
  id: string;
  name: string;
  type: CampType;
  dateFrom: string;
  dateTo: string;
  players: CampPlayerSnapshot[];
  matches: CampMatch[];
  campaignId?: string;
  createdAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  type: CampType;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
};