"""Read Football Manager season statistics from the newest local save for selected database UIDs."""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import warnings
from pathlib import Path
from typing import Any


RAW_FIELDS: tuple[tuple[str, str], ...] = (
    ("Występy", "starts"),
    ("Z ławki", "substitute_appearances"),
    ("Minuty", "minutes"),
    ("Śr. ocena", "average_rating"),
    ("Gracz meczu", "player_of_the_match"),
    ("Gole", "goals"),
    ("Asysty", "assists"),
    ("Żółte kartki", "yellow_cards"),
    ("Czerwone kartki", "red_cards"),
    ("xG", "expected_goals"),
    ("npxG", "non_penalty_expected_goals"),
    ("xA", "expected_assists"),
    ("Strzały", "shots"),
    ("Celne strzały", "shots_on_target"),
    ("Strzały spoza pola karnego", "shots_outside_box"),
    ("Gole spoza pola karnego", "goals_outside_box"),
    ("Strzały z rzutów wolnych", "free_kick_shots"),
    ("Rzuty karne (próby)", "penalties_taken"),
    ("Wykorzystane rzuty karne", "penalties_scored"),
    ("Podania (próby)", "passes_attempted"),
    ("Celne podania", "passes_completed"),
    ("Podania progresywne", "progressive_passes"),
    ("Kluczowe podania", "key_passes"),
    ("Kluczowe podania z gry", "open_play_key_passes"),
    ("Stworzone klarowne sytuacje", "clear_cut_chances_created"),
    ("Dośrodkowania (próby)", "crosses_attempted"),
    ("Celne dośrodkowania", "crosses_completed"),
    ("Dośrodkowania z gry", "open_play_crosses_attempted"),
    ("Celne dośrodkowania z gry", "open_play_crosses_completed"),
    ("Dryblingi", "dribbles"),
    ("Spalone", "offsides"),
    ("Dystans (km)", "distance_km"),
    ("Sprinty o wysokiej intensywności", "high_intensity_sprints"),
    ("Pojedynki główkowe", "aerial_challenges_attempted"),
    ("Wygrane główki", "headers_won"),
    ("Kluczowe główki", "key_headers"),
    ("Próby odbiorów", "tackles_attempted"),
    ("Udane odbiory", "tackles_completed"),
    ("Kluczowe odbiory", "key_tackles"),
    ("Przechwyty", "interceptions"),
    ("Odzyskane piłki", "possession_won"),
    ("Stracone piłki", "possession_lost"),
    ("Próby pressingu", "pressures_attempted"),
    ("Udany pressing", "pressures_completed"),
    ("Bloki", "blocks"),
    ("Zablokowane strzały", "shots_blocked"),
    ("Wybicia", "clearances"),
    ("Faule", "fouls_made"),
    ("Faule na zawodniku", "fouls_against"),
    ("Błędy prowadzące do gola", "mistakes_leading_to_goal"),
    ("Czyste konta", "clean_sheets"),
    ("Stracone gole", "goals_allowed"),
    ("Złapane strzały", "saves_held"),
    ("Sparowane strzały", "saves_parried"),
    ("Strzały przeniesione", "saves_tipped"),
    ("Celne strzały przeciwko", "shots_on_target_faced"),
    ("xG uniknięte", "expected_goals_prevented"),
)

COMPUTED_FIELDS: tuple[tuple[str, str], ...] = (
    ("Podania (%)", "pass_completion_percent"),
    ("Dośrodkowania (%)", "cross_completion_percent"),
    ("Doś. z gry (%)", "open_play_cross_completion_percent"),
    ("Główki (%)", "headers_won_percent"),
    ("Odbiory (%)", "tackle_completion_percent"),
    ("Celne strzały (%)", "shots_on_target_percent"),
    ("Konwersja strzałów (%)", "conversion_percent"),
    ("Obrony (%)", "save_percent"),
    ("xG/strzał", "expected_goals_per_shot"),
    ("Gole/90", "goals_per_90"),
    ("Asysty/90", "assists_per_90"),
    ("xG/90", "expected_goals_per_90"),
    ("npxG/90", "non_penalty_expected_goals_per_90"),
    ("xA/90", "expected_assists_per_90"),
    ("xG uniknięte/90", "expected_goals_prevented_per_90"),
    ("Strz./90", "shots_per_90"),
    ("Celne strzały/90", "shots_on_target_per_90"),
    ("Strzały spoza pola/90", "shots_outside_box_per_90"),
    ("Pod/90", "passes_attempted_per_90"),
    ("PodC/90", "passes_completed_per_90"),
    ("Podania dP/90", "progressive_passes_per_90"),
    ("KP/90", "key_passes_per_90"),
    ("KPzG/90", "open_play_key_passes_per_90"),
    ("StS/90", "clear_cut_chances_created_per_90"),
    ("Doś P/90", "crosses_attempted_per_90"),
    ("Celne doś./90", "crosses_completed_per_90"),
    ("Pr Doś zG/90", "open_play_crosses_attempted_per_90"),
    ("C Doś zG/90", "open_play_crosses_completed_per_90"),
    ("Drb/90", "dribbles_per_90"),
    ("Dyst./90", "distance_km_per_90"),
    ("Sprinty/90", "high_intensity_sprints_per_90"),
    ("Poj. gł./90", "aerial_challenges_attempted_per_90"),
    ("Głw/90", "headers_won_per_90"),
    ("Przegrane główki/90", "headers_lost_per_90"),
    ("Kl. główki/90", "key_headers_per_90"),
    ("Pr Odb/90", "tackles_attempted_per_90"),
    ("Odb/90", "tackles_completed_per_90"),
    ("K Odb/90", "key_tackles_per_90"),
    ("Prz/90", "interceptions_per_90"),
    ("Odz Płk/90", "possession_won_per_90"),
    ("Str Płk/90", "possession_lost_per_90"),
    ("Pr Pres/90", "pressures_attempted_per_90"),
    ("Ud Pres/90", "pressures_completed_per_90"),
    ("Blk/90", "blocks_per_90"),
    ("Zabl. strz./90", "shots_blocked_per_90"),
    ("Wyb/90", "clearances_per_90"),
    ("Stracone gole/90", "goals_allowed_per_90"),
)


