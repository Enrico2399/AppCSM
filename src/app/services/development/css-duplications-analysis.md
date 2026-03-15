# CSS Analysis - FASE 2: DUPLICAZIONI CRITICHE TROVATE

## 🚨 DUPLICAZIONI MAJOR IDENTIFICATE

### 1. CRISIS-CARD STYLES - DUPLICATI COMPLETI
**File**: `_crisis.scss` vs `_theme.scss`

**Crisis Card duplicato in _theme.scss (righe 17-76):**
```scss
// _crisis.scss righe 3-61
.crisis-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 25px;
  border-left: 5px solid var(--danger);
  // ... 58 righe totali
}

// _theme.scss righe 17-76 (DUPLICATO COMPLETO!)
::ng-deep .crisis-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 25px;
  border-left: 5px solid var(--danger);
  // ... 58 righe IDENTICHE
}
```

**Impatto**: ~60 righe duplicate = ~2-3kB

### 2. LIGHT-THEME STYLES - DUPLICATI PARZIALI
**File**: `_theme.scss` righe 78-91

```scss
// DUPLICATO: righe 1-14 vs 78-91
:host-context(.light-theme) {
  .builder-box h2, .builder-box label, .mode-btn strong {
    color: #333 !important;
  }
  // ... stili identici duplicati
}
```

**Impatto**: ~14 righe duplicate = ~0.5kB

### 3. BUILDER BOX STYLES - POTENZIALE CONSOLIDAMENTO
**File**: `_forms.scss` contiene stili che potrebbero essere condivisi

---

## 📋 PIANO AZIONE FASE 2

### AZIONE 1: Rimuovi Duplicati Crisis Card
- [ ] Rimuovere completamente `::ng-deep .crisis-card` da `_theme.scss`
- [ ] Mantenere solo versione in `_crisis.scss`
- [ ] Testare funzionalità crisis card

### AZIONE 2: Rimuovi Duplicati Light Theme
- [ ] Rimuovere duplicato righe 78-91 da `_theme.scss`
- [ ] Consolidare light theme styles in un unico blocco

### AZIONE 3: Ottimizza Form Styles
- [ ] Analizzare `.btn-action` vs `.btn-whatsapp`/`.btn-phone`
- [ ] Creare mixin condiviso per button styles
- [ ] Consolidare form input styles

---

## 🎯 RISULTATI ATTESI FASE 2

### Riduzione Stimata:
- **Crisis card duplication**: -2.5kB
- **Light theme duplication**: -0.4kB  
- **Form optimization**: -0.3kB
- **TOTALE**: **-3.2kB**

### Target Finale:
```
HELP PAGE: 10.57kB → 7.4kB (well under 10kB budget)
BUDGET REMAINING: +2.6kB di margine
```

---

## 🔧 IMPLEMENTAZIONE

Procedo con rimozione duplicati critici...
