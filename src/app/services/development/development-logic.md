# CSM-App Development Logic - Internal Reference

## Project Architecture Overview

### Current State Analysis
- **Framework**: Angular 20 + Ionic 8
- **Backend**: Firebase Realtime Database + Authentication
- **Storage**: LocalStorage + Firebase
- **Mobile**: Capacitor ready (iOS/Android)

### Existing Services Structure
```
src/app/services/
├── firebase/
│   └── firebase.ts (Realtime DB + Auth)
├── storage/
│   └── storage.ts (LocalStorage management)
└── development/
    └── development-logic.md (this file)
```

## Development Patterns & Standards

### 1. Service Layer Pattern
All Firebase operations go through `FirebaseService`, local storage through `StorageService`.

### 2. Component Structure
- **Pages**: Full-screen components with routing
- **Components**: Reusable UI elements
- **Services**: Business logic and data management

### 3. Data Flow
```
Component -> Service -> Firebase/LocalStorage -> Component
```

## Database Schema (Firebase Realtime)

### Current Structure
```json
{
  "users": {
    "{uid}": {
      "displayName": "string",
      "email": "string", 
      "photoURL": "string",
      "providerId": "string",
      "themePreference": "string",
      "role": "user",
      "createdAt": "ISO",
      "lastLoginAt": "ISO"
    }
  },
  "moodHistory": {
    "{uid}": {
      "{moodId}": {
        "moodKey": "string",
        "moodTitle": "string", 
        "icon": "string",
        "thought": "string",
        "timestamp": "ISO"
      }
    }
  },
  "communityMessages": {
    "{messageId}": {
      "userId": "string",
      "userName": "string",
      "moodKey": "string",
      "message": "string",
      "timestamp": "ISO"
    }
  },
  "votes": {
    "{featureId}": "number"
  },
  "logs": {
    "{logId}": {
      "user": "string",
      "feature": "string", 
      "timestamp": "ISO"
    }
  },
  "consents": {
    "{uid}": {
      "consent": "boolean",
      "updatedAt": "ISO"
    }
  },
  "mapReports": {
    "{reportId}": {
      "report": "object",
      "timestamp": "ISO"
    }
  }
}
```

## Implementation Roadmap - Technical Details

### Phase 1: Privacy & User Management

#### 1.1 Enhanced User Profile
**Files to create/modify:**
- `src/app/pages/profile/profile.page.ts`
- `src/app/pages/profile/profile.page.html`
- `src/app/services/firebase/firebase.ts` (add methods)

**New FirebaseService methods needed:**
```typescript
async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void>
async getUserProfile(uid: string): Promise<UserProfile>
async deleteUserAccount(uid: string): Promise<void>
async exportUserData(uid: string): Promise<UserDataExport>
```

**UserProfile interface:**
```typescript
interface UserProfile {
  displayName: string;
  email?: string;
  photoURL?: string;
  themePreference: 'light' | 'dark' | 'auto';
  notifications: {
    moodReminders: boolean;
    communityUpdates: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    dataRetention: number; // days
    shareWithTherapist: boolean;
    analyticsConsent: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    moodReminderTime: string;
  };
}
```

#### 1.2 Privacy Management
**New service:** `src/app/services/privacy/privacy.service.ts`

**Key methods:**
```typescript
async setPrivacyConsent(uid: string, consent: PrivacyConsent): Promise<void>
async getPrivacyConsent(uid: string): Promise<PrivacyConsent>
async revokeConsent(uid: string): Promise<void>
async anonymizeUserData(uid: string): Promise<void>
```

### Phase 2: Extended Mood Tracking

#### 2.1 Enhanced History Page
**Files to modify:**
- `src/app/pages/history/history.page.ts`
- `src/app/pages/history/history.page.html`

**New features:**
- Time filters (today/7days/month/custom)
- Category tags
- Export functionality
- Advanced charts

#### 2.2 Grounding Exercises
**New page:** `src/app/pages/grounding/grounding.page.ts`

**Structure:**
```typescript
interface GroundingSession {
  id: string;
  userId: string;
  type: '5-4-3-2-1';
  steps: GroundingStep[];
  completed: boolean;
  duration: number; // seconds
  timestamp: ISO;
}

interface GroundingStep {
  type: 'see' | 'touch' | 'hear' | 'smell' | 'taste';
  prompt: string;
  userInput: string[];
  completed: boolean;
}
```

**New Firebase methods:**
```typescript
async saveGroundingSession(session: GroundingSession): Promise<void>
async getGroundingHistory(uid: string): Promise<GroundingSession[]>
```

