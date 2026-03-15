# 🤖 Internal Automation Guide - CSM App Development

## 🎯 **Automation Strategy**

Questo documento contiene tutte le informazioni necessarie per automatizzare lo sviluppo del progetto CSM App in modo completo e sistematico.

---

## 📁 **File Structure & Automation Commands**

### **Critical Files for Automation**
```
CSM-App/
├── firebase.rules                    # Security rules
├── firebase.json                     # Firebase config
├── capacitor.config.ts              # Mobile config
├── angular.json                     # Build config
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── src/app/
│   ├── app.routes.ts               # Lazy loading
│   ├── services/
│   │   ├── firebase/               # Firebase services
│   │   ├── analytics/              # Analytics service
│   │   ├── error-logging/          # Error handling
│   │   └── performance/             # Performance monitoring
│   └── pages/                      # All pages
└── www/                           # Build output
```

---

## 🚨 **PHASE 1: CRITICAL SECURITY AUTOMATION**

### **1.1 Firebase Security Rules Automation**
```bash
# Create security rules file
cat > firebase.rules << 'EOF'
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".write": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".validate": "newData.hasChildren(['displayName', 'email'])"
      }
    },
    "moodHistory": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".write": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".validate": "newData.hasChildren(['moodKey', 'moodTitle', 'timestamp'])"
      }
    },
    "archetypeProfiles": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".write": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".validate": "newData.hasChildren(['primary', 'scores', 'completedAt'])"
      }
    },
    "privacyConsents": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".write": "$uid === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".validate": "newData.hasChildren(['analytics', 'dataProcessing'])"
      }
    },
    "groundingSessions": {
      "$sessionId": {
        ".read": "data.child('userId').val() === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".write": "data.child('userId').val() === auth.uid || root.child("users").child(auth.uid).child("role").val() === "admin"",
        ".validate": "newData.hasChildren(['userId', 'type', 'steps'])"
      }
    },
    "communityMessages": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".validate": "newData.hasChildren(['userId', 'userName', 'message', 'timestamp'])"
    },
    "votes": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "mapReports": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".validate": "newData.hasChildren(['userId', 'reportType', 'timestamp'])"
    }
  }
}
EOF

# Deploy security rules
firebase deploy --only database:rules
```

### **1.2 Error Logging Service Automation**
```typescript
// Auto-create: src/app/services/error-logging/error-logging.service.ts
cat > src/app/services/error-logging/error-logging.service.ts << 'EOF'
import { Injectable } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack: string;
  userId: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorLoggingService {
  constructor(private firebaseService: FirebaseService) {}

  logError(error: Error, context: string = 'General', severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack || '',
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity
    };

    // Log to Firebase
    this.firebaseService.logError(errorLog);
    
    // Log to console in development
    if (environment.production) {
      console.error(`[${severity}] ${context}:`, error);
    }
  }

  logUserAction(action: string, details: any = {}) {
    const actionLog = {
      timestamp: new Date().toISOString(),
      action,
      details,
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.firebaseService.logUserAction(actionLog);
  }
}
EOF
```

### **1.3 Firebase Service Enhancement**
```typescript
# Add to FirebaseService - error logging methods
cat >> src/app/services/firebase/firebase.ts << 'EOF'

  // Error Logging Methods
  async logError(errorLog: any): Promise<void> {
    const errorRef = push(ref(this.db, 'errorLogs'));
    await set(errorRef, errorLog);
  }

  async logUserAction(actionLog: any): Promise<void> {
    const actionRef = push(ref(this.db, 'userActions'));
    await set(actionRef, actionLog);
  }

  // Performance Monitoring
  async logPerformance(metric: string, value: number, context: any = {}) {
    const perfRef = push(ref(this.db, 'performanceMetrics'));
    await set(perfRef, {
      metric,
      value,
      context,
      timestamp: new Date().toISOString(),
      userId: this.auth.currentUser?.uid || 'anonymous'
    });
  }
EOF
```

---

## ⚡ **PHASE 2: PERFORMANCE AUTOMATION**

### **2.1 Lazy Loading Routes Automation**
```bash
# Update app.routes.ts with lazy loading
cat > src/app/app.routes.ts << 'EOF'
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const Routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'mood',
    loadComponent: () => import('./pages/mood/mood.page').then(m => m.MoodPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community.page').then(m => m.CommunityPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'resources',
    loadComponent: () => import('./pages/resources/resources.page').then(m => m.ResourcesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'grounding',
    loadComponent: () => import('./pages/grounding/grounding.page').then(m => m.GroundingPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'archetype-quiz',
    loadComponent: () => import('./pages/archetype-quiz/archetype-quiz.page').then(m => m.ArchetypeQuizPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'roadmap',
    loadComponent: () => import('./pages/roadmap/roadmap.page').then(m => m.RoadmapPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'map',
    loadComponent: () => import('./pages/map/map.page').then(m => m.MapPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.page').then(m => m.PrivacyPage)
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.page').then(m => m.AuthPage)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];
EOF
```

