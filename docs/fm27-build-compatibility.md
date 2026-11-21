# FM27 debug-only rebuild compatibility — beta.23

Memory profiles are shared build/layout identities, not per-user or per-PC
licenses. Module bases, install directories, processes, managers and saves are
resolved from the local running game. Windows builds with supported equivalent
binaries use the same profile. A different storefront/platform can still have
a different native layout.

## Supplied-file analysis

Old GameAssembly SHA256:
820d6618acafac7dffc1ef3b489582eddb84b0343d4f34d55fff9fb70881e00a

New uploaded GameAssembly(1).dll SHA256:
3f20a3829a1194c200d82bdc95b717cdeaf1b7a348eecbe6520bce7af9c0c588

Both files are 59,361,792 bytes, image size 0x3B50000. There are exactly 28
changed bytes in five file ranges:

| Offset (file) | Changed bytes | Meaning |
| --- | --- | --- |
| 0x130–0x132 | 3 | COFF timestamp |
| 0x301EA14–0x301EA16 | 3 | CodeView debug-entry timestamp |
| 0x301EA30–0x301EA32 | 3 | VC feature debug-entry timestamp |
| 0x301EA4C–0x301EA4E | 3 | POGO debug-entry timestamp |
| 0x3020058–0x3020067 | 16 | RSDS PDB GUID |

.text, il2cpp, .data, .pdata, _RDATA, .fptable and .reloc are byte-identical.
All .rdata differences are the debug fields above. MetadataRegistration remains
at RVA 0x2E01260: 20,004 types; field offsets at 0x3224AD0; size pointers at
0x324BBF0. Relevant codegen module method counts/pointers are also unchanged.
This establishes compatibility of the supplied GameAssembly's code/data layout;
it does not establish arbitrary future patches or a different metadata file.

## Selection

Existing exact raw SHA256 pairs remain accepted. For FM27, when the raw assembly
hash changes, fm_pe parses the x64 PE and produces a second SHA256 after zeroing
only COFF TimeDateStamp, OptionalHeader.CheckSum, each IMAGE_DEBUG_DIRECTORY
TimeDateStamp, and RSDS CodeView GUID+age. The signature, PDB path, section headers,
all code, all other data, relocations, overlay and file length stay in the hash.
It does not skip entire debug sections or accept a checksum/version number.
The metadata hash must still match the original verified metadata file.

The old and uploaded GameAssembly both normalize to:
01e6803b280359dc3300cc1599c7211463243fafce229671dc045232b8a67837

The same conservative normalization supports debug-only variants of the known
native game_plugin. Its reference raw SHA256 is
bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f;
normalized SHA256 is
499016330f23753163aab6c220cb76ac413a2038fa86b37954b5833720eddd61.

Only an exact raw hash or exact normalized identity grants the native profile ID.
All existing fast-registry/editor/rule/price guards use this compatibility ID;
the module report's raw SHA256 remains the real file hash. Unknown native code
retains the previous reader's trial fallback and does not gain any fingerprint-
guarded editor, currency, date, league-rule or native-calculation capability.
An actual code/data change is not declared equivalent by this mechanism.

## Parser bounds and performance

Only AMD64 PE32+ is handled. DOS/PE headers, optional headers, sections and RVA
mapping are checked against file bounds; ambiguous mappings, overlapping masks,
inconsistent CodeView RVA/file pointers and oversized debug directories fail.
Data is streamed in 1 MiB chunks; a 414 MiB plugin is not buffered in RAM.
Raw and normalized digests are produced in one pass. A result is accepted only
if its raw digest matches the caller's fresh SHA256; changing files are rejected.
A bounded process-local cache is keyed by the full raw hash, not a PC path,
file date or size. Quick-refresh sessions carry the recognized native identity
and do not rehash the DLL.

FM26's existing version-31 selection is unchanged. The profile inspector now
uses the same GameAssembly identity rule as the reader. No game/save writes or
binary modifications are performed by the fingerprint function.

No unit/UI tests were added or run, as requested. Supplied-binary comparison
and fingerprint extraction were data analysis; installer publication is gated
by frontend and Windows compilation. Live connection after installation still
requires confirmation in the user's running FM.

PE field semantics: Microsoft PE/COFF specification and Microsoft .NET
PE-COFF/CodeView documentation:
https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
https://github.com/dotnet/runtime/blob/main/docs/design/specs/PE-COFF.md
