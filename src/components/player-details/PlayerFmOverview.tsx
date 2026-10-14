import type { TableRow } from "../../types/table";
import "./PlayerFmOverview.css";

type PlayerFmOverviewProps = {
  player: TableRow;
};

type AttributeGroup = {
  id: string;
  label: string;
  columns: string[];
};

const POSITION_COLUMNS = [
  ["BR", "Pozycja: BR"],
  ["LIB", "Pozycja: LIB"],
  ["O (L)", "Pozycja: O (L)"],
  ["O (Ś)", "Pozycja: O (Ś)"],
  ["O (P)", "Pozycja: O (P)"],
  ["DP", "Pozycja: DP"],
  ["P (L)", "Pozycja: P (L)"],
  ["P (Ś)", "Pozycja: P (Ś)"],
  ["P (P)", "Pozycja: P (P)"],
  ["OP (L)", "Pozycja: OP (L)"],
  ["OP (Ś)", "Pozycja: OP (Ś)"],
  ["OP (P)", "Pozycja: OP (P)"],
  ["N (Ś)", "Pozycja: N (Ś)"],
  ["WO (L)", "Pozycja: WO (L)"],
  ["WO (P)", "Pozycja: WO (P)"],
] as const;

const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    id: "technical",
    label: "Techniczne",
    columns: [
      "Dośrodkowania",
      "Drybling",
      "Wykańczanie akcji",
      "Przyjęcie piłki",
      "Gra głową",
      "Strzały z dystansu",
      "Krycie",
      "Podania",
      "Odbiór piłki",
      "Technika",
      "Rzuty rożne",
      "Rzuty wolne",
      "Długie wrzuty",
      "Rzuty karne",
    ],
  },
  {
    id: "mental",
    label: "Mentalne",
    columns: [
      "Agresja",
      "Przewidywanie",
      "Waleczność",
      "Opanowanie",
      "Koncentracja",
      "Decyzje",
      "Determinacja",
      "Błyskotliwość",
      "Przywództwo",
      "Gra bez piłki",
      "Ustawianie się",
      "Współpraca",
      "Pracowitość",
      "Przegląd sytuacji",
    ],
  },
  {
    id: "physical",
    label: "Fizyczne",
    columns: [
      "Przyspieszenie",
      "Zwinność",
      "Równowaga",
      "Skoczność",
      "Sprawność",
      "Szybkość",
      "Wytrzymałość",
      "Siła",
    ],
  },
  {
    id: "goalkeeper",
    label: "Bramkarskie",
    columns: [
      "Chwytanie",
      "Zasięg wyskoku",
      "Gra na przedpolu",
      "Komunikacja",
      "Wykopy",
      "Wyrzuty",
      "Jeden na jednego",
      "Refleks",
      "Ekscentryczność",
      "Wychodzenie poza pole karne",
      "Piąstkowanie",
    ],
  },
];

const PERSONALITY_COLUMNS = [
  "Adaptacja",
  "Ambicja",
  "Lojalność",
  "Radzenie sobie z presją",
  "Profesjonalizm",
  "Fair play",
  "Temperament",
  "Kontrowersyjność",
];

const HIDDEN_COLUMNS = [
  "Regularność",
  "Ważne mecze",
  "Podatność na kontuzje",
  "Wszechstronność",
  "Brudna gra",
];