def _documents_directories() -> list[Path]:
    roots: list[Path] = []
    try:
        import winreg

        key_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            value, _ = winreg.QueryValueEx(key, "Personal")
            roots.append(Path(os.path.expandvars(value)))
    except (ImportError, OSError, TypeError):
        pass

    profile = os.environ.get("USERPROFILE")
    if profile:
        roots.append(Path(profile) / "Documents")
    for variable in ("OneDrive", "OneDriveConsumer", "OneDriveCommercial"):
        value = os.environ.get(variable)
        if value:
            roots.append(Path(value) / "Documents")
    return list(dict.fromkeys(roots))


def _latest_save(edition: int = 26) -> Path | None:
    if edition not in (26, 27):
        return None
    saves: list[Path] = []
    for documents in _documents_directories():
        games = documents / "Sports Interactive" / f"Football Manager {edition}" / "games"
        if games.is_dir():
            saves.extend(path for path in games.rglob("*.fm") if path.is_file())
    return max(saves, key=lambda path: path.stat().st_mtime, default=None)


def _format_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Tak" if value else "Nie"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        formatted = f"{value:.2f}".rstrip("0").rstrip(".")
        return formatted.replace(".", ",")
    return str(value)


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _season_kind(stat: Any) -> str:
    kind = getattr(stat, "kind", "")
    return str(getattr(kind, "value", kind)).lower()


def _row_for_stat(stat: Any) -> dict[str, str]:
    row = {
        label: _format_value(getattr(stat, field, None))
        for label, field in (*RAW_FIELDS, *COMPUTED_FIELDS)
    }
    starts = getattr(stat, "starts", 0) or 0
    substitute_appearances = getattr(stat, "substitute_appearances", 0) or 0
    row["Mecze"] = _format_value(starts + substitute_appearances)
    saves = [
        getattr(stat, "saves_held", None),
        getattr(stat, "saves_parried", None),
        getattr(stat, "saves_tipped", None),
    ]
    if all(value is not None for value in saves):
        total_saves = sum(saves)
        row["Obrony"] = _format_value(total_saves)
        minutes = getattr(stat, "minutes", 0)
        row["Obrony/90"] = _format_value(total_saves * 90 / minutes if minutes else None)
    minutes = getattr(stat, "minutes", 0)
    tackles_attempted = getattr(stat, "tackles_attempted", None)
    row["Pr Odb/90"] = _format_value(
        tackles_attempted * 90 / minutes
        if tackles_attempted is not None and minutes
        else None
    )
    return row


