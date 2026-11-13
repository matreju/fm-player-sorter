# FM27 27.0.0+2493426 native compatibility — beta.25

The 2 November FM27 update replaced `game_plugin.dll`. Its exact Windows x64
identity is:

- file version: `27.0.0+2493426`;
- raw SHA-256: `252ff8fb5b7a4a5a5464db6ba632e309eef9b6e65ffa992ae20575a189e66c6a`;
- normalized PE layout SHA-256:
  `f5ae562d4735f65575e71fc71304bffa62a8ccf3f125e25d45ac1ed2182c6a39`.

The normalized identity masks only the parsed COFF timestamp, PE checksum and
CodeView GUID/age. It retains code, data, section layout, RTTI and relocations.
The previous `2486695` identity remains a separate supported profile.

## Static layout evidence

The update inserted `0x2000` bytes before the native RTTI/data layout. Every
independently checked type moved by exactly that amount while retaining its
type name and complete-object-locator offset:

| Native type | 2486695 vtable RVA | 2493426 vtable RVA |
| --- | ---: | ---: |
| `HUMAN_NON_PLAYER` person subobject (offset `0x440`) | `0x4CC08D8` | `0x4CC28D8` |
| `FULL_CONTRACT` | `0x4B00AE8` | `0x4B02AE8` |
| `CURRENCY_RECORD` | `0x4ED4398` | `0x4ED6398` |
| `ACTUAL_PLAYER` primary | `0x4D27228` | `0x4D29228` |
| `CLUB` | `0x4CDA1F8` | `0x4CDC1F8` |
| `NATION` | `0x4CDF658` | `0x4CE1658` |
| age squad-selection rule | `0x4DF74B8` | `0x4DF94B8` |
| under-age eligibility rule | `0x4E27288` | `0x4E29288` |

The corresponding type descriptors and complete-object locators have the same
`0x2000` delta. The `.data1` start, writable native-data range and the global
entity-array cluster moved by that same delta. The reader therefore selects a
profile-specific native RVA shift instead of treating the patched DLL as the
old binary or weakening the exact-build gate.

The shift is applied to manager/staff and player registries, the world date,
kit colours, currency tables, contract and rule RTTI checks, the native data
bounds and the fast refresh identity. Struct field offsets remain unchanged.
Every pointer, RTTI name, vector bound, owner link and read-back guard is still
validated before data is published or written.

## Deliberate limitation

The supervised price-calculation function is code, not native data. Its old
entry-point signature is still checked at the old build's exact RVA and does
not receive the data-layout shift. On `2493426` that experiment remains blocked
until the new function is independently resolved. Normal stored asking-price,
contract, player, colour and league-rule paths do not call that function.

Static inspection and the frontend production build can be completed without a
running game. Actual manager selection, counts, colours and writes must still
be confirmed against a paused FM27 save before describing the new profile as
live-verified.
