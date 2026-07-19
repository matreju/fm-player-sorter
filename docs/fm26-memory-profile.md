# Profil pamięci FM26 26.3.x

## Przepływ odczytu

1. Wykrycie `fm.exe` i otwarcie procesu tylko do odczytu.
2. Odczyt załadowanych `game_plugin.dll` oraz `GameAssembly.dll`.
3. Enumeracja prywatnych, zatwierdzonych regionów read/write.
4. Skan wyrównanych wskaźników vtable i odczyt dynamicznego offsetu klasy z
   metadanych vtable.
5. Rozpoznanie klas `Player` (`0x288`) i `Player/Staff` (`0x380`).
6. Walidacja UID oraz zakresów CA/PA przed odczytem rekordu.
7. Powiązanie zawodników z klubami przez listy zespołów i kontrakty.
8. Zbudowanie jednego niezmiennego snapshotu dla frontendu.

Skan nie zapisuje adresów ani wartości do procesu FM.

## Główne pola

| Obiekt | Pole | Offset |
|---|---|---:|
| Person | UID | `0x0C` |
| Person | imię / nazwisko / nazwa zwyczajowa | `0x50` / `0x58` / `0x60` |
| Person | narodowość | `0x68` |
| Person | osobowość | `0x70–0x77` |
| Person | data urodzenia | `0x88` |
| Person | pełny kontrakt | `0xA8` |
| Player | pozycje | `0x150` |
| Player | atrybuty | `0x15F` |
| Player | wartość / cena wywoławcza | `0x234` / `0x238` |
| Player | kondycja | `0x258` |
| Player | reputacja | `0x25E–0x262` |
| Player | CA / PA | `0x264` / `0x266` |
| Player | morale | `0x26C` |
| Contract | klub / pensja / koniec / status / numer | `0x10` / `0x20` / `0x48` / `0x57` / `0x5D` |

Atrybuty piłkarskie są zapisane jako bajty w skali pięciokrotnej i są
zaokrąglane do zakresu 0–20. Cechy osobowości są zapisane bezpośrednio w
skali 1–20.

## Zasady bezpieczeństwa

- proces jest otwierany bez `PROCESS_VM_WRITE` i bez `PROCESS_CREATE_THREAD`;
- każdy wskaźnik jest czytany przez `ReadProcessMemory`;
- nieczytelny region lub wskaźnik jest pomijany;
- rekord wymaga niezerowego UID oraz CA i PA w zakresie 1–200;
- wynik poniżej 500 zawodników jest odrzucany w całości;
- profil nie zwraca częściowego snapshotu po błędzie walidacji.

## Data gry

`[team + 0xA0] + 0x94` (alternatywnie `+0x18`) zawiera datę następnego meczu.
Adres może być ponownie odczytywany bardzo tanio i służy obecnie jako
wskaźnik zmiany snapshotu. Nie jest to centralny zegar gry: w przerwach między
meczami może pozostać bez zmian mimo przejścia do kolejnego dnia.

Profil IL2CPP potwierdza istnienie `FM.GamePlugin.GameDate` z pakowaną datą oraz
zdarzenia `EventFmxDateChange`, ale stabilny zewnętrzny pointer-chain do bieżącej
instancji nie został jeszcze potwierdzony. Do jego przypięcia potrzebny jest raport
z tego samego procesu FM26 przed i po przejściu o jeden dzień.
