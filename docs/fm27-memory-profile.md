# FM27 preview 0.6.0-beta.2

This is a **trial reader**, not verified live-game compatibility. It keeps FM26's
existing native field layout as a candidate, applies FM27's verified managed
layout, and refuses the import if structural validation fails. No game memory
is written and no BepInEx installation is required.

## Verified from uploaded FM27 files

Unity: `6000.3.18f1-custom (96cdb67fb884)`. Metadata format: **39** (FM26: 31).

| File | SHA-256 |
| --- | --- |
| fm.exe | `2a7318c6984bcb3a19ff3304432b63462581cee33ba203f9a0a118f11c69e27e` |
| GameAssembly.dll | `820d6618acafac7dffc1ef3b489582eddb84b0343d4f34d55fff9fb70881e00a` |
| global-metadata.dat | `a380792f33ba4eb048fa2ffebc6c504b001f85c76e4128e4d41ca24d7b017c4c` |

Cpp2IL `2022.1.0-pre-release.21+58fc404` successfully reconstructed 142649 method
pointers. Analysis used the DLL and metadata directly, without game_plugin.dll:

```
Cpp2IL --force-binary-path GameAssembly.dll --force-metadata-path global-metadata.dat --force-unity-version 6000.3.18f1 --use-processor attributeinjector --output-as dll_default --output-to fm27-assemblies
```

| Managed field | FM26 | FM27 |
| --- | --- | --- |
| Bindings.m_root | 0x40 | 0x50 |
| Bindings.m_nodes | 0x48 | 0x58 |
| Bindings.m_data | 0x78 | 0xA0 |
| GameWorldTabsAndBookmarksModule.m_bindings / m_currentHumanJobState | 0x208 / 0x230 | 0x308 / 0x370 |
| IGEModule.m_bindings / m_currentHumanJobState | 0x90 / 0x74 | 0xB0 / 0x94 |
| TileSearchPanel.m_bindings / m_currentHumanJobState | 0x5B0 / 0x5C0 | 0x398 / 0x3C0 |
| ReferenceRegistration.Initialise RVA | 0x2AA6E0 | 0x3343B0 |
| GameRecordSerialisation.get_Instance RVA | 0x2AE010 | 0x337960 |
| GamePlugin.get_ChannelDataPool RVA | 0x2A8D50 | 0x332630 |

Bindings.Node and Bindings.Data fields used by the reader, DatabaseRecordReference
index/type offsets, and the relevant DatabaseTableType values remain unchanged.

The native reader selects FM27 only for the matching GameAssembly + metadata
hash pair. An unknown metadata generation or changed FM27 build is rejected.
The diagnostic profile checker uses the corresponding method RVAs and hashes,
so it no longer probes FM26 methods in an FM27 binary.

## Live validation still required

Native offsets have not been tested in this environment against live FM27.
The public [fm-editor FM27 discovery notes](https://github.com/barak14/fm-editor/blob/main/docs/fm27/memory-layout.md)
provide independent witness evidence for the unchanged Player/Person/Contract
fields and a changed human-manager Person offset: **0x440** (staff identity
shift 0x340), compared with FM26's 0x450. This offset is selected per edition.
A read-only fallback identifies the unique real human manager by its documented
vtable, nonempty DOB and back-linked contract; it excludes the platform account
placeholder. The fallback is enabled only for the documented game_plugin SHA-256
`bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f`.
No third-party implementation is copied; these are field-location facts.
The registry byte signature remains inherited and unverified. In addition to existing national
team consistency checks, the preview checks a deterministic sample of up to
128 native player records (names, birth dates, nation strings, CA/PA, positions,
and attributes); at least 90% must pass. This is a corruption check, not proof
that every field has the correct meaning. A failed check imports no records.

Season statistics search only the active edition's document directory. The
existing fmsave parser is tried against the FM27 save and may return no season
statistics if its format is unsupported; it never falls back to an FM26 save.
Logos are also restricted to the current edition.

## Windows test

Install the prerelease, start FM27, load a national-team career, and choose
**Połącz z grą**. Check the managed nation and several known player attributes
against the game. If reading fails, the dialog contains the profile name and
native class/binding diagnostics needed for the next adjustment.

The GitHub prerelease does not replace the stable FM26 updater endpoint.
