# Ekstraklasa U22 quota editor — beta.15

This adds a narrow experimental 3 -> 0 scalar edit for the known FM27 plugin
SHA256 bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f.
It has not been exercised against a live game here. Windows/frontend compilation
is not a live verification. No tests are run at the user's request.

## Evidence from the supplied binary

The earlier AGE_EXTRA_SQUAD_SELECTION_RULE heap scan was the wrong abstraction
for a minimum headcount quota. Those objects describe additional age restrictions
or eligibility; a zero-sample report does not identify a quota to write.

The native enum name/value table at RVA 0x4EFEF50 contains
`under_22_players_in_match_squad` at 0x4EFFA50, mapping to enum 0x16.
`under_22_players_in_11` is instead 0x2C; U22 in registered squad is 0x8D.
These must not be conflated with match-squad U22 or automatic U21 registration.
The age decoder 0x49C11D0 dispatches 0x16 to 0x49C1204, setting the upper-age
parameter to 22. This is independent evidence for the enum interpretation.

SQUAD_SELECTION_RULE is a 0x20-byte non-polymorphic record. Native constructor
0x4982300 stores type at +0x1C (u16), quota +0x18 (i32), mode +0x1E (byte),
and zeroes the first 24 bytes for an unconditional rule. These first 24 bytes
can otherwise contain conditional expressions, so conditional records are refused.
Serialization at 0x49C4590 reads type as 2 bytes, mode as 1 byte, expressions,
and finally quota as 4 bytes; the quota is a saved data field, not UI text.

Native predicate 0xCC2C0 -> 0x6256400 compares selected-player counts with
+0x18. Mode 0xFF is an upper limit; minimum mode 1 compares count plus remaining
slots >= quota at 0x6256555. Mode 2 is a related minimum/soft-constraint mode
selected by the minimum-mode branch. Only modes 1/2 are accepted, never exact,
maximum, percentage or arbitrary values. 0x49C41A0 independently distinguishes
minimum vs upper-limit direction. Constructor default 1000 is an unrestricted
large default, not a fixed-point unit; the core count predicate compares integers.
The 0.05 multiplier in 0x49C41A0 is a tolerance used in a separate check.

The mismatch collection code around 0x2401692 handles minimum modes 1/2 and
copies violated rules only when their counted deficit is positive. Setting an
actual minimum from 3 to zero therefore removes the U22 shortage which feeds
the sanction. This implementation does not patch executable checks, change the
number of normal substitutes, or claim that a separately stored penalty setting
was discovered and disabled. Live selection/bench behaviour still needs checking.

## Live ownership path and refusal conditions

No address from the user's JSON report is reused. All addresses are resolved
anew from the connected managed club and held server-side:

- Team +0x50/+0x60 -> unique COMP UID 129558, with matching native RTTI.
- COMP +0xB0 -> ACTUAL_COMP, reciprocal +0x120 -> the same COMP.
- ACTUAL_COMP vector +0x1C0 -> exactly one LEAGUE_STAGE; reciprocal +0x70 COMP.
- LEAGUE_STAGE +0xF0 -> typed LEAGUE_SETTINGS, rules index +0x175.
- A 0xFF stage index uses ACTUAL_COMP +0x31. Indices must be nonnegative i8.
- ACTUAL_COMP +0x370 -> owner +0x1E0 -> fixture-rules vector +0x60[index].

The stage/index routing is independently visible in 0x1273220 and 0x12639E0.
Only the straightforward unique league-stage case is supported; multiple phases
are refused. Competition UID 129558 is explicit scope, not a guessed name match.
FIXTURE_RULES +0x108 must equal that competition UID when a quota is selected;
country-wide/unowned rules are refused. Optional +0x68 child is the same native
preference used by 0xDFBAC0; it may be covered if independently confirmed. Deeper
variants/cycles are refused. No sibling objects inferred by the old prefix scan
(e.g. stage +0x240/+0x2C0) are accessed.

The current quota collection is FIXTURE_RULES +0x70. Native 0x236D1E0 rebuilds
it by copying the collection pointed to by a dated definition from the vector
at +0x18. Its selector 0x236D770 excludes disabled definitions (flags bit0x80)
and requires bit0x20 for the selected squad-rule set. We require a unique
complete match of the current collection to a permitted source collection,
including every 32-byte rule and the trailing collection metadata at +0x18.
A numeric match on a lone 3/22 is never enough. All non-quota bytes and the
ownership chain are guarded; source and current quota copies change together.
The source definition is not chosen by translating arbitrary date patterns or
editing every season. Ambiguous/unmatched source definitions block the write.

Only one unconditional type0x16 minimum per collection, initially exactly 3,
is accepted; 0 is recognized as already zero. All touched copies must agree.
Rules for starting XI, nationality, homegrown status, U21, registration, other
leagues and future unmatched definitions remain untouched. This is a whole-league
change for the selected league-phase rules, not a club/player exemption.

## Write/undo and practical limits

Only a user-clicked apply opens a write handle. The client submits a single-use
five-minute preview token, no addresses, offsets, quotas or memory blocks.
Every write is exactly four bytes at a server-resolved rule +0x18. The process,
creation time, plugin, session, managed team/club, live date, every captured
pointer/list/type/expression, and all expected quota values are checked before
the first write, before each write and at the end. write_exact reads back bytes.
Failure attempts conditional rollback without overwriting reused/changed data,
and explicitly reports any unconfirmed rollback. This is not atomic with FM;
users must pause and operate outside an already-running match.

