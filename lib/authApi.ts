import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { z } from 'zod';
import { auth } from './firebase';
import { logger } from './logger';

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(30, 'Display name must be 30 characters or fewer'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function mapAuthError(code: string, rawMessage = ''): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'Sign-in with email is not available right now.',
    'auth/credential-already-in-use': 'This email is linked to another account. Try signing in instead.',
    'auth/provider-already-linked': 'This account already has an email address linked.',
  };
  if (map[code]) return map[code];
  if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('fetch')) {
    return 'Network error. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
}

export async function signUp(email: string, password: string, displayName: string) {
  signUpSchema.parse({ email, password, displayName });
  const currentUser = auth.currentUser;
  let user;
  try {
    if (currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(currentUser, credential);
      await updateProfile(result.user, { displayName });
      user = result.user;
    } else {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      user = result.user;
    }
    await sendEmailVerification(user);
  } catch (err) {
    logger.error('[signUp]', err);
    throw err;
  }
  return user;
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (user) await sendEmailVerification(user);
}

export async function signIn(email: string, password: string) {
  signInSchema.parse({ email, password });
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOutAndGoAnonymous() {
  await signOut(auth);
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function sendPasswordReset(email: string) {
  z.string().email('Invalid email address').parse(email);
  await sendPasswordResetEmail(auth, email);
}
