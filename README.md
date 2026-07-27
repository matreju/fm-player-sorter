# FM Player Sorter

Desktopowa aplikacja Tauri do jednorazowego wczytywania zawodników z uruchomionego
Football Managera 26 i dalszej analizy bez eksportu HTML/CSV.

## Odczyt z FM26

1. Uruchom FM26 na Windows i wczytaj karierę.
2. Uruchom desktopową wersję FM Player Sorter.
3. Przepisz dokładną datę widoczną w grze i kliknij **Połącz z grą**.

Pełny skan pamięci jest wykonywany tylko po kliknięciu przycisku. Aplikacja
rozpoznaje prowadzoną reprezentację, odrzuca zawodników innej narodowości jeszcze
przed kosztownym odczytem pełnych rekordów i zapisuje gotowy snapshot kadry w
lokalnej bazie IndexedDB. Zmiana dnia w grze nie uruchamia ponownego skanu.

Czytnik otwiera `fm.exe` wyłącznie z prawami `PROCESS_VM_READ` i
`PROCESS_QUERY_INFORMATION`. Nie wstrzykuje DLL, nie wymaga BepInEx i nie zapisuje
niczego w pamięci gry.

Aktualny profil obejmuje FM26 26.3.x i dla kandydatów do prowadzonej
reprezentacji zwraca między innymi:

- UID, imię, nazwisko, płeć, narodowość, datę urodzenia i wiek;
- klub, klub macierzysty, ligę, zespół i wszystkie pozycje;
- CA, PA, reputację, kondycję, morale, wzrost i obie nogi;
- 47 atrybutów piłkarskich i bramkarskich;
- 5 ukrytych atrybutów piłkarza oraz 8 ukrytych cech osobowości;
- wartość, cenę wywoławczą, pensję, datę końca kontraktu, numer
  w składzie i status transferowy.

Wynik jest akceptowany dopiero po walidacji UID oraz CA/PA i znalezieniu co
najmniej 500 spójnych rekordów. Po niezgodnej aktualizacji FM aplikacja zwraca
błąd profilu zamiast pokazywać częściowe lub losowe dane.

### Wskaźnik daty

Podana data kalibruje podczas pełnego skanu kandydatów centralnego zegara w
`fm.exe`, `game_plugin.dll`, `GameAssembly.dll` i na stercie. Po imporcie
aplikacja co 1,5 sekundy ponownie odczytuje tylko te adresy. Nie skanuje ponownie
zawodników. Ikona `!` pojawia się, gdy wiarygodny kandydat zmieni dzień.

Data terminarza drużyny nie jest już prezentowana jako bieżąca data świata gry.
Jeżeli w danym buildzie nie uda się znaleźć stabilnego kandydata, interfejs
pokazuje ten stan wprost zamiast wyświetlać nieprawidłową datę.

## Aktualizacje

Wersja 0.3.0 zawiera updater Tauri korzystający z podpisanych plików GitHub
Releases. W górnym pasku można sprawdzić wersję i zainstalować nowsze wydanie
bez ręcznego odinstalowywania aplikacji.

Workflow `.github/workflows/release.yml` tworzy szkic wydania, instalator NSIS,
podpis i `latest.json`. Repozytorium musi zawierać sekret Actions
`TAURI_SIGNING_PRIVATE_KEY` odpowiadający kluczowi publicznemu z
`src-tauri/tauri.conf.json`.

## Uruchomienie deweloperskie

Wymagane są Node.js, Rust oraz Windows:

```powershell
npm ci
npm run tauri dev
```

Kontrole projektu:

```powershell
npm run build
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

## Profil pamięci

Opis algorytmu, pól i zasad walidacji znajduje się w
[`docs/fm26-memory-profile.md`](docs/fm26-memory-profile.md).

Układ pamięci został zweryfikowany z publicznymi projektami
[FMSuperScout](https://github.com/mavarobli/FMSuperScout),
[FMScoutFramework](https://github.com/ThanosSiopoudis/FMScoutFramework) i
[FM Explorer](https://github.com/robeady/fm-explorer). Implementacja czytnika w
tym repozytorium jest zewnętrzna, tylko do odczytu i napisana niezależnie w Rust.
