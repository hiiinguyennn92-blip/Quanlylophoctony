import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types';

export class AuthService {
  private static googleProvider = new GoogleAuthProvider();

  public static async signInWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      const user = result.user;
      return await this.syncUserProfile(user);
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      throw error;
    }
  }

  public static async signInWithEmail(email: string, pass: string): Promise<UserProfile> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return await this.syncUserProfile(result.user);
    } catch (error) {
      console.error('Email Sign-in failed:', error);
      throw error;
    }
  }

  public static async signUpWithEmail(email: string, pass: string, displayName: string): Promise<UserProfile> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName });
      return await this.syncUserProfile(result.user, displayName);
    } catch (error) {
      console.error('Email Sign-up failed:', error);
      throw error;
    }
  }

  public static async signOut(): Promise<void> {
    await fbSignOut(auth);
  }

  public static onAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  public static async syncUserProfile(user: User, fallbackName?: string): Promise<UserProfile> {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || fallbackName || user.email?.split('@')[0] || 'Giáo viên',
          email: user.email || '',
          role: 'teacher',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, {
          ...newProfile,
          serverCreatedAt: serverTimestamp(),
        });
        return newProfile;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
  }
}
