---
status: complete
phase: 02-triedy-a-u-ite-sk-flow
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-03-28T11:00:00.000Z
updated: 2026-03-28T11:30:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Teacher dashboard prístup
expected: Ísť na /teacher. Ak si prihlásený ako učiteľ alebo superadmin, uvidíš dashboard s hlavičkou "👨‍🏫 Dashboard učitele" a zoznam tried (príp. prázdny stav). Ak nie si prihlásený, uvidíš výzvu na prihlásenie.
result: pass

### 2. Vytvoriť triedu (GDPR checkbox)
expected: Kliknúť "+ Vytvořit třídu". Otvorí sa modal s názvom triedy a checkboxom GDPR ("škola má souhlas rodičů..."). Tlačidlo Vytvořit je neaktívne kým checkbox nie je zaškrtnutý. Po zaškrtnutí a potvrdení sa zobrazí invite kód vo formáte PX-XXXX.
result: pass

### 3. Invite kód — kopírovanie
expected: V InviteCodeDisplay je zobrazen kód PX-XXXX + plný join link (https://pexedu.com/join/PX-XXXX). Kliknutím na copy tlačidlo sa link skopíruje do schránky a zobrazí sa sonner toast.
result: pass

### 4. Priradiť sadu k triede
expected: V detaile triedy kliknúť "+ Přiřadit sadu". Otvorí sa modal so sekciou zabudovaných sad (Vlajky, Zvířátka, atď.) a vlastných sad. Kliknúť Přiřadit → sada sa pridá do zoznamu assignments a modal sa zatvorí.
result: pass

### 5. Duplikátne priradenie sady blokované
expected: Keď je sada už priradená, tlačidlo Přiřadit sa zmení na "Přiřazeno" (disabled, bez farby). Nie je možné priradiť tú istú sadu dvakrát.
result: pass

### 6. Žiak — join cez /join/PX-XXXX
expected: Otvoriť /join/PX-XXXX (platný kód). Ak si prihlásený, zobrazí sa potvrdzujúca obrazovka a po potvrdení si pridaný do triedy. Ak nie si prihlásený, najskôr sa presmeruje na prihlásenie a po prihlásení sa join dokončí automaticky.
result: pass

### 7. AssignedDecksBanner na setup screene
expected: Ak si žiak v triede ktorá má priradenú sadu, nad deck selectorom na setup screene sa zobrazí banner s názvami priradených sad ako klikateľné tlačidlá. Klik na sadu ju vyberie.
result: pass

### 8. Rozbaliteľné výsledky assignmentu
expected: V detaile triedy kliknúť na riadok priradenej sady → rozbalí sa tabuľka výsledkov žiakov. Klik znovu → zavrie sa. Výsledky sa načítavajú len po kliknutí (nie automaticky pri načítaní stránky).
result: pass

### 9. Farebné kódovanie výsledkov
expected: V tabuľke ClassResults sú skóre farebne odlíšené: zelené >=70%, jantárové 40–69%, červené <40%. Posledný riadok ukazuje priemer triedy.
result: pass

### 10. CSV export výsledkov
expected: V tabuľke ClassResults je tlačidlo na export. Kliknutím sa stiahne CSV súbor s názvom {trieda}_{sada}_{dátum}.csv so skóre žiakov.
result: pass

### 11. Onboarding checklist pre nového učiteľa
expected: Nový učiteľ (bez tried) vidí na dashboarde checklist s 3 krokmi: "Vytvorte triedu / Priraďte sadu / Zdieľajte link". Kroky sa automaticky odškrtávajú po vykonaní akcii. Po dokončení všetkých 3 krokov sa checklist po 5 sekundách sám skryje.
result: pass

### 12. Jazyk v nastaveniach (SettingsModal)
expected: Otvoriť nastavenia hráča (⚙️ ikona). V sekcii jazyka sú 3 tlačidlá: 🇨🇿 CZ / 🇸🇰 SK / 🇬🇧 EN. Aktívny jazyk má zvýraznený border. Po zmene sa UI ihneď prepne do zvoleného jazyka a nastavenie sa uloží.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