def _read_stats(
    save_path: Path, wanted_unique_ids: set[int]
) -> tuple[dict[str, dict[str, str]], list[dict[str, Any]]]:
    import fmsave

    with tempfile.TemporaryDirectory(prefix="fm-player-sorter-") as temp_directory:
        copied_save = Path(temp_directory) / save_path.name
        shutil.copy2(save_path, copied_save)
        with fmsave.open(copied_save) as career:
            selected_players: dict[int, tuple[int, int | None]] = {}
            for player in career.players():
                unique_id = _as_int(getattr(player, "unique_id", None))
                if unique_id in wanted_unique_ids:
                    player_uid = _as_int(getattr(player, "uid", None))
                    if player_uid is not None:
                        selected_players[player_uid] = (
                            unique_id,
                            _as_int(getattr(player, "team_id", None)),
                        )

            best: dict[int, tuple[tuple[int, int], Any]] = {}
            for stat in career.player_season_stats():
                selected = selected_players.get(_as_int(stat.player_uid))
                if selected is None:
                    continue
                unique_id, current_team_id = selected
                priority = (
                    int(current_team_id is not None and _as_int(stat.team_id) == current_team_id),
                    int(getattr(stat, "minutes", 0)),
                )
                if unique_id not in best or priority > best[unique_id][0]:
                    best[unique_id] = (priority, stat)

            rows = {
                str(unique_id): _row_for_stat(stat)
                for unique_id, (_, stat) in best.items()
            }

            match_groups: dict[tuple[str, int, int], list[dict[str, Any]]] = {}
            club_totals: dict[int, dict[str, int]] = {}
            for stat in career.player_match_stats():
                selected = selected_players.get(_as_int(stat.player_uid))
                if selected is None or not getattr(stat, "has_stats", False):
                    continue
                unique_id, _ = selected
                if getattr(stat, "opponent_club_uid", None) is not None:
                    total = club_totals.setdefault(unique_id, {
                        "Mecze": 0, "Minuty": 0, "Gole": 0,
                        "Asysty": 0, "Czyste konta": 0,
                    })
                    total["Mecze"] += 1
                    total["Minuty"] += _as_int(getattr(stat, "minutes", 0)) or 0
                    total["Gole"] += _as_int(getattr(stat, "goals", 0)) or 0
                    total["Asysty"] += _as_int(getattr(stat, "assists", 0)) or 0
                    total["Czyste konta"] += _as_int(getattr(stat, "clean_sheets", 0)) or 0
                    continue
                # A club opponent resolves to club_uid. International opponents
                # deliberately have no club, which separates national matches
                # from the same players' club histories.
                if getattr(stat, "opponent_club_uid", None) is not None:
                    continue
                date = getattr(stat, "date", None)
                opponent_team_id = getattr(stat, "opponent_team_id", None)
                competition_id = getattr(stat, "competition_id", None)
                if date is None or opponent_team_id is None or competition_id is None:
                    continue
                key = (date.isoformat(), int(competition_id), int(opponent_team_id))
                match_groups.setdefault(key, []).append(
                    {
                        "uid": unique_id,
                        "minutes": getattr(stat, "minutes", None),
                        "goals": getattr(stat, "goals", None),
                        "assists": getattr(stat, "assists", None),
                        "rating": getattr(stat, "rating", None),
                    }
                )

            # FM27 may expose per-match history even when its season aggregate
            # is missing. Fill the four visible club figures from that history.
            for unique_id, totals in club_totals.items():
                row = rows.setdefault(str(unique_id), {})
                for label, value in totals.items():
                    if row.get(label, "") == "":
                        row[label] = str(value)

            fixture_index: dict[tuple[str, int], Any] = {}
            if match_groups:
                for fixture in career.fixtures():
                    date = getattr(fixture, "date", None)
                    if date is None or not getattr(fixture, "played", False):
                        continue
                    date_key = date.isoformat()
                    fixture_index[(date_key, int(fixture.home_team_id))] = fixture
                    fixture_index[(date_key, int(fixture.away_team_id))] = fixture

            national_matches: list[dict[str, Any]] = []
            for (date, competition_id, opponent_team_id), appearances in match_groups.items():
                fixture = fixture_index.get((date, opponent_team_id))
                opponent = f"Reprezentacja #{opponent_team_id}"
                competition = f"Rozgrywki #{competition_id}"
                team_goals = None
                opponent_goals = None
                if fixture is not None:
                    competition = getattr(fixture, "competition_name", None) or competition
                    opponent_is_home = int(fixture.home_team_id) == opponent_team_id
                    if opponent_is_home:
                        opponent = (
                            getattr(fixture, "home_club_short_name", None)
                            or getattr(fixture, "home_club_name", None)
                            or opponent
                        )
                        team_goals = getattr(fixture, "away_goals", None)
                        opponent_goals = getattr(fixture, "home_goals", None)
                    else:
                        opponent = (
                            getattr(fixture, "away_club_short_name", None)
                            or getattr(fixture, "away_club_name", None)
                            or opponent
                        )
                        team_goals = getattr(fixture, "home_goals", None)
                        opponent_goals = getattr(fixture, "away_goals", None)
                national_matches.append(
                    {
                        "id": f"fm-{date}-{competition_id}-{opponent_team_id}",
                        "date": date,
                        "opponent": opponent,
                        "competition": competition,
                        "teamGoals": team_goals,
                        "opponentGoals": opponent_goals,
                        "appearances": sorted(appearances, key=lambda item: item["uid"]),
                    }
                )
            national_matches.sort(key=lambda item: item["date"], reverse=True)
            return rows, national_matches


def main() -> int:
    warnings.simplefilter("ignore")
    try:
        request = json.load(sys.stdin)
        wanted = {int(value) for value in request.get("uids", []) if int(value) > 0}
        save_path = _latest_save(int(request.get("edition", 26)))
        rows, national_matches = (
            ({}, []) if save_path is None or not wanted else _read_stats(save_path, wanted)
        )
        sys.stdout.write(
            json.dumps(
                {"rows": rows, "nationalMatches": national_matches},
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
        return 0
    except Exception:
        sys.stdout.write('{"rows":{},"nationalMatches":[]}')
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