Undo holds the exact inverse patches in memory for the current application
session and repeats ownership/byte checks. A changed date alone is allowed on
undo, but changed structures are not. The UI reports memory readback, not an
unobserved successful match selection. Users reopen FM's rules/selection screen,
verify behaviour, and save the career in FM. Rule rebuilds, XML overrides, a new
season or loading a save may change the data again; no background auto-reapply
or frozen enforcement is installed. If refused, the UI gives the actual reason
and does not fall back to a heuristic heap scan or a birth-date change.


## beta.16: do not discard minima with qualifying expressions

The user's beta.15 screenshot reports the final no-unconditional-minimum error
while FM still displays at least 3 U22 born after 2005-12-31 with a reduction
in substitutions. This establishes that preview rejected the current rules and
no write occurred. It does not reveal the actual record bytes, mode or index.
Do not claim the screenshot proves a particular mode, expression or quota address.

The beta.15 predicate incorrectly required the first 24 bytes of a minimum to be
zero. Native quota evaluation uses +0x18 independently of these expression fields;
nonzero qualifiers do not make an already-active minimum absent. beta.16 accepts
the same exact type0x16 and verified minimum modes1/2 while retaining all qualifiers
as immutable exact-byte guards. It still requires a unique full source/current
match, competition UID, phase, initial quota3 and all other ownership checks.
Only the four quota bytes change. No age, cutoff-date, condition or mode is patched.

Unsupported modes (including4/5), missing type0x16, owner mismatches and unmatched
source definitions still block writes. A no-match now explains that the app failed
to resolve the displayed rule, rather than suggesting the game has no such rule.
It includes a bounded summary of the exact-path rows (type/mode/quota, plus whether
U22 has qualifiers) without addresses or raw expressions. Copying the error is an
explicit user action; no report is sent anywhere and no heap scan is added.
The UI labels failures as an unconfirmed operation, preserving explicit backend
partial-write/rollback warnings rather than claiming every failure changed nothing.

The fix addresses one definite predicate bug. Until a new live preview succeeds,
the screenshot also leaves open an unsupported native mode or a different
match-specific fixture-rule index. Do not relax either of those protections based
only on the text visible in FM. Live behaviour remains unverified here.


## beta.17: ownership refusal evidence, not a relaxed write gate

The user's beta.16 reports the fixture-owner refusal. The rejection occurs after
finding type0x16 with a supported minimum mode, and before staging any write.
It does not prove whether the mismatch is on the phase root or +0x68 child,
or whether the actual owner is a different competition or an unowned sentinel.

Native 0x1263D5E compares FIXTURE_RULES +0x108 to COMP +0x0C. It also has a
parent-competition path and 0x12641BC permits a -1 owner in one selector. These
are evidence that simply deleting the competition check could alter shared rules;
they are not evidence that this user's target is exclusive to Ekstraklasa.

beta.17 preserves the exact ownership requirement and all write/undo behaviour.
The refusal now includes signed/hex actual owner, expected league UID, root vs
child route, stage/default/resolved index, phase-root owner and existing bounded
U22 type/mode/quota observations. No process addresses or raw expressions are
exposed. The existing Copy message button copies this user-visible text only;
there is no upload, heap scan or separate diagnostics workflow.

This release gathers the missing evidence in the already-blocked preview; it
does not claim to fix the ownership mismatch or disable U22 in the user's save.
Live readback of that evidence is still required to choose a correct ownership
resolution without touching another competition or a shared default.


## beta.18: the native default-route sentinel

The user's beta.17 live preview reports stage indexFF, actual default index1,
root ownerFFFFFFFF (-1), exact match-squad U22 type0x16, minimum mode1, quota3
and nonzero qualifiers. This confirms the immediate ownership rejection; it
does not establish that the collection or its dated source is league-exclusive.

Native 0x1263A1D substitutes ACTUAL_COMP +0x31 for an FF input index. At
0x1263ADA the index selects the exact FIXTURE_RULES pointer from the validated
container vector without demanding a nonnegative owner. Native 0x12641BC also
recognizes ownerFFFFFFFF in an alternate selector. An unowned/default fixture
is a valid rules source, not a missing competition or a corrupt UID.

beta.18 accepts ownerFFFFFFFF only when the verified single Ekstraklasa stage
has indexFF and its exact selected root fixture also has ownerFFFFFFFF. It does
not scan sibling fixtures or accept a different positive competition UID. The
root/child pointers, stage/default index and owner sentinel are immutable guards.
The optional direct native child can use the same default scope, without allowing
deeper variants. Exact plugin/session/date checks, unique complete source/current
matching, minimum modes1/2, quota3 and all expression guards remain unchanged.

Because neither the sentinel nor a successful traversal proves exclusivity,
sharedDefault is retained in the backend draft, snapshot and write/undo receipts.
The preview plainly states that the change may affect other competitions using
the same list or source definition. The apply button stays disabled until the user
selects that scope. The backend independently requires acceptSharedDefault for
a shared draft, defaulting omitted command arguments to false and retaining the
preview on rejection. It checks this before opening the write handle. Undo of an
already-authorized write restores exactly the stored values with existing guards.
The app never writes merely on preview/open. No player-age/eligibility edits,
remote allocation, background freezing or executable patches are introduced.

This fixes the specific owner-1 rejection from the supplied live readout, but a
subsequent source-match or consistency refusal remains possible and must not be
bypassed. Compilation is not proof of the resulting bench behaviour in FM.
No tests are run per the user's explicit preference.
