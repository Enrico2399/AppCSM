## Analisi stato progetto CSM-App

Questa analisi riassume lo stato attuale del progetto CSM-App (branch `modifiche-accessibilita` di `AppCSM`) e le principali aree di lavoro mancanti, ordinate per priorità.

---

## A. Funzioni core utenti / dati (alta priorità)

### 1. Gestione completa del ciclo di vita utente (profilo, consenso, privacy)

**Cosa c'è già**
- Login con Google, email/password, anonimo, telefono con OTP (`AuthService` + overlay in `home.page.html`).
- `user$` con lo stato Firebase Auth e overlay che blocca l’app finché l’utente non è autenticato.

**Cosa manca**
- Schermata / pannello “Profilo utente” con:
  - Nome visibile/modificabile.
  - Eventuali dati aggiuntivi (es. fascia d’età, preferenze di notifica/tema) se coerenti con la proposta.
  - Pulsante chiaro per **cancellare account / dati personali** (hard delete della porzione di Realtime DB associata a quel `uid`).
- Gestione privacy / consenso:
  - Testo chiaro che spiega cosa viene salvato (stati d’animo, messaggi community, voti feature) e dove.
  - Checkbox di consenso esplicito la prima volta che l’utente usa l’app, con salvataggio di questa scelta (es. nodo `consents/{uid}`).
  - Meccanismo per **revoca del consenso** (interrompere il tracciamento e cancellare/anomimizzare i dati esistenti).

### 2. Modello dati utenti coerente in Firebase

**Cosa c'è già**
- Salvataggi in Realtime Database:
  - `moodHistory/{uid}` tramite `FirebaseService.logMood`.
  - `communityMessages` con `userId`, `userName`, `moodKey`, `message`.
  - `votes/{featureId}` e `logs` per votazioni roadmap.

**Cosa manca**
- Una collezione / nodo utente dedicato, ad esempio `users/{uid}`, che contenga:
  - `displayName`, preferenze (tema, lingua, archetipi, percorso, ecc.).
  - Eventuale ruolo (utente, terapeuta, admin) se richiesto dalla proposta.
- Collegamento logico tra:
  - `users/{uid}`,
  - `moodHistory/{uid}`,
  - messaggi community,
  - interazioni con feature avanzate,
  per permettere reportistica strutturata (auto-monitoraggio e supporto al terapeuta).

### 3. Politiche di retention e cancellazione dati

**Cosa c'è già**
- I dati vengono solo aggiunti in Realtime DB, senza politiche di cancellazione.

**Cosa manca**
- Strategia di **retention temporale** per i dati sensibili:
  - Es. tenere solo l’ultimo anno di `moodHistory`, o introdurre un meccanismo di archiviazione/aggregazione.
- API e UI per:
  - **cancellare selettivamente la storia** (es. “cancella ultimi 7 giorni”, “cancella tutto”).
  - **anonimizzare messaggi community** se l’utente richiede la cancellazione (es. sostituire `userName` con “Utente cancellato”, rimuovere `userId`).

### 4. Tracciamento completo delle interazioni chiave

**Cosa c'è già**
- Tracciamento di:
  - stati d’animo e note (`moodHistory/{uid}`),
  - voti sulle feature (`votes`, `logs`),
  - messaggi nella community (`communityMessages`).

**Cosa manca**
- Tracciamento strutturato di altre interazioni rilevanti, es.:
  - uso di esercizi specifici (quale esercizio, quante volte, completato sì/no),
  - uso di feature di grounding/SOS,
  - uso della mappa dei servizi,
  - completamento di eventuali percorsi guidati o questionari.
- Possibile struttura: `interactions/{uid}/{date}/{eventId}` con:
  - `type` (es. `grounding_start`, `panic_button`, `map_open`, `archetype_test_complete`),
  - `metadata` (parametri chiave, risultati test, ecc.).

---

## B. Funzioni roadmap / feature future (media priorità)

Le seguenti voci derivano in particolare dalla pagina `roadmap` dell’app, che elenca le feature pianificate e il relativo “perché”.

### 5. Diario Emozionale esteso / integrazione avanzata con History

**Cosa c'è già**
- `HistoryPage` che legge da `moodHistory/{uid}`, mostra un grafico radar delle frequenze degli stati d’animo e una lista ordinata dei log.

**Cosa manca**
- Filtri temporali per:
  - oggi / ultimi 7 giorni / ultimo mese / intervallo personalizzato.
- Tag / categorie per le note (es. lavoro, famiglia, salute) con relativo filtraggio.
- Esportazione dei dati:
  - Es. esportazione in PDF/CSV per condividerli con terapeuta o per uso personale.

### 6. Grounding Exercises (radicamento 5-4-3-2-1)

**Cosa c'è già**
- La funzionalità è descritta in `RoadmapPage` come “2. Grounding Exercises”, ma non esiste ancora una pagina dedicata o logica applicativa.

**Cosa manca**
- Una pagina/flow dedicato con:
  - step guidati: 5 cose che vedi, 4 che senti, 3 che tocchi, 2 che annusi, 1 che assapori (layout a slide o stepper).
  - eventuale salvataggio (anche solo in locale) degli step completati.
- Integrazione con un pulsante di accesso rapido (vedi Panic Button/SOS qui sotto).

### 7. Panic Button (privacy / sicurezza)

**Cosa c'è già**
- La funzione è descritta nella roadmap (“3. Panic Button”), ma non implementata come componente funzionante.

