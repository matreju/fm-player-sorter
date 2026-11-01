# Competition rules editor — beta.19

The club header's existing Zasady ligi button now opens Zasady rozgrywek.
The user selects a competition from the managed team's native records, then a
phase/group/round, then edits individual supported player-count constraints.
No Champions League, Conference League or cup is inserted merely because of its
name or country. The old hard-coded Ekstraklasa UID and single-phase restriction
are removed. This has not been verified in a live FM session here.

## Native catalogue evidence

For the exact supported FM27 plugin, db::TEAM::set_comp_stats at 0x11EADC0
uses TEAM +A0 in-game data. At 0x11EAFCF it accesses the +50/+58/+60 vector.
0x11EB019 compares the first pointer of a 24-byte entry with the competition
argument; 0x11EB03B writes {competition pointer, stats pointer, category byte}.
Null stats pointers are deliberately retained for membership entries. The
existing team's division links supplement this list. Each accepted competition
must have exact COMP RTTI, a valid UID/name, and its rules must separately resolve
the current ACTUAL_COMP +B0 with reciprocal +120 to that COMP. A malformed list
is reported as incomplete; the catalogue does not claim all active competitions
were proven when that source cannot be read. Completed competitions retained by
FM in these team records may also appear. There is no full-world heap scan.

Phases come from ACTUAL_COMP +1C0, with the competition's reciprocal +70.
LEAGUE_STAGE (vtable 0x4DCF148) and SUB_LEAGUE_STAGE use LEAGUE_SETTINGS +F0,
fixture index +175. GROUP_STAGE (vtable 0x4DDC988) exposes its +D0 child vector
at virtual +378; each league subgroup is individually selected and validated.
There is no silent substitution of the first group's rules. CUP_GROUP_STAGE's
native league/cup predicates are false, so its route uses the competition default.

For CUP_STAGE (vtable 0x4DD8668), virtual +360 is 0x200D9D0. It accesses typed
CUP_SETTINGS at +90 and the rounds vector at +58. 0x1273366 reads the selected
round's fixture index +137. Phase and round names shown by the app are descriptive
ordinal labels, not invented official round names. Unsupported stage layouts
remain unavailable; no unconfirmed offset is used to write them.

An FF phase/round index uses ACTUAL_COMP +31. Rules are selected from the exact
+370 -> +1E0 -> vector +60[index] route, optionally its guarded direct +68 child.
A different positive owner UID is refused for that variant. Owner -1 is allowed
on this verified route, disclosed as potentially shared, and requires the existing
explicit shared-scope flag before opening a write handle. Client inputs are a UID,
a catalogue phase ID, a single-use backend token and a bounded count, never an
address or arbitrary native rule type.

## Supported fields

The native enum table 0x4EFEF50 defines each displayed player-count type. A fixed
allowlist includes match-squad U18/U19/U20/U21/U22/U23, over-21/22, homegrown
club/nation (0–21 or 15–21), foreign players (squad, match squad, XI, bench),
non-EU match squad, goalkeepers, loans and minimum/maximum squad size. Only
verified minimum modes 1/2 and maximum mode FF are editable, with existing and
requested integer values 0–99. Unknown types/modes/negative sentinels or larger
special defaults are read-only. No rule is added or deleted. This is not yet a
complete rules editor: points, substitution counts, extra time and unrecognized
registration/eligibility fields have no edit implementation. The UI says so.

The only writable bytes remain the selected record's four-byte quota +18.
Expressions/cutoff dates, mode/type, every other quota, pointers, vectors, process,
club, selected competition/phase ownership and date are immutable guards. All
values are revalidated before each write, then read back; conditional rollback
and explicit unreverted-field reporting remain. No player data, executable
patching, remote allocation or game function execution is introduced.

## Fixing the source-definition refusal

The user's beta.18 screenshot reports failure to find a unique source definition.
It establishes that preview failed, not whether there were zero or multiple
matches. Native copy 0x602770 (called by 0x236D339) copies each full 32-byte rule;
its source vector may contain null entries, which are now skipped but guarded.
Identical definition entries pointing at the same collection are deduplicated.
Only one full matching source collection can be edited alongside the current
record, with one exact counterpart for the selected row.

If that source cannot be resolved, the confirmed current FIXTURE_RULES +70 copy
can still be edited. This is explicitly temporary: only the selected active count
is written, never an arbitrary dated/future source. Irrelevant partial source
reads are not made write guards for this mode. The preview, each row, and the
receipt distinguish active-only editing from editing both active and matched
source copies. FM may restore an active-only change during rule rebuilds, save
loads or season changes; no background freeze or automatic reapply is installed.
This avoids pretending that a source ambiguity was resolved or deleting that
safeguard while allowing the user's known current U22 limit 3 -> 0.

## Interaction and limits

Opening either list only reads. Each row has an explicit 0–99 field and Save
button; unchanged or invalid values cannot be submitted. Every save is one row,
then preview refreshes and rebuilds all tokens. Generation guards discard stale
competition/phase responses. One in-memory undo restores the most recent compatible
change in that phase, with identical ownership/byte checks. Shared scope is reset
when switching competition/phase or reopening the modal, not after each row save.
A receipt is memory readback, not proof of match selection or career persistence.
The user must check the actual rules/bench in FM after an edit.

No tests are written or run at the user's explicit request. Frontend compilation
and the Windows installer build are the release gates; they cannot prove live
membership completeness, every competition layout or game behaviour.
