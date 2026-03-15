# CSS Optimization Analysis - FASE 1

## 🔍 DUPLICAZIONI CRITICHE TROVATE

### 1. GLOBAL.SCSS - IMPORT DUPLICATI
```scss
// RIGA 13: @import "@ionic/angular/css/core.css";
// RIGA 17: @import "@ionic/angular/css/core.css";  // DUPLICATO

// RIGA 15: @import "leaflet/dist/leaflet.css";  
// RIGA 19: @import "leaflet/dist/leaflet.css";     // DUPLICATO
```

**Risparmio stimato**: ~2-4kB rimuovendo duplicati

### 2. HELP.PAGE.SCSS - SASS DEPRECATION
```scss
// RIGHE 4-8: @import deprecati
@import 'styles/base';
@import 'styles/forms'; 
@import 'styles/buttons';
@import 'styles/crisis';
@import 'styles/theme';
```

**Azione**: Convertire a `@use` con namespace

---

## 📋 PIANO AZIONE IMMEDIATO

### AZIONE 1: Rimuovi Import Duplicati
- [ ] Rimuovere `@import "@ionic/angular/css/core.css"` riga 17
- [ ] Rimuovere `@import "leaflet/dist/leaflet.css"` riga 19
- [ ] Verificare build dopo rimozione

### AZIONE 2: Modernizza SASS Help Page
- [ ] Convertire `@import` a `@use` in help.page.scss
- [ ] Aggiungere namespace per evitare conflitti
- [ ] Testare funzionalità help page

### AZIONE 3: Analizza Stili Non Utilizzati
- [ ] Scansionare tutti i component SCSS
- [ ] Identificare classi CSS non referenziate
- [ ] Creare mixins condivisi per stili ripetuti

---

## 🎯 OBIETTIVI RISULTATI

1. **Ridurre help page bundle** da 10.57kB a <10kB
2. **Eliminare tutti SASS deprecation warnings**
3. **Migliorare performance loading CSS**
4. **Standardizzare coding style SASS**

---

## 📊 METRICHE PRE/POST

### PRE-OTTIMIZZAZIONE
- Help page: 10.57kB (+569 bytes over budget)
- SASS warnings: 5 deprecation warnings
- Import duplicati: 2 coppie
- Build time: ~8.4s

### POST-OTTIMIZZAZIONE (TARGET)
- Help page: <10kB (within budget)
- SASS warnings: 0
- Import duplicati: 0
- Build time: <8s

---

Procedo con l'esecuzione delle azioni pianificate...