**Cosa manca**
- Pulsante persistente (es. icona discreta nella navbar o floating button) che:
  - oscura rapidamente i contenuti sensibili,
  - oppure reindirizza a una pagina neutra (es. meteo, ricerca web).
- Logica per prevenire il ritorno immediato agli ultimi contenuti con il solo “indietro” del browser (es. con redirect o manipolazione della history).

### 8. Risorse e geolocalizzazione

**Cosa c'è già**
- Esiste una pagina `map` nel codice, indicatore che è iniziato un lavoro in questa direzione.

**Cosa manca**
- Lista strutturata di risorse:
  - numeri verdi nazionali,
  - contatti dei servizi di salute mentale locali (es. CSM Treviso e altri),
  - link utili (siti istituzionali, materiale informativo).
- Integrazione geolocalizzata:
  - uso delle API di geolocalizzazione del dispositivo,
  - visualizzazione dei centri vicini su mappa (anche solo con link a Google Maps precompilato).

### 9. Pantheon degli archetipi / questionario

**Cosa c'è già**
- Una pagina `archetipi` con contenuti statici sui vari archetipi.

**Cosa manca**
- Questionario a 5 domande:
  - domande e pesi per assegnare punteggi agli archetipi,
  - interfaccia per compilazione semplice e accessibile.
- Salvataggio del risultato:
  - nodo es. `archetypes/{uid}` con il profilo dell’utente (archetipo dominante e secondari).
- Collegamento con altre parti dell’app:
  - consigli personalizzati in base all’archetipo,
  - accesso a contenuti/montaggi guidati dedicati.

### 10. Audio-meditazioni e contenuti guidati

**Cosa c'è già**
- Nei testi di roadmap si parla di audio/meditazioni per archetipi, ma nel codice non sono ancora presenti player o logiche audio strutturate.

**Cosa manca**
- Struttura dati per contenuti audio:
  - elenco brani, per archetipo o stato d’animo, con metadati (durata, descrizione).
- UI per:
  - selezionare una meditazione/rumore bianco,
  - controlli di riproduzione accessibili (play/pause, focus management, etc.).
- (Opzionale) Tracciamento di quali contenuti audio vengono usati e con quale frequenza, come parte del diario di benessere.

---

## C. Rifiniture UX, accessibilità e contenuti (bassa / prossime iterazioni)

### 11. Accessibilità avanzata (WCAG 2.2)

**Cosa c'è già**
- Tema dark/light gestito e propagato tramite eventi (es. `themeChanged`).
- Ruota dei colori con etichette ARIA descrittive e navigabilità da tastiera.
- Testi esplicativi su psicologia dei colori ed effetti.

**Cosa manca**
- Revisione sistematica per WCAG 2.2:
  - controllo del contrasto per tutti gli elementi (bottoni, chip, testi su sfondo colorato),
  - stati di focus visibili e coerenti per ogni elemento interattivo (bottoni, link, elementi della ruota),
  - revisione di tutti i componenti modali (es. `ion-modal`) con ruoli ARIA, focus-trap e annunci per screen reader.
- Miglioramenti aggiuntivi:
  - scorciatoie da tastiera per azioni chiave (apertura cronologia, attivazione Panic Button, apertura grounding),
  - uso di regioni ARIA-live per feedback importanti (salvataggio completato, errori login, invio messaggi community).

### 12. Help / guida in-app

**Cosa c'è già**
- Pagina `help` nel codice (da completare/verificare nei contenuti).

**Cosa manca**
- Contenuti coerenti con la proposta:
  - spiegazione del metodo dei colori,
  - come utilizzare la community in modo sicuro,
  - cosa fa e cosa NON fa l’app (non sostituisce un medico).
- Tutorial iniziale:
  - piccolo onboarding multi-step alla prima apertura (o richiamabile da menu),
  - spiegazioni sintetiche delle sezioni principali (ruota, cronologia, community, roadmap, future funzioni).

### 13. Sezione “Feature / Roadmap” per utenti finali

**Cosa c'è già**
- Pagina `roadmap` con:
  - elenco delle feature future (tracker, grounding, panic button, risorse, pantheon),
  - sezione “pitch” con punti chiave (Privacy by Design, Accessibilità Cognitiva, Empowerment, Esercizi interattivi).

**Cosa manca**
- Collegamento dinamico con lo stato di sviluppo reale:
  - indicare visivamente quali feature sono “Disponibili”, “In sviluppo”, “In programma”.
- Collegamento alle azioni:
  - pulsanti che portano direttamente alla sezione corrispondente quando è disponibile,
  - possibilità per l’utente di proporre/feedback sulle feature (anche riusando la community).

---

## Sintesi operativa

In termini di priorità, l’ordine suggerito di lavoro è:

1. **Hardening dati utente e privacy**  
   - Profilo utente, consenso, cancellazione/anonimizzazione dati, modello dati utenti coerente in Firebase.

2. **Estensione del diario e tracciamento interazioni**  
   - Diario più ricco (filtri, export), tracciamento degli esercizi e delle funzioni SOS/grounding.

3. **Feature roadmap ad alto impatto clinico/esperienziale**  
   - Grounding 5-4-3-2-1, Panic Button, risorse e mappa servizi, Pantheon/questionario archetipi, audio-meditazioni.

4. **Rifiniture di accessibilità, help e roadmap visibile all’utente**  
   - WCAG 2.2, tutorial, contenuti informativi e aggiornamento dinamico della pagina feature/roadmap.

Questa analisi può essere usata come base per costruire una roadmap di sviluppo con milestone (MVP, v1.1, v1.2, …) e per collegare ogni attività alle richieste presenti nella proposta progettuale ufficiale.

