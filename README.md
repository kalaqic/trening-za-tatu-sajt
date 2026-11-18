# Trening za tatu

Ovo je statični sajt: samo fajlovi, bez servera. Objavi **sve fajlove iz ovog foldera** zajedno, bilo gdje (GitHub Pages, Netlify…).

## Objava na GitHub Pages

1. Na github.com napravi novi **javni** repozitorij, npr. `trening-za-tatu`.
2. Klikni **Add file → Upload files**, prevuci sve fajlove iz ovog foldera i klikni **Commit changes**.
3. Idi na **Settings → Pages**. Pod „Branch” izaberi `main` i folder `/ (root)`, pa klikni **Save**.
4. Za minut-dva sajt je na adresi `https://<tvoje-ime>.github.io/trening-za-tatu/`.

## Adrese

- **TV:** `.../trening-za-tatu/`. Na TV-u otvori ovo i ostavi kao zabilješku (bookmark).
- **Telefon:** skenira QR kod sa TV-a. Link ostaje isti, pa ga tata može sačuvati na početni ekran telefona.
- **Za tebe:** `.../trening-za-tatu/vjezbe.html` ima sve animacije i promjenu nivoa.
- **Brza proba:** `.../trening-za-tatu/?test=1` pušta vježbe od po 8 s i ništa ne upisuje.

## Kako radi

- TV i telefon se povezuju direktno (WebRTC). Javni PeerJS server ih samo upozna.
- Oba uređaja trebaju internet. Najbolje radi kad su na istoj Wi-Fi mreži.
- Podaci (kilaže, treninzi, streak, nivo) čuvaju se u browseru na TV-u, a kopija na tatinom telefonu. Ako TV izgubi podatke, telefon ih vrati pri sljedećem povezivanju.
- Kod na TV-u je uvijek isti, osim ako se obriše memorija browsera na TV-u.
- Pravila napretka su na vrhu `program.js` (`RULES`).

## Fajlovi

| Fajl | Šta je |
|---|---|
| `index.html`, `tv.js`, `tv.css` | TV ekran |
| `p.html`, `phone.js`, `phone.css` | daljinski na telefonu |
| `vjezbe.html` | biblioteka vježbi |
| `lik.js` | animirani lik |
| `program.js` | vježbe, nivoi, napredak, streak |
| `net.js` | veza TV ↔ telefon i čuvanje podataka |
| `qr.js` | pravi QR kod (biblioteka Kazuhiko Arase, MIT) |
