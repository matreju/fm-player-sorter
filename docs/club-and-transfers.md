# Club mode and transfer search

The imported squad is scoped to the active job. A validated ClubManager context,
exact humanTeam database reference and the manager's contract identify a club;
a NationManager context retains the national-team path. Conflicting job contexts
are rejected. The frontend displays the detected mode rather than letting a
manual label turn a national-team import into a club squad.

Club membership follows the club's team vector and, for the documented FM27
Steam plugin hash, explicit linked reserve-team clubs. No names, general
partnerships or nationality counts determine membership. Incoming loans are
included and outgoing loans excluded using the player's current team, with a
roster fallback for players with no current-team pointer. The primary squad and
reserve/youth group can be filtered; all groups feed the existing role rankings
and squad builder. The market is a separate drawer and never replaces those
rows. The transfer search includes owned players by default; an explicit outside-club scope excludes them.

Native reserve links and the hash-gated FM27 world-date location are field facts
from https://github.com/barak14/fm-editor/blob/main/docs/fm27/memory-layout.md .
No third-party implementation is copied. FM26 retains its known inline squad
vectors; separate reserve-club links on unverified binaries are not guessed.
Live-game testing is still required for the memory layouts.

The transfer index is prepared lazily on first search, off the UI thread, and
kept only for the current imported process/session. Requests are paginated and
never transfer the whole world's full attribute table to React. A new database
import invalidates the index, and player UIDs/PID/session are checked before
returning data. Prices and availability describe the imported snapshot; refresh
the connection to update it.

Filters: text, exact playing position, CA, PA, age when the world date is known,
price/value budget, current weekly wage, contract end date, transfer-listed or
free agents. Asking price and value are separate fields. Unknown amounts are
not treated as zero, and no negotiation price or future wage demand is invented.
Money is FM's GBP base unit. Remaining contract months use a verified game date,
never the computer's clock or a fixture date; unknown dates produce no duration.

Tests cover nested reserves/youth, cyclic and incomplete club graphs, incoming
and outgoing loans, own-player scope filters, unknown prices, exact positions,
inclusive expiry limits, and remaining contract dates.

## humanTeam context validation (0.7.0-beta.2)

A reported `J2/X1` together with `U1/M1/GT1` exposed a rejection before native
team resolution: the heap scanner counted both national and club job states
against one binding. Numeric scan hits are no longer job evidence on their own.
Each context must prove its exact IL2CPP class name/namespace, then re-read that
class's own binding and job-state fields. Unknown types, wrong offset views and
unreadable fields cannot vote. Context validation happens only after finding a
validated humanTeam binding, avoiding per-hit remote reads across the full heap.
The UI class names/offsets and enum values (1/2/4) were checked against the
uploaded FM27 managed metadata. The standard x64 Il2CppClass prefix
(image, gc_desc, name, namespaze) supplies class identity.

Genuinely conflicting typed job states or conflicting humanTeam references
remain errors. No team is selected by player counts. Diagnostics now include
VC (validated contexts) and IC (ignored numeric context hits). Regression tests
cover the wrong-class, wrong-namespace, overlapping-layout and stale-state
cases. This fixes the rejection path; a live-game retry remains necessary.

## Native club job (0.7.0-beta.3)

A club career no longer requires a humanTeam UI binding. The exact active
manager registry (one manager and one contract team), or the existing validated
FM27 human-class discovery, supplies the native team. The team points to its
owner; that owner must have the primary MSVC RTTI type `.?AVCLUB@db@@`, a valid
UID/name, a validated team vector containing the contract team and reciprocal
team-to-club links. A nation/container, unrelated club or ambiguous manager
registry is rejected. This route runs before UI job classification, so missing
or stale UI state cannot veto a proven club contract. National-team resolution
retains its existing path.

The user's previously uploaded game_plugin.dll was SHA256-verified as
bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f.
Its RTTI at club vtable RVA 0x4CDA1F8 identifies `.?AVCLUB@db@@`; nation vtable
RVA 0x4CDF658 identifies `.?AVNATION@db@@`. The implementation resolves RTTI
through the module image and validates the locator's self RVA rather than
hardcoding the club vtable address. No game DLL is redistributed.

Regression tests cover the reported H0/VC0 with M1/GT1, wrong native type,
unrelated team, unreadable owner, multiple managers/teams and missing contract.
Live-game validation is still required after installing the update.

## Full club roster and unfiltered market (0.7.0-beta.4)

The club table opens with every imported player, with the score threshold
turned off both at load and on filter reset. Club tabs show all squads, the
first team or reserves/youth with counts. The club's table displays its full
roster on one scrollable page, and has a separate column preference key with
position, nationality, CA, PA, age, condition, value, wage and expiry by default.
Selecting a role still ranks the club's players; hiding players under a score
threshold is now an explicit choice.

The market defaults to every readable player in the imported database,
including owned players and all genders. No managed-club or gender exclusion
is applied automatically. Optional club scope filters can select own/outside
players. Numeric ranges include both bounds for CA, PA, age, price/value and
current weekly wage. Contract expiry has both date bounds. Invalid/inverted
ranges are rejected; missing finances aren't zero, free agents have fee zero.
The UI shows the indexed database count and filtered count, with pagination
(50/100/250 rows) across all results and first/last controls.

Tests cover inclusive ranges, invalid ranges, missing values, free-agent fees,
unfiltered own-player inclusion, and optional club scopes. The UI smoke fixture
uses 27 club players including low-score players to verify the complete roster,
team tabs, column defaults, reset behavior and transfer range transport.

## Position ordering and EUR presentation (0.7.0-beta.5)

Positions sort GK, right defender/wingback, centre back, left defender/wingback,
defensive midfielder, central midfielder, attacking midfielder, right winger,
left winger, striker. Multi-position players use the first matching group.

Club and market finances and player details display EUR; wages are annual
(52 weekly payments). The native index and persisted rows remain GBP/weekly;
market filters convert EUR/annual bounds back with inclusive integer rounding.
The currency table is not yet read from the game, so the shared 1 GBP = 1.20 EUR
rate is explicitly described as approximate in the market and detail tooltips.
Tests were deliberately skipped for this update at the user's request.