### **2.2 Bundle Optimization Automation**
```bash
# Update angular.json for optimization
cat > angular.json << 'EOF'
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "CSM-App": {
      "projectType": "application",
      "schematics": {
        "@ionic/angular-toolkit:component": {
          "styleext": "scss"
        },
        "@ionic/angular-toolkit:page": {
          "styleext": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "www",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": "src/polyfills.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/assets",
              "src/favicon.ico",
              {
                "glob": "**/*",
                "input": "node_modules/@ionic/angular/svg",
                "output": "./svg"
              }
            ],
            "styles": [
              "src/theme/variables.scss",
              "src/global.scss"
            ],
            "scripts": [],
            "aot": true,
            "buildOptimizer": true,
            "optimization": true,
            "vendorChunk": false,
            "extractLicenses": false,
            "sourceMap": false,
            "namedChunks": false
          },
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ],
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kb",
                  "maximumError": "4kb"
                }
              ]
            },
            "development": {
              "buildOptimizer": false,
              "optimization": false,
              "vendorChunk": true,
              "extractLicenses": true,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "options": {
            "port": 8100,
            "host": "localhost"
          },
          "configurations": {
            "production": {
              "buildTarget": "CSM-App:build:production"
            },
            "development": {
              "buildTarget": "CSM-App:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  },
  "cli": {
    "schematicCollections": ["@ionic/angular-toolkit"]
  }
}
EOF
```

---

## 📊 **PHASE 3: ANALYTICS AUTOMATION**

### **3.1 Analytics Service Creation**
```typescript
# Auto-create analytics service
cat > src/app/services/analytics/analytics.service.ts << 'EOF'
import { Injectable } from '@angular/core';
import { FirebaseService } from '../firebase/firebase';

export interface AnalyticsEvent {
  eventName: string;
  eventType: 'page_view' | 'user_action' | 'feature_usage' | 'error' | 'performance';
  parameters: { [key: string]: any };
  timestamp: string;
  userId: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private sessionId: string = this.generateSessionId();

  constructor(private firebaseService: FirebaseService) {
    this.trackPageView();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackPageView(pageName?: string) {
    this.logEvent({
      eventName: 'page_view',
      eventType: 'page_view',
      parameters: {
        page_name: pageName || window.location.pathname,
        url: window.location.href,
        referrer: document.referrer
      },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackUserAction(action: string, details: any = {}) {
    this.logEvent({
      eventName: action,
      eventType: 'user_action',
      parameters: details,
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackFeatureUsage(feature: string, action: string, details: any = {}) {
    this.logEvent({
      eventName: `${feature}_${action}`,
      eventType: 'feature_usage',
      parameters: { feature, action, ...details },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackError(error: Error, context: string) {
    this.logEvent({
      eventName: 'error',
      eventType: 'error',
      parameters: {
        error_message: error.message,
        error_stack: error.stack,
        context
      },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  trackPerformance(metric: string, value: number, details: any = {}) {
    this.logEvent({
      eventName: metric,
      eventType: 'performance',
      parameters: { value, ...details },
      timestamp: new Date().toISOString(),
      userId: this.firebaseService.auth.currentUser?.uid || 'anonymous',
      sessionId: this.sessionId
    });
  }

  private async logEvent(event: AnalyticsEvent) {
    try {
      const eventRef = push(ref(this.firebaseService['db'], 'analytics'));
      await set(eventRef, event);
    } catch (error) {
      console.error('Analytics logging failed:', error);
    }
  }
}
EOF
```

### **3.2 Firebase Analytics Methods**
```bash
# Add analytics methods to FirebaseService
cat >> src/app/services/firebase/firebase.ts << 'EOF'

  // Analytics Methods
  async logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    const eventRef = push(ref(this.db, 'analytics'));
    await set(eventRef, event);
  }

  async getUserAnalytics(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const now = new Date();
    const timeframes = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(now.getTime() - timeframes[timeframe]);
    const analyticsRef = query(
      ref(this.db, 'analytics'),
      orderByChild('timestamp'),
      startAt(startTime.toISOString())
    );
    
    const snapshot = await get(analyticsRef);
    const allEvents = snapshot.val() || {};
    
    // Filter by user and aggregate
    return Object.values(allEvents)
      .filter((event: any) => event.userId === userId)
      .reduce((acc: any, event: any) => {
        if (!acc[event.eventType]) acc[event.eventType] = [];
        acc[event.eventType].push(event);
        return acc;
      }, {});
  }
EOF
```