#### 2.3 Panic Button
**New component:** `src/app/components/panic-button/panic-button.component.ts`

**Features:**
- Floating button overlay
- Quick redirect to neutral page
- Prevent back navigation
- Emergency contacts integration

### Phase 3: Resources & Geolocation

#### 3.1 Resources Database
**New Firebase collection:** `resources`

```json
{
  "resources": {
    "{resourceId}": {
      "name": "string",
      "type": "hotline|center|website|app",
      "phone": "string",
      "email": "string", 
      "website": "string",
      "address": "string",
      "coordinates": {
        "lat": number,
        "lng": number
      },
      "services": ["string"],
      "hours": "string",
      "region": "string"
    }
  }
}
```

#### 3.2 Map Integration
**Dependencies to add:**
```bash
npm install @capacitor/geolocation leaflet @types/leaflet
```

**New service:** `src/app/services/geolocation/geolocation.service.ts`

### Phase 4: Archetypes & Audio

#### 4.1 Archetype Quiz
**New page:** `src/app/pages/archetype-quiz/archetype-quiz.page.ts`

**Quiz structure:**
```typescript
interface ArchetypeQuiz {
  id: string;
  questions: QuizQuestion[];
  scoring: ArchetypeScoring;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  type: 'single' | 'multiple' | 'scale';
}

interface ArchetypeProfile {
  primary: Archetype;
  secondary: Archetype[];
  scores: { [archetype: string]: number };
  completedAt: ISO;
}
```

#### 4.2 Audio System
**Dependencies to add:**
```bash
npm install @capacitor/audio
```

**New service:** `src/app/services/audio/audio.service.ts`

**Audio content structure:**
```typescript
interface AudioContent {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  archetype: Archetype;
  type: 'meditation' | 'music' | 'exercise' | 'story';
  category: string;
}
```

### Phase 5: Advanced Features

#### 5.1 AI Insights
**New service:** `src/app/services/insights/insights.service.ts`

**Pattern analysis:**
```typescript
interface MoodPattern {
  period: 'daily' | 'weekly' | 'monthly';
  trends: TrendData[];
  triggers: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}
```

#### 5.2 Gamification
**New Firebase collection:** `gamification`

```json
{
  "gamification": {
    "{uid}": {
      "level": number,
      "experience": number,
      "streak": {
        "current": number,
        "longest": number
      },
      "badges": ["string"],
      "achievements": ["string"]
    }
  }
}
```

## Development Standards

### 1. File Naming
- **Pages**: `name.page.ts`, `name.page.html`, `name.page.scss`
- **Components**: `name.component.ts`, `name.component.html`, `name.component.scss`
- **Services**: `name.service.ts`
- **Interfaces**: `name.interface.ts` or in service file

### 2. Code Style
- Use TypeScript interfaces for all data structures
- Async/await for all Firebase operations
- Error handling with try/catch blocks
- Reactive patterns with RxJS where appropriate

### 3. Firebase Patterns
```typescript
// Standard Firebase operation pattern
async someOperation(data: any): Promise<void> {
  try {
    const ref = push(ref(this.db, 'path'));
    await set(ref, {
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}

// Standard listener pattern
listenToData(callback: (data: any) => void): Unsubscribe {
  return onValue(ref(this.db, 'path'), (snapshot) => {
    callback(snapshot.val());
  });
}
```

### 4. Component Patterns
```typescript
// Standard component structure
export class SomePage implements OnInit, OnDestroy {
  private subscriptions: Unsubscribe[] = [];
  
  data$ = signal<any>(null);
  loading = signal(false);

  constructor(private someService: SomeService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub());
  }

  private async loadData() {
    this.loading.set(true);
    try {
      const unsubscribe = this.someService.listenToData((data) => {
        this.data$.set(data);
        this.loading.set(false);
      });
      this.subscriptions.push(unsubscribe);
    } catch (error) {
      console.error('Load error:', error);
      this.loading.set(false);
    }
  }
}
```

## Testing Strategy

### 1. Unit Tests
- All services need unit tests
- Component logic testing
- Firebase service mocking

### 2. Integration Tests  
- End-to-end user flows
- Firebase integration testing
- Mobile device testing

### 3. Accessibility Testing
- WCAG 2.2 compliance
- Screen reader testing
- Keyboard navigation

## Deployment Checklist

### 1. Firebase
- Production Firebase project setup
- Security rules configuration
- Database indexes optimization

### 2. Mobile Build
- Capacitor configuration
- App store assets preparation
- Code signing setup

### 3. Performance
- Bundle size optimization
- Lazy loading implementation
- Image optimization

This document serves as the central reference for all development decisions and patterns in the CSM-App project.
