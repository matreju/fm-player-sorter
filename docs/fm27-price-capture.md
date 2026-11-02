# FM27 native price observation — beta.22

This is an opt-in observation tool, not the completed sale-fee column.
User-facing instructions are in price-capture-pl.txt and the player editor's
collapsed Próbny odczyt ceny z FM section. CDB x64 from Microsoft Windows SDK
Debugging Tools for Windows is required, detected in the standard Windows Kits
installation. It is not downloaded, bundled, installed or elevated automatically.

## Native evidence

Exact supported game_plugin SHA256:
bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f.

The earlier field +0x238 is the manually specified asking price. The native
PERSON_ASKING_PRICE_FILTER_RULE (0x408C6FE/0x408C71D) reads 0x1629F80 and
falls back to 0x15EF460. The newly traced BUY_OR_SELL_PLAYER_IMMEDIATELY_UI_HANDLER_SERVER
vtable 0x4B13FC8 +8 (0x21FED0) handles property PSap, obtains its player and
buyer, computes a value through 0x15F2C90, and calls 0x15EF460 at 0x220004.
That establishes a concrete native editor-side price computation. It does not
prove that every call/context returns a fee a club will accept for an ordinary
transfer proposal.

0x15EF460 is a large computation, not a scalar getter. Inspection found no
non-stack direct MOV result cache store inside this function. Callers may store
its result in their own structures, e.g. 0x195E07C, but the owner/lifetime and
player/buyer linkage of that cache are not confirmed. No such guessed cache is
used. No copy of FM's calculation or estimated price model is implemented.

## Observation

The backend prepares three fixed CDB scripts in its app cache. A nonce binds the
log to one prepared request. Preparation expires after 5 minutes. The backend
requires its existing exact-build/manager/process/player checks, the normal
ACTUAL_PLAYER person offset, native function prologue, live date, player team,
contract and game EUR/GBP rate. These are checked again before launch and after
CDB exits. Script guards check process ID, person UID (person component, NOT
player+0x0C), club UID, live date, current team and contract, with the function's
first 16 bytes additionally checked before the initial breakpoint.

CDB starts in a visible console with -pd -logo capture.log -cf capture.dbg,
empty inherited symbol-server paths, and the prepared directory as working
directory. This is invasive debugging: software breakpoints temporarily modify
instructions. It does not write gameplay/database values, inject a DLL, call
0x15EF460 itself, submit an offer or run an alternative calculation.

The entry breakpoint accepts only the exact selected player and either the
managed club pointer or an unspecified buyer. Both trailing stack arguments
must be zero, matching the inspected simple editor/filter call shapes. It records
RDX, R8D, R9D, return address, thread ID and expected post-return RSP, disables
the entry breakpoint and waits at the return address. Only that thread and exact
stack depth may produce a result; other hits continue. Result capture repeats
the identity guards, prints one nonce-tagged record, clears breakpoints and
uses qd to detach and exit. There is no automatic computation or traversal of
the player database.

There is NO unattended timeout. If FM uses a cache, does not execute the function,
throws/unwinds instead of returning, or CDB encounters an error, the user must
cancel after about 30 seconds using Ctrl+C then qd and Enter. -pd is an additional
detach-on-exit setting. This requirement is shown before launch, in the running
status, and in the generated instructions. Do not leave a capture unattended.

There is one capture at a time. Reopening the same player can recover the live
ticket; replacing a running ticket is rejected. All existing backend write
handles are blocked while the tracked CDB child remains running. The CDB child
is never force-killed by the app. Closing the app does not end its separate
visible debugger console; the user must still finish/cancel there.

The parser requires one complete matching nonce record after debugger exit,
range-valid hex fields, expected buyer and a return address inside the module.
Negative results and >=300,000,000 sentinels are unavailable, not sale fees.
The serialized report always has guaranteedSaleFee:false. It omits raw memory,
full CDB logs, addresses and local paths; only function-relative caller address,
input value/mode, identity and result are exported. Local CDB logs can contain
module/user paths, so are not copied into reports. Nothing is sent automatically.
No result is put into scouting rows, sorting or budget filters automatically.

## Validation still required

Frontend/Windows compilation checks packaging and language validity only. The
CDB script sequence, live detach paths, actual native call occurrence and quote
meaning require a supervised run in the user's FM. No live-game success or
accepted-offer price is claimed. Compare against the same buyer/date and exact
payment conditions (up-front money, instalments, bonuses, sell-on clauses).
A displayed matching number alone is not proof of unconditional acceptance.
Tests are skipped at the user's request.

Microsoft primary documentation used for the debugger integration:
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/cdb-command-line-options
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/qd--quit-and-detach-
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-----------------------a---run-script-file-
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/bp--bu--bm--set-breakpoint-
- https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/pseudo-register-syntax
- https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention
