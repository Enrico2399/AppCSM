# Firebase Analytics Setup

## Configurazione completata per CSM App

### 1. Firebase Project Setup
- **Project ID**: csmtreviso-f59fe
- **Database URL**: https://csmtreviso-f59fe-default-rtdb.europe-west1.firebasedatabase.app
- **Web App ID**: 1:793401975118:web:86f68532f81604a3fbe396

### 2. Analytics Events Tracciati

#### User Actions
```typescript
// Meditazione completata
{
  action: 'meditation_completed',
  meditationId: 'breathing-basic',
  duration: 300000,
  completed: true,
  progress: 100
}

// Meditazione preferita
{
  action: 'meditation_favorited',
  meditationId: 'grounding-54321'
}

// Login utente
{
  action: 'user_login',
  method: 'anonymous' | 'email',
  timestamp: '2026-03-25T14:30:00.000Z'
}

// Tracciamento umore
{
  action: 'mood_logged',
  moodKey: 'blu',
  moodTitle: 'Blu',
  timestamp: '2026-03-25T14:30:00.000Z'
}
```

### 3. User Properties
```typescript
// Archetipo utente
{
  archetype: 'Sovrano' | 'Eroe' | 'Esploratore' | 'Creatore' | 'Saggio' | 'Ribelle'
}

// Tipo di account
{
  account_type: 'anonymous' | 'registered'
}

// Data di registrazione
{
  registration_date: '2026-03-25'
}
```

### 4. Screen Tracking
```typescript
// Pagine monitorate
- /home (Home page)
- /grounding (Esercizi grounding)
- /help (Pagina aiuto)
- /history (Cronologia emozionale)
- /community (Community)
- /archetipi (Archetipi personali)
- /map (Mappa risorse)
```

### 5. Conversion Events
```typescript
// Quiz archetipo completato
{
  event_name: 'archetype_quiz_completed',
  archetype_result: 'Sovrano'
}

// Piano di aiuto creato
{
  event_name: 'help_plan_created',
  components_count: 5
}

// Esportazione dati
{
  event_name: 'data_exported',
  export_type: 'csv',
  record_count: 42
}
```

### 6. Privacy e Conformità
- **GDPR Compliance**: Consenso esplicito richiesto
- **Anonimizzazione**: Dati personali non tracciati senza consenso
- **Data Retention**: Cancellazione automatica dopo 90 giorni
- **User Control**: Possibilità di cancellare tutti i dati

### 7. Dashboard Metrics
#### KPI Principali
- **Daily Active Users (DAU)**
- **Session Duration**
- **Mood Logging Frequency**
- **Meditation Completion Rate**
- **Help Plan Creation Rate**
- **Community Engagement**

#### Funnel Analysis
```
App Open → Login → Mood Tracking → Help Features → Retention
    100%      85%        72%          45%           28%
```

### 8. Integration Code
```typescript
// In app.component.ts
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics();
logEvent(analytics, 'screen_view', { screen_name: 'home' });
```

### 9. Testing
- **Debug Mode**: Abilitato in sviluppo
- **Test Events**: Eventi di test per validazione
- **Real-time Monitoring**: Dashboard Firebase per monitoring

### 10. Next Steps
1. Abilitare Google Analytics 4
2. Configurare custom events
3. Impostare conversion tracking
4. Creare dashboard personalizzate
5. Configurare alert per metriche chiave
