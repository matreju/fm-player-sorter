# Właściwy start: zewnętrzny reader FM26

Ten pakiet robi dwie rzeczy:

1. usuwa niedokończony bridge BepInEx, który miał działać jako plugin wewnątrz gry;
2. buduje statyczny profil IL2CPP na podstawie:
   - `GameAssembly.dll`,
   - `fm_Data\il2cpp_data\Metadata\global-metadata.dat`.

FM26 używa Unity IL2CPP. Dlatego właściwym pierwszym krokiem nie jest zgadywanie adresów ani szukanie daty, tylko odzyskanie:

- RVA metod,
- offsetów pól,
- tokenów typów,
- układu `GamePlugin`, `GameInteropSubsystem`, `PersonSearch`, referencji osób i właściwości.

Profil będzie później używany przez zewnętrzny reader Rust:

```text
Tauri/Rust
→ OpenProcess(PROCESS_VM_READ)
→ GameAssembly.dll + ASLR
→ profil RVA/offsetów dla konkretnego hasha
→ odnalezienie instancji i kolekcji
→ odczyt wszystkich zawodników
```

## 1. Sprzątanie

Z głównego folderu projektu:

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File .\cleanup-wrong-bridge.ps1
```

Skrypt usuwa wyłącznie:

- `bridge-step1`,
- `fm-bridge`,
- `fm_bridge.rs`,
- `fmDatabaseBridge.ts`,
- `FmDatabaseBridgePanel.*`,
- niedokończony plugin `FMPlayerSorterBridge`,
- wpisy tego modułu z `lib.rs` i `FmConnectionPanel.tsx`.

Nie usuwa:

- `FM26PlayerExport`,
- BepInEx,
- `BepInEx\interop`,
- `BepInEx\cache`,
- `fm_process.rs`,
- `fm_memory.rs`,
- `fm_build.rs`,
- `fm_modules.rs`,
- `sha2`.

## 2. Utworzenie profilu IL2CPP

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File .\prepare-fm26-il2cpp-profile.ps1
```

Skrypt:

- sprawdza pliki FM26,
- oblicza SHA-256,
- pobiera natywny Windows build Cpp2IL,
- uruchamia analizę,
- wyciąga istotne typy, pola, offsety i adresy metod,
- zapisuje profil.

Nie potrzebuje .NET SDK.

## 3. Pliki wynikowe

```text
C:\dev\fm-player-sorter\tools\fm26-il2cpp\fm26-build-manifest.json
C:\dev\fm-player-sorter\tools\fm26-il2cpp\fm26-il2cpp-profile.json
C:\dev\fm-player-sorter\tools\fm26-il2cpp\fm26-il2cpp-summary.txt
C:\dev\fm-player-sorter\tools\fm26-il2cpp\cpp2il-run.log
```

Do kolejnego etapu przekaż:

- `fm26-il2cpp-profile.json`,
- `fm26-il2cpp-summary.txt`,
- `cpp2il-run.log` tylko gdy analiza się nie powiedzie.

## 4. Co powstanie po profilu

Następny moduł w `src-tauri` będzie już właściwym external readerem:

```text
fm_il2cpp_profile.rs
fm_remote_process.rs
fm_game_plugin.rs
fm_person_search.rs
fm_player_mapper.rs
```

Wtedy dopiero dodamy docelowy przycisk:

```text
Wczytaj bazę danych
```

Bez BepInEx pluginu, bez skanowania daty i bez ręcznego przewijania tabel.