---

## 📱 **PHASE 4: MOBILE ENHANCEMENT AUTOMATION**

### **4.1 PWA Manifest Automation**
```bash
# Create PWA manifest
cat > www/manifest.json << 'EOF'
{
  "name": "CSM - Centro Salute Mentale",
  "short_name": "CSM",
  "description": "App per il benessere mentale e supporto psicologico",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3880ff",
  "orientation": "portrait",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF
```

### **4.2 Service Worker Automation**
```bash
# Create service worker
cat > www/sw.js << 'EOF'
const CACHE_NAME = 'csm-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});
EOF
```

---

## 🤖 **COMPLETE AUTOMATION SCRIPT**

### **Master Automation Script**
```bash
# Create master automation script
cat > automate_csm_development.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting CSM App Development Automation..."

# Phase 1: Critical Security
echo "🔒 Phase 1: Setting up Security..."
firebase deploy --only database:rules

# Phase 2: Performance Optimization
echo "⚡ Phase 2: Optimizing Performance..."
npm run build -- --prod

# Phase 3: Analytics Setup
echo "📊 Phase 3: Setting up Analytics..."
firebase deploy --only functions

# Phase 4: Mobile Enhancement
echo "📱 Phase 4: Mobile Enhancement..."
npx cap sync

# Phase 5: Testing
echo "🧪 Phase 5: Running Tests..."
npm run test
npm run e2e

# Phase 6: Build & Deploy
echo "🚀 Phase 6: Building & Deploying..."
npm run build
npx cap sync
firebase deploy

echo "✅ CSM App Development Automation Complete!"
EOF

chmod +x automate_csm_development.sh
```

---

## 📋 **AUTOMATION CHECKLISTS**

### **Daily Automation Checklist**
- [ ] Run security rules validation
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Run automated tests
- [ ] Sync mobile platforms

### **Weekly Automation Checklist**
- [ ] Update dependencies
- [ ] Optimize bundle size
- [ ] Review analytics data
- [ ] Security audit
- [ ] Performance benchmarking

### **Monthly Automation Checklist**
- [ ] Major dependency updates
- [ ] Security penetration testing
- [ ] User feedback analysis
- [ ] Feature usage review
- [ ] Capacity planning

---

## 🚨 **EMERGENCY AUTOMATION**

### **Critical Bug Response Automation**
```bash
# Emergency fix script
cat > emergency_fix.sh << 'EOF'
#!/bin/bash

echo "🚨 Emergency Response Activated..."

# 1. Hotfix branch
git checkout -b emergency-fix/$(date +%Y%m%d_%H%M%S)

# 2. Quick build test
npm run build

# 3. Deploy hotfix
firebase deploy --only hosting

# 4. Notify team
echo "Emergency fix deployed at $(date)" | mail -s "CSM Emergency Fix" team@example.com

echo "🚨 Emergency Response Complete!"
EOF
```

---

## 📈 **SUCCESS METRICS AUTOMATION**

### **Automated Monitoring Script**
```bash
# Monitoring script
cat > monitor_csm_health.sh << 'EOF'
#!/bin/bash

echo "📊 Monitoring CSM App Health..."

# Check build time
BUILD_START=$(date +%s)
npm run build
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

# Check bundle size
BUNDLE_SIZE=$(du -k www | cut -f1)

# Check error rate (from Firebase logs)
ERROR_COUNT=$(firebase functions:logs read --limit 10 | grep "ERROR" | wc -l)

# Log metrics
echo "$(date),${BUILD_TIME},${BUNDLE_SIZE},${ERROR_COUNT}" >> health_metrics.csv

# Alert if thresholds exceeded
if [ $BUILD_TIME -gt 120 ]; then
    echo "🚨 Build time exceeded threshold: ${BUILD_TIME}s"
fi

if [ $BUNDLE_SIZE -gt 500 ]; then
    echo "🚨 Bundle size exceeded threshold: ${BUNDLE_SIZE}KB"
fi

if [ $ERROR_COUNT -gt 5 ]; then
    echo "🚨 Error count exceeded threshold: ${ERROR_COUNT}"
fi

echo "✅ Health monitoring complete!"
EOF
```

---

## 🎯 **FINAL AUTOMATION COMMANDS**

### **One-Command Complete Setup**
```bash
# Execute complete automation
./automate_csm_development.sh

# Monitor health
./monitor_csm_health.sh

# Emergency response
./emergency_fix.sh
```

---

*Last Updated: 2026-03-15*
*Automation Version: 1.0*
*Next Review: 2026-03-22*
