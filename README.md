# FM Player Sorter

Desktopowa aplikacja Tauri do jednorazowego wczytywania zawodników z uruchomionego
Football Managera 26 i dalszej analizy bez eksportu HTML/CSV.

## Odczyt z FM26

1. Uruchom FM26 na Windows i wczytaj karierę.
2. Uruchom desktopową wersję FM Player Sorter.
3. Kliknij **Wczytaj zapis z FM26**.

Pełny skan pamięci jest wykonywany tylko po kliknięciu przycisku. Po imporcie
aplikacja zachowuje wynik w pamięci procesu i nie odczytuje ponownie wszystkich
zawodników przy zmianie dnia w grze.

Czytnik otwiera `fm.exe` wyłącznie z prawami `PROCESS_VM_READ` i
`PROCESS_QUERY_INFORMATION`. Nie wstrzykuje DLL, nie wymaga BepInEx i nie zapisuje
niczego w pamięci gry.

Aktualny profil obejmuje FM26 26.3.x i zwraca między innymi:

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

Po imporcie aplikacja co 2,5 sekundy wykonuje lekki odczyt zapisanej kotwicy
kalendarza. Nie uruchamia ponownie skanu zawodników. Ikona `!` pojawia się, gdy
wartość kotwicy różni się od tej z chwili importu.

W profilu 26.3.x dostępna publicznie, potwierdzona kotwica jest datą następnego
meczu zespołu, a nie centralnym zegarem świata. Może więc nie zmieniać się
codziennie podczas przerwy w rozgrywkach. Interfejs oznacza ten stan symbolem `~`
i nie przedstawia go jako dokładnego potwierdzenia. Dokładny adres `GameDate`
wymaga kalibracji na uruchomionym FM26 w dwóch kolejnych dniach gry.

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
