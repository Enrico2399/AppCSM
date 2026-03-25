# Audio Meditations Setup

Questa directory contiene i file audio per le meditazioni dell'app CSM.

## Struttura

```
audio/meditations/
├── breathing-basic.mp3          # Respirazione consapevole (5 min)
├── grounding-54321.mp3          # Tecnica 5-4-3-2-1 (10 min)
├── mindfulness-body.mp3          # Body scan mindfulness (15 min)
├── stress-relief.mp3             # Rilassamento stress (12 min)
├── sleep-preparation.mp3         # Preparazione sonno (20 min)
└── anxiety-calm.mp3              # Calmo ansia (8 min)
```

## Specifiche File

- **Formato**: MP3
- **Qualità**: 128 kbps
- **Frequenza**: 44.1 kHz
- **Durata**: 5-20 minuti per meditazione
- **Lingua**: Italiano

## Note

I file audio sono segnaposto. Per la produzione:
1. Registrare meditazioni professionali
2. Assicurarsi che la voce sia calma e rilassante
3. Aggiungere musica di sottofondo leggera
4. Testare qualità audio su diversi dispositivi

## Integrazione

I file sono referenziati in `audio-meditation.service.ts`:
```typescript
audioUrl: '/assets/audio/meditations/breathing-basic.mp3'
```
