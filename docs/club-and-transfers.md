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

## Game currency, collapsed market filters and sorting (0.7.0-beta.6)

Removed the estimated EUR rate. The verified uploaded FM27 Steam DLL identifies
CURRENCY_RECORD by primary RTTI/vtable RVA 0x4ED4398. Its Cnam property reads
a direct name at +0x18; its Cexr getter (RVA 0x2F66397) reads float32 +0x38.
The Cexr setter writes the same value into the game's active formatting table
as float64 (0x2F665E9 -> helper 0x1418C50).

The reader identifies the EUR and GBP records by exact currency code/name,
resolves their UIDs with the game's mapping at 0x2F664C0 (switch table
0x4ED47B4), and reads their actual live formatter rates at 0x5707180 + enum*0x20.
The table must be initialized (byte at 0x570717C == 1). The live EUR/GBP ratio
is attached as private row metadata and retained with the scouting session.
Conflicting records/rates and unknown builds yield no conversion, never an
estimate. Financial inputs are disabled when a confirmed game rate is absent.
Reconnect/refresh the database after updating to capture the rate. Read-only
implementation; no currency setting or process memory is modified.

Transfer filters start collapsed. Every sortable column toggles ascending/
descending order across the full filtered native index before pagination.
Position sorting matches the club's football order, with unknown positions
and missing numeric/date values kept last in both directions.
Tests remain deliberately skipped at the user's request. Compilation only.
Live-process currency reads require confirmation in the running game.

## Fast native loading and one-click live refresh (0.7.0-beta.6)

The verified FM27 club path first reads the actual player entity vector at
0x57037D0/0x57037D8. Each secondary Person vtable, UID, CA/PA and vector bounds
is validated; moving/unknown registries fall back to the existing scan. The
manager registry signature now uses a fixed-tail memmem search rather than a
byte-by-byte wildcard scan of the whole plugin. Currency discovery examines
only the bounded native entity-array cluster and verifies currency RTTI.

After attach the toolbar refresh button reuses an in-memory process session.
It validates Windows process creation time, human-manager contract, team/club
UIDs, player registry bounds and sampled player UIDs before and after reading.
In club mode live squad vectors plus prior members determine membership, so
transfers in/out and all linked reserve/youth squads are refreshed without
remote reads for every player in the world. Native attributes, abilities,
condition, finances, contract dates and the live EUR rate are re-read.
The world index's pointers are retained; its derived transfer-search index is
invalidated, then rebuilt lazily so market finances are not presented as fresh
when they are stale. Any changed save/process invalidates the caches and asks
for explicit reconnect; no hidden full scan is started by quick refresh.

Fast refresh preserves UI filters/selection, graphics and already loaded save
statistics. It does not reparse a large save file or reload logos; season
statistics remain those of the last full load. Live refresh and search/full
attach share a lock to prevent session races. Process detection no longer
refreshes unrelated system-wide statistics. No timing improvement is claimed
without a live game; compilation is the only validation run as requested.

## Pitch-line position sorting (0.7.0-beta.7)

Separate right/left wingbacks from the defender line. The order is GK, right
defender, centre back/libero, left defender, right wingback, left wingback, DM,
right/central/left midfielder, right/central/left attacking midfielder, striker.
Club and market sorting use the complete native 1-20 proficiency values and
the earliest strongly rated group (at least 15 and within two points of the
strongest position, with the strongest group as fallback),
not the shortened position label. Position text now includes all values >=15
in pitch-line order; the old max-minus-two rule hid additional positions.
The transfer index stores the numeric rank from the same native helper.
Players in the same group keep the existing name tie-break. No claim is made
about reproducing FM's undocumented tie-break between equal-position players.
Tests remain skipped as requested. Compile/package only.

A weaker additional position is displayed but does not move a natural left
back into the centre-back group or a central midfielder into DM. Display
coverage and sort eligibility are intentionally distinct.

## Refresh session validation fix (0.7.0-beta.8)

Quick refresh no longer requires the global manager vector to contain exactly
one entry after a successful alternate attach. The actual unique manager Person
identified by reciprocal contract/team links is cached, excluding account
placeholders. Refresh checks that manager's UID and current contract against
the cached process creation time and team/club UIDs. The verified DLL hash is
retained directly, independently of whether a player-vector signature exists.

Reallocation/mutation of the native player vector triggers a bounded native
index rebind using previously verified Person classes rather than a heap scan
or unconditional disconnect. A scoped UID failure permits one rebind retry.
Unrelated stale sampled world players no longer invalidate the club session.
Transient read failures preserve session caches and the UI roster for retry;
only proven identity changes/missing session/unknown class require reconnect.
Errors carry specific FM-Rxx diagnostics rather than one catch-all message.
No tests are run; live-game confirmation remains necessary.

## FM shortlists, richer market filters and user columns (0.7.0-beta.9)

The market can select the active human manager's actual FM player shortlists.
This is read-only access to in-game collections, not app-created lists or file
exports. The uploaded/verified FM27 DLL supplies these field facts: native
manager +0x230/+0x238 is the player-shortlist vector (enumerator 0x2684180);
shortlist +0xE8 is the name FmString (name comparison 0xF059E9, destructor
0x231164E); +0x4C is the list kind (0/1 human active/inactive lists). An empty
name uses the game's default-list convention (UI formatter 0x48C430).

Persistent targets +0x50/+0x58 reference Person at target +0x60 (0xF18388 and
0xF183D5). Materialized members +0x80/+0x88 are wrappers with Person at +0
(0x26841AA..0x26841ED and 0xF1A57D..0xF1A5C9). Membership requires a pointer
to an indexed player and that player's current UID. No numeric UID guessing.
Names/collections are re-read on searches and with the refresh-lists button;
manager identity is validated before/after and vector mutation is rejected.
Unknown builds/missing manager data report unavailability. Unresolved entries
are counted explicitly rather than silently claiming the list is complete.
Live-game confirmation of these derived field layouts remains necessary.

Additional server-side filters cover nationality, club, league, gender,
dominant foot or two strong feet, height, condition, PA-minus-CA headroom,
loan status, not-for-sale/release status and up to 12 simultaneous min/max
attribute conditions. Sixty decoded visible/hidden/personality ratings are
kept in a compact 64-byte index field; no extra remote scan per attribute.
Attributes, height, condition and headroom sort across the complete result
set before pagination. Unknown values are not treated as zero for filtering.

Transfer column choices and order are saved separately from club preferences;
all readable native columns are selectable with a search, reorder and reset.
Shirt number is removed from visible club columns (including prior saved
choices) and the profile summary, and is excluded from transfer columns.
Tests are skipped at the user's request; compilation/package only.
