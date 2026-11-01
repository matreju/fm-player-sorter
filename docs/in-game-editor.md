# In-game player editor — 0.7.0-beta.12

Experimental, read-back-verified memory editing for the exact uploaded FM27
plugin SHA256 bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f.
No writes to save files, executable code, allocations or arbitrary client addresses.
FM26 and unrecognized FM27 layouts remain read-only. Not validated in a running
FM session here. Compilation alone does not establish live-game correctness or
persistence after saving/loading the career. Pause FM and retain a separate save.

## Supported player fields

CA and PA at native Player +0x264/+0x266 (u16, 1–200, final PA >= CA),
Person birth date +0x88 (packed year/day-of-year; retain middle flag bits),
47 visible and 5 hidden attributes at the existing verified PLAYER_ATTRIBUTES
mapping (raw 1–100, editable UI 1–20 stored as value*5), and eight existing
Person personality bytes (1–20). Unknown/unreadable scalar attributes are not
exposed as editable values. Birth dates require a confirmed game date and valid
Gregorian month/day including leap years, and cannot be in the future.

## Write lifecycle

Preview is read from the live game, tied to session, process creation time,
player UID, player/person addresses and recognized native Person vtable. Clients
submit only field keys and values against a short-lived server-held preview token.
Addresses/old raw bytes/encodings are never accepted from the client. Drafts expire
after five minutes and are single-use. Manager/club identity is checked with the
same native identity validator used by refresh. Only apply/undo open a separate
handle with VM_WRITE/VM_OPERATION; normal readers retain read-only handles.

Before writing, validate all changes, all original bytes and player identity.
Compare original bytes again immediately before each small field write and read
back the exact bytes afterwards. If a step fails, attempt conditional rollback of
already attempted fields whose current bytes still equal the just-written bytes;
never restore over changed/reused records. Report unreverted fields explicitly.
This is not an atomic transaction with FM and does not suspend its threads.
The user must pause the game; another process/game code can still race a write.

An undo token retains exact old/new bytes for up to eight recent edits; undo also
requires the same session/record and unchanged current bytes, and follows the same
write/read-back path. UI updates only from a live row read; transient row read
failures keep the write receipt and undo handle and ask for a data refresh.
Transfer indexes are invalidated after writes/rollback to avoid sorting/filtering
against old CA/PA/attributes. UI edit results include session IDs to prevent an
in-flight old-session reply from updating a newly loaded career.

Open from a player's details with Edit in game, or click a name in Transfers.
The UI shows a before/after preview, explicit Save to game, and an undo action.
Changes persist into a career file only when the user saves in FM. FM can later
rebalance attributes according to CA/development; this does not freeze attributes.
No tests are run at the user's request; frontend/Windows compilation only.

## Ekstraklasa U22 match-squad rule — editing NOT implemented

The uploaded DLL has AGE_EXTRA_SQUAD_SELECTION_RULE (RTTI RVA 0x56CA7B0,
vtable 0x4DF74B8) and UNDER_AGE_PLAYERS_ELIGIBLE_EXTRA_SQUAD_SELECTION_RULE
(RTTI 0x56CDF50, vtable 0x4E27288). They are distinct rule types; age-extra
serialization at 0x2727640 uses +0x14 (one byte), +0x10/+0x12 (two-byte fields),
and further rule data. Finding these types does not prove which object applies
to the active season/stage of the user's Ekstraklasa, nor which field is the
minimum U22 quota vs eligibility/registration/substitute rule. No league-rule
memory writes, guessed quota offsets or placeholder editable controls are shipped.
Still needed: a verified path from the live managed club/competition to its active
season/stage rules and runtime confirmation against the supplied U22 requirement text.

## Rule screenshot and bounded diagnostics — 0.7.0-beta.13

The user's 2027/28 league-phase screenshot distinguishes:
- At least 3 U22 in the match squad, born after 2005-12-31. The described
  sanction reduces available match substitutions when the requirement is missed.
- U21 automatic eligibility (a separate registration/eligibility rule).
- 12 bench players; up to 5 substitutions in 3 stoppages.
- Squad registration: at least 3 club-trained, 5 nation-trained, maximum 25.
The image does not say that the 3 U22 must all start in the XI.

The AGE_EXTRA_SQUAD_SELECTION_RULE serializer/property map at 0x2727790 /
0x2727B30 supplies +0x14 (egar), +0x10 (agcd, packed date), +0x15 (reag).
Its constructor family around 0x237BFB9/0x237C00F builds kind 11 and may set
+0x15 from source +0x11C when source +0x115 bit0 is set. These facts do not
establish +0x15 as the required U22 count or link an object to the active stage.
No field is exposed for editing based only on a numeric match with the image.

A club-only, on-demand read-only diagnostic command now returns a small report:
current club/session/game date; candidate competition records from the existing
team +0x50/+0x60 lookup; heuristic typed links up to 96 nodes/512 links/depth3;
up to 256 age-rule samples with exact known vtables, native kind/date/age/extra
parameter and a second-read stability flag. Neighbor ages 19–24 are included
because native fields can encode exclusive bounds. Heap scan is streamed in
8 MiB chunks, bounded to 2 GiB / approximately 20 seconds, and omits regions
larger than the existing reader's 512 MiB cap. Limits/read failures are reported.

Typed links inspect bounded prefixes/vector candidates; object sizes and active
ownership are not confirmed by this heuristic. Samples can be cached, unrelated,
or from other leagues/seasons. No sample, address, or matching parameter is an
edit authorization, and no samples does not prove that no rule exists. The report
never calls a game function or opens a write handle. No full memory dump, player
records, arbitrary raw heap blocks, user path names or credentials are exported.
The user explicitly copies JSON for follow-up analysis; nothing is sent remotely
by the application. Game/session/manager identity is checked before and after.
This is a diagnostic step towards rule editing, not completed league editing.
