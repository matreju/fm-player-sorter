# FM27 connection performance — beta.24

The normal connection used the diagnostic module inventory, hashing up to twelve
large game DLLs. It now hashes only GameAssembly.dll and game_plugin.dll, and
passes the already calculated GameAssembly hash into managed-layout selection.
Explicit module diagnostics retain the wider report. Full build validation is
still performed on every new connection; unknown layouts are not accepted.

The FM27 fast player registry was conditional on resolving a native club job
before the heap scan. The inherited FM26 human-registry signature cannot always
resolve that job. The fallback also compared an object's first pointer against
RVA 0x4CC086C, which is RTTI hierarchy data in the validated native binary, not
a vtable. That comparison could never identify a human manager in this build.

Binary inspection of game_plugin.dll SHA256
bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f establishes:

- HUMAN_NON_PLAYER type descriptor: RVA 0x568A2E0.
- Person secondary vtable: RVA 0x4CC08D8.
- Complete-object locator: RVA 0x4CC11B0, offset 0x440, type descriptor above.
- Staff vector begin/end: RVA 0x5703818 / 0x5703820, as independently
  documented in the primary fm-editor FM27 layout reference.

The exact-native-profile-gated reader now examines this bounded staff vector
before the heap fallback. It checks the Person vtable and its RTTI offset,
identity/name, real birth date, owned contract back-reference and a unique
contracted manager. Vector bounds and pointer contents must remain stable over
the read. It does not assume the last staff entry is the user. The platform
account placeholder and ambiguous multiple employed managers do not select a
club. A validated club then enables the existing player registry reader and
preserves manager identity for quick refresh. The older heap fallback remains
available if the direct path cannot establish a valid club/player index.

Connection UI now polls a lightweight stage string at most once per second,
with no overlapping polls. A fallback heap scan reports processed/total MB.
Quick refresh retains its own status and does not show stale full-load stages.

Validation: frontend production compilation and Windows installer compilation.
No live Windows/FM process is available here; actual timings, manager selection
and fast-path coverage still require verification in the user's save. No
specific speedup factor or maximum loading time is claimed. National-team
careers still use the existing binding/heap path where needed.