function numericValue(value: string | undefined): number | null {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getValueTone(value: string | undefined): string {
  const numeric = numericValue(value);
  if (numeric === null) return "empty";
  if (numeric >= 16) return "elite";
  if (numeric >= 12) return "good";
  if (numeric >= 7) return "average";
  return "low";
}

function getDisplayName(player: TableRow): string {
  const firstName = player["Imię"]?.trim() ?? "";
  const lastName = player["Nazwisko"]?.trim() ?? "";
  if (!firstName || lastName.toLocaleLowerCase("pl").includes(firstName.toLocaleLowerCase("pl"))) {
    return lastName || firstName || "Nieznany zawodnik";
  }
  return `${firstName} ${lastName}`;
}

function getInitials(player: TableRow): string {
  return getDisplayName(player)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Detail({
  label,
  value,
  accent = false,
}: {
  label: string;
  value?: string;
  accent?: boolean;
}) {
  return (
    <span className="fm-profile-detail" data-accent={accent || undefined}>
      <small>{label}</small>
      <strong>{value || "—"}</strong>
    </span>
  );
}

function AttributeList({
  label,
  columns,
  player,
}: {
  label: string;
  columns: string[];
  player: TableRow;
}) {
  return (
    <section className="fm-profile-attributes">
      <h4>{label}</h4>
      <div>
        {columns.map((column) => (
          <span key={column}>
            <small>{column}</small>
            <strong data-tone={getValueTone(player[column])}>
              {player[column] || "—"}
            </strong>
          </span>
        ))}
      </div>
    </section>
  );
}

export function PlayerFmOverview({ player }: PlayerFmOverviewProps) {
  const isGoalkeeper =
    (numericValue(player["Pozycja: BR"]) ?? 0) >= 12 ||
    player["Pozycja"]?.includes("BR");
  const attributeGroups = ATTRIBUTE_GROUPS.filter(
    (group) => group.id !== "goalkeeper" || isGoalkeeper,
  );

  return (
    <section className="fm-profile" aria-label="Pełny profil zawodnika z FM">
      <header className="fm-profile__identity">
        <div className="fm-profile__avatar" aria-hidden="true">
          {getInitials(player)}
        </div>
        <div className="fm-profile__name">
          <h3>{getDisplayName(player)}</h3>
          <p>
            {player["Narodowość"] || "—"} · {player["Wiek"] || "—"} lat ·{" "}
            {player["Klub"] || "Bez klubu"}
          </p>
          <div>
            {(player["Pozycja"] || "Brak pozycji")
              .split(",")
              .slice(0, 5)
              .map((position) => (
                <span key={position}>{position.trim()}</span>
              ))}
          </div>
        </div>
        <div className="fm-profile__summary">
          <Detail label="OU" value={player["OU"] ?? player["CA"]} accent />
          <Detail label="PA" value={player["PA"]} />
          <Detail label="Wartość" value={player["Wartość"]} />
          <Detail label="Pensja" value={player["Pensja"]} />
          <Detail label="Kontrakt" value={player["Koniec kontraktu"]} />
          <Detail label="Nr" value={player["Numer w składzie"]} />
        </div>
      </header>

      <div className="fm-profile__main">
        <aside className="fm-profile__positions">
          <h4>Pozycje</h4>
          <div className="fm-profile__position-grid">
            {POSITION_COLUMNS.map(([label, column]) => (
              <span
                key={column}
                data-tone={getValueTone(player[column])}
                title={`${label}: ${player[column] || "brak danych"}`}
              >
                <small>{label}</small>
                <strong>{player[column] || "—"}</strong>
              </span>
            ))}
          </div>

          <div className="fm-profile__info">
            <Detail label="Wzrost" value={player["Wzrost"] ? `${player["Wzrost"]} cm` : ""} />
            <Detail label="Lewa noga" value={player["Lewa noga"]} />
            <Detail label="Prawa noga" value={player["Prawa noga"]} />
            <Detail label="Kondycja" value={player["Kondycja"]} />
            <Detail label="Morale" value={player["Morale"]} />
            <Detail label="Reputacja" value={player["Reputacja"]} />
          </div>
        </aside>

        <div className="fm-profile__attribute-grid">
          {attributeGroups.map((group) => (
            <AttributeList
              key={group.id}
              label={group.label}
              columns={group.columns}
              player={player}
            />
          ))}
        </div>

        <aside className="fm-profile__character">
          <AttributeList
            label="Osobowość"
            columns={PERSONALITY_COLUMNS}
            player={player}
          />
          <AttributeList
            label="Ukryte"
            columns={HIDDEN_COLUMNS}
            player={player}
          />
        </aside>
      </div>
    </section>
  );
}
