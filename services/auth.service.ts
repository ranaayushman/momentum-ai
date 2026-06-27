import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, GoogleAuthProvider } from '@/lib/core/firebase/auth';
import { db } from '@/lib/core/firebase/firestore';
import { createInitialUserModel } from '@/lib/core/auth/auth-utils';

class AuthService {
  /**
   * Listen to Firebase auth state changes.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Signs in a user using the Google provider.
   */
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Force prompt to ensure user can select account
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }

  /**
   * Signs out the currently authenticated user.
   */
  async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Syncs the Firestore User Profile document with Firebase Auth state.
   * If a profile document does not exist, creates it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async syncUserDoc(firebaseUser: FirebaseUser): Promise<any> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }

    const initialUser = createInitialUserModel(firebaseUser);
    await setDoc(userDocRef, initialUser);
    return initialUser;
  }
}

export const authService = new AuthService();
export type { FirebaseUser };
