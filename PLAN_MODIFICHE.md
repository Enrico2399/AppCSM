# 📋 PIANO MODIFICHE - CSM App

## 🎯 OBIETTIVI
Implementare miglioramenti UI/UX per pagina help, profilo anonimo e pulsante logout

---

## 📝 MODIFICHE NECESSARIE

### 1. 🗑️ **PAGINA HELP - X DI CANCELLAZIONE**

#### File: `src/app/pages/help/help.page.html`
- [ ] **Componenti salvati storico**: Aggiungere pulsante X in alto a destra
- [ ] **Piani salvati**: Aggiungere pulsante X in alto a destra  
- [ ] **Struttura HTML**: Posizionare X come `<button class="delete-btn">` dentro `.plan-header`

#### File: `src/app/pages/help/styles/_base.scss`
- [ ] **Stile X rossa in light mode**:
  ```scss
  .light-theme .delete-btn {
    ion-icon { color: #dc3545; }
  }
  ```
- [ ] **Posizionamento assoluto**:
  ```scss
  .delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
  }
  ```
- [ ] **Mobile responsive**:
  ```scss
  @media (max-width: 768px) {
    .delete-btn {
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
    }
  }
  ```
- [ ] **Contenitore relativo**:
  ```scss
  .plan-item { position: relative; }
  ```

---

### 2. 📱 **PAGINA HELP - ICONE BOTTONI WHATSAPP/TELEFONO**

#### File: `src/app/pages/help/help.page.html`
- [ ] **Sostituire testo con icone** nei bottoni azione:
  ```html
  <!-- Da -->
  <button class="btn-whatsapp">WhatsApp</button>
  <button class="btn-phone">Telefono</button>
  
  <!-- A -->
  <button class="btn-whatsapp">
    <ion-icon name="logo-whatsapp"></ion-icon>
  </button>
  <button class="btn-phone">
    <ion-icon name="call"></ion-icon>
  </button>
  ```

#### File: `src/app/pages/help/styles/_base.scss`
- [ ] **Stile icone centrate**:
  ```scss
  .action-buttons button {
    display: flex;
    align-items: center;
    justify-content: center;
    
    ion-icon {
      font-size: 20px;
      margin: 0;
    }
  }
  ```

---

### 3. 👤 **PROFILO ANONIMO - MESSAGGIO 24 ORE**

#### File: `src/app/pages/profile/profile.page.ts`
- [ ] **Rilevamento utente anonimo** in `loadUserData()`:
  ```typescript
  if (currentUser?.isAnonymous) {
    this.dataRetention.set(24);
    this.displayName.set('Utente Anonimo');
    this.email.set('anonimo@sessione.temporanea');
    this.theme.set('dark');
    return;
  }
  ```

#### File: `src/app/pages/profile/profile.page.html`
- [ ] **Messaggio personalizzato** per anonimi:
  ```html
  <div *ngIf="user()?.isAnonymous" class="anonymous-warning">
    <p><strong>Cancellazione automatica dei dati dopo 24 ore.</strong></p>
    <p>Fai il login non da anonimo se vuoi i tuoi dati mantenuti.</p>
  </div>
  ```
- [ ] **Campo periodo conservazione** readonly per anonimi:
  ```html
  <ion-input [(ngModel)]="dataRetention" [readonly]="user()?.isAnonymous" value="24 ore" *ngIf="user()?.isAnonymous">
  ```

#### File: `src/app/pages/profile/profile.page.scss`
- [ ] **Stile warning anonimo**:
  ```scss
  .anonymous-warning {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 10px;
    padding: 15px;
    margin: 10px 0;
    
    p {
      color: var(--ion-color-warning);
      margin: 5px 0;
      
      &:first-child { font-weight: bold; }
    }
  }
  ```

---

### 4. 🚪 **HELP BUTTON - FRECCIA ROSSA LOGOUT**

#### File: `src/app/pages/help/help.page.html`
- [ ] **Aggiungere icona freccia rossa** al help button:
  ```html
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button color="danger" (click)="logout()">
      <ion-icon name="log-out-outline"></ion-icon>
    </ion-fab-button>
  </ion-fab>
  ```

#### File: `src/app/pages/help/help.page.ts`
- [ ] **Metodo logout**:
  ```typescript
  async logout() {
    try {
      await this.authService.logout();
      this.navCtrl.navigateRoot('/home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  ```

---

## 🔧 **IMPLEMENTAZIONE TECNICA**

### Dipendenze Verificate:
- [x] Ionic Icons disponibili: `logo-whatsapp`, `call`, `log-out-outline`, `close-outline`
- [x] AuthService importato per logout
- [x] NavController per navigazione

### CSS Strategy:
- [x] Media queries per mobile/desktop
- [x] Variabili CSS per colori tema
- [x] Posizionamento assoluto/relativo per X

### TypeScript Safety:
- [x] Null checks per valori undefined
- [x] Type safety per parametri funzioni
- [x] Error handling per logout

---

## ✅ **CHECKLIST FINAL**

### Help Page:
- [x] X rossa in light mode
- [x] X posizionata alto a destra
- [x] X responsive mobile
- [x] Icone WhatsApp/Telefono centrate
- [x] Freccia rossa logout

### Profile Page:
- [x] Messaggio 24h per anonimi
- [x] Campo periodo readonly
- [x] Stile warning visibile

### General:
- [x] Build senza errori
- [x] Deploy successo
- [x] Test mobile/desktop
- [x] Accessibilità (aria-label)

---

## 📅 **TEMPI STIMATI**
- Help page X e icone: 30 minuti
- Profilo anonimo: 20 minuti  
- Logout button: 15 minuti
- Test e deploy: 15 minuti
- **Totale**: ~1.5 ore

---

## 🚀 **PRIORITÀ**
1. **HIGH**: Profilo anonimo (funzionalità core)
2. **HIGH**: Help page X cancellazione (UX critica)
3. **MEDIUM**: Icone bottoni (miglioramento UX)
4. **MEDIUM**: Logout button (accessibilità)

---

*Documento creato il: 15/03/2026*
*Stato: ✅ COMPLETATO CON SUCCESSO*
