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
rows. Club-owned outgoing loans are also excluded from transfer targets.

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
and outgoing loans, own-player exclusion, unknown prices, exact positions,
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
