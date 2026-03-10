# CSM Digitale (Ionic + Angular)

## Descrizione del Progetto
**CSM Digitale** è una Progressive Web App (PWA) progettata per supportare i Centri di Salute Mentale (CSM), con un focus iniziale sull'area di Treviso. L'applicazione permette il monitoraggio dello stato di salute mentale degli utenti attraverso strumenti interattivi e spazi di community.

### Caratteristiche Principali
- **Mood Wheel**: Monitoraggio quotidiano dell'umore tramite un disco cromatico interattivo.
- **Pantheon Archetipico**: Esplorazione di modelli psicologici e archetipi educativi.
- **Community**: Spazio di condivisione e supporto tra utenti.
- **Monitoraggio Geospaziale**: Mappa interattiva per la visualizzazione di servizi e segnalazioni (basata su Leaflet).
- **SOS Help**: Risorse di emergenza e supporto rapido.

---

## Setup e Installazione

### Requisiti
- **Node.js** (LTS consigliata ≥ 18)
- **Ionic CLI** (`npm install -g @ionic/cli`)

### Installazione
1. Clona il repository.
2. Esegui l'installazione delle dipendenze:
   ```bash
   npm install
   ```

---

## Sviluppo e Sicurezza

### Sicurezza (Firebase)
L'app utilizza Firebase per autenticazione e database. Le regole di sicurezza sono definite nel file `database.rules.json` e proteggono i dati sensibili (`moodHistory`, `communityMessages`) garantendo la privacy e l'integrità.

### Testing
Abbiamo implementato test unitari con Jasmine e Karma.
- Per eseguire i test: 
  ```bash
  npm test
  ```
I test coprono la logica di autenticazione (`auth.spec.ts`) e della community (`community.page.spec.ts`).

### Accessibilità (A11y)
L'interfaccia è stata ottimizzata per screen reader e navigazione da tastiera, includendo `aria-label`, gestione corretta del focus e semantica HTML5.

---

## Lancio del Progetto in Locale

Per avviare il server di sviluppo e testare l'app nel browser:

```bash
ionic serve
```

L'applicazione sarà disponibile all'indirizzo `http://localhost:8100`.

### Lancio su Dispositivo (Capacitor)
Per buildare e lanciare su Android/iOS:
```bash
# Sincronizza il codice con la piattaforma nativa
npx cap sync
# Apri in Android Studio / Xcode
npx cap open android
npx cap open ios
```

