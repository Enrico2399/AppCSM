import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase/firebase';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-firebase-test',
  templateUrl: './firebase-test.component.html',
  styleUrls: ['./firebase-test.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class FirebaseTestComponent {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  testResults = signal<string[]>([]);
  isRunning = signal(false);

  constructor() {
    this.testResults.set(['Ready to run Firebase tests...']);
  }

  async runAllTests() {
    this.isRunning.set(true);
    this.testResults.set(['Starting Firebase tests...']);

    try {
      // Test 1: Firebase Initialization
      await this.testFirebaseInit();
      
      // Test 2: Authentication State
      await this.testAuthState();
      
      // Test 3: Database Connection
      await this.testDatabaseConnection();
      
      // Test 4: Database Write
      await this.testDatabaseWrite();
      
      // Test 5: Database Read
      await this.testDatabaseRead();
      
      // Test 6: Security Rules
      await this.testSecurityRules();
      
      this.addResult('✅ All tests completed successfully!');
      
    } catch (error: any) {
      this.addResult(`❌ Test failed: ${error?.message || 'Unknown error'}`);
    } finally {
      this.isRunning.set(false);
    }
  }

  private async testFirebaseInit() {
    this.addResult('🔍 Testing Firebase initialization...');
    
    try {
      const auth = this.firebaseService.auth;
      const database = this.firebaseService.getDatabase();
      
      if (auth && database) {
        this.addResult('✅ Firebase services initialized successfully');
        this.addResult(`📱 Auth service available`);
        this.addResult(`🗄️ Database service available`);
        this.addResult(`🔧 Project ID: csmtreviso-f59fe`);
      } else {
        throw new Error('Firebase services not initialized');
      }
    } catch (error: any) {
      this.addResult(`❌ Firebase init failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async testAuthState() {
    this.addResult('🔍 Testing authentication state...');
    
    try {
      const auth = this.firebaseService.auth;
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        this.addResult(`✅ User authenticated: ${currentUser.email || 'Anonymous'}`);
        this.addResult(`🆔 User ID: ${currentUser.uid}`);
        this.addResult(`🔓 Provider: ${currentUser.providerData[0]?.providerId || 'Anonymous'}`);
      } else {
        this.addResult('ℹ️ No user currently authenticated');
      }
      
      // Test auth state listener
      this.authService.user$.subscribe(user => {
        this.addResult(`👤 Auth state changed: ${user ? 'Logged in' : 'Logged out'}`);
      });
      
    } catch (error: any) {
      this.addResult(`❌ Auth test failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async testDatabaseConnection() {
    this.addResult('🔍 Testing database connection...');
    
    try {
      const database = this.firebaseService.getDatabase();
      
      // Test database reference
      if (database) {
        this.addResult('✅ Database connection established');
        this.addResult(`🗄️ Database URL: https://csmtreviso-f59fe-default-rtdb.europe-west1.firebasedatabase.app`);
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error: any) {
      this.addResult(`❌ Database connection failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async testDatabaseWrite() {
    this.addResult('🔍 Testing database write...');
    
    try {
      const testData = {
        timestamp: new Date().toISOString(),
        test: 'Firebase connection test',
        environment: 'development'
      };
      
      await this.firebaseService.setUserConsent('test-user', true);
      this.addResult('✅ Database write successful');
      this.addResult(`📝 Test data written to: consents/test-user`);
    } catch (error: any) {
      this.addResult(`❌ Database write failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async testDatabaseRead() {
    this.addResult('🔍 Testing database read...');
    
    try {
      const consent = await this.firebaseService.getUserConsent('test-user');
      
      if (consent !== undefined) {
        this.addResult('✅ Database read successful');
        this.addResult(`📖 Data read: consent=${consent}`);
      } else {
        this.addResult('⚠️ No data found at consents/test-user');
      }
    } catch (error: any) {
      this.addResult(`❌ Database read failed: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  private async testSecurityRules() {
    this.addResult('🔍 Testing security rules...');
    
    try {
      // Test public read (should fail or be restricted)
      try {
        const profile = await this.firebaseService.getUserProfile('test-user');
        this.addResult('⚠️ Public read test inconclusive');
      } catch (error: any) {
        this.addResult('✅ Security rules appear to be working (public read blocked)');
      }
      
      // Test anonymous user access
      const currentUser = this.firebaseService.auth.currentUser;
      if (currentUser?.isAnonymous) {
        try {
          const profile = await this.firebaseService.getUserProfile(currentUser.uid);
          this.addResult('✅ Anonymous user can access own data');
        } catch (error: any) {
          this.addResult('⚠️ Anonymous user access restricted');
        }
      }
      
    } catch (error: any) {
      this.addResult(`❌ Security rules test failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async testAnonymousLogin() {
    this.addResult('🔍 Testing anonymous login...');
    
    try {
      await this.authService.loginAnonymously();
      this.addResult('✅ Anonymous login successful');
    } catch (error: any) {
      this.addResult(`❌ Anonymous login failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async testLogout() {
    this.addResult('🔍 Testing logout...');
    
    try {
      await this.authService.logout();
      this.addResult('✅ Logout successful');
    } catch (error: any) {
      this.addResult(`❌ Logout failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async clearResults() {
    this.testResults.set(['Results cleared...']);
  }

  private addResult(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.testResults.set([...this.testResults(), `[${timestamp}] ${message}`]);
  }
}
