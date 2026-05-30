import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount, mapAuthError, resendVerificationEmail, sendPasswordReset, signIn, signOutAndGoAnonymous, signUp } from '../authApi';
import { auth } from '../firebase';

const mockDeleteUser = jest.fn();
const mockLinkWithCredential = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockUpdateProfile = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockSendEmailVerification = jest.fn().mockResolvedValue(undefined);
const mockEmailAuthProviderCredential = jest.fn().mockReturnValue({ _credential: 'mock' });

jest.mock('firebase/auth', () => ({
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  EmailAuthProvider: {
    credential: (...args: unknown[]) => mockEmailAuthProviderCredential(...args),
  },
}));

jest.mock('../firebase', () => ({
  auth: { currentUser: null },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (auth as { currentUser: unknown }).currentUser = null;
});

const mockGetIdToken = jest.fn().mockResolvedValue('mock-token');
const stubUser = (props: Record<string, unknown>) => ({ ...props, getIdToken: mockGetIdToken });

// ---------------------------------------------------------------------------
// signUp — validation
// ---------------------------------------------------------------------------
describe('signUp validation', () => {
  it('throws for invalid email', async () => {
    await expect(signUp('not-an-email', 'password123', 'Alice')).rejects.toThrow();
  });

  it('throws for password shorter than 8 chars', async () => {
    await expect(signUp('a@b.com', 'short', 'Alice')).rejects.toThrow();
  });

  it('throws for display name longer than 30 chars', async () => {
    await expect(signUp('a@b.com', 'password123', 'A'.repeat(31))).rejects.toThrow();
  });

  it('throws for empty display name', async () => {
    await expect(signUp('a@b.com', 'password123', '')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// signUp — anonymous upgrade (linkWithCredential)
// ---------------------------------------------------------------------------
describe('signUp — anonymous upgrade', () => {
  it('calls linkWithCredential when current user is anonymous', async () => {
    const anonUser = stubUser({ uid: 'anon-uid', isAnonymous: true });
    (auth as { currentUser: unknown }).currentUser = anonUser;
    const linkedUser = stubUser({ uid: 'anon-uid', isAnonymous: false });
    mockLinkWithCredential.mockResolvedValue({ user: linkedUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');

    expect(mockLinkWithCredential).toHaveBeenCalledTimes(1);
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('calls getIdToken(true) before linkWithCredential to refresh expired token', async () => {
    const anonUser = stubUser({ uid: 'anon-uid', isAnonymous: true });
    (auth as { currentUser: unknown }).currentUser = anonUser;
    const linkedUser = stubUser({ uid: 'anon-uid', isAnonymous: false });
    mockLinkWithCredential.mockResolvedValue({ user: linkedUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');

    expect(mockGetIdToken).toHaveBeenCalledWith(true);
  });

  it('preserves uid after anonymous-to-permanent upgrade', async () => {
    (auth as { currentUser: unknown }).currentUser = stubUser({ uid: 'preserved-uid', isAnonymous: true });
    const linkedUser = stubUser({ uid: 'preserved-uid', isAnonymous: false });
    mockLinkWithCredential.mockResolvedValue({ user: linkedUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    const result = await signUp('a@b.com', 'password123', 'Alice');
    expect(result.uid).toBe('preserved-uid');
  });

  it('sets displayName during upgrade', async () => {
    (auth as { currentUser: unknown }).currentUser = stubUser({ uid: 'anon-uid', isAnonymous: true });
    const linkedUser = stubUser({ uid: 'anon-uid', isAnonymous: false });
    mockLinkWithCredential.mockResolvedValue({ user: linkedUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');
    expect(mockUpdateProfile).toHaveBeenCalledWith(linkedUser, { displayName: 'Alice' });
  });

  it('sends a verification email after anonymous upgrade', async () => {
    (auth as { currentUser: unknown }).currentUser = stubUser({ uid: 'anon-uid', isAnonymous: true });
    const linkedUser = stubUser({ uid: 'anon-uid', isAnonymous: false });
    mockLinkWithCredential.mockResolvedValue({ user: linkedUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');

    expect(mockSendEmailVerification).toHaveBeenCalledWith(linkedUser);
  });
});

// ---------------------------------------------------------------------------
// signUp — new account (createUserWithEmailAndPassword)
// ---------------------------------------------------------------------------
describe('signUp — new account', () => {
  it('calls createUserWithEmailAndPassword when no current user', async () => {
    (auth as { currentUser: unknown }).currentUser = null;
    const newUser = stubUser({ uid: 'new-uid', isAnonymous: false });
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(mockLinkWithCredential).not.toHaveBeenCalled();
  });

  it('sets displayName on new account', async () => {
    const newUser = stubUser({ uid: 'new-uid', isAnonymous: false });
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Bob');
    expect(mockUpdateProfile).toHaveBeenCalledWith(newUser, { displayName: 'Bob' });
  });

  it('sends a verification email after new account creation', async () => {
    const newUser = stubUser({ uid: 'new-uid', isAnonymous: false });
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
    mockUpdateProfile.mockResolvedValue(undefined);

    await signUp('a@b.com', 'password123', 'Alice');

    expect(mockSendEmailVerification).toHaveBeenCalledWith(newUser);
  });
});

// ---------------------------------------------------------------------------
// resendVerificationEmail
// ---------------------------------------------------------------------------
describe('resendVerificationEmail', () => {
  it('calls sendEmailVerification when a current user exists', async () => {
    const user = { uid: 'uid-123' };
    (auth as { currentUser: unknown }).currentUser = user;

    await resendVerificationEmail();

    expect(mockSendEmailVerification).toHaveBeenCalledWith(user);
  });

  it('does nothing when there is no current user', async () => {
    (auth as { currentUser: unknown }).currentUser = null;

    await resendVerificationEmail();

    expect(mockSendEmailVerification).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------
describe('signIn', () => {
  it('calls signInWithEmailAndPassword with correct args', async () => {
    const mockUser = { uid: 'uid', isAnonymous: false };
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await signIn('a@b.com', 'password123');

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'a@b.com', 'password123'
    );
    expect(result).toEqual(mockUser);
  });

  it('throws ZodError for invalid email', async () => {
    await expect(signIn('bad-email', 'password123')).rejects.toThrow();
  });

  it('throws ZodError for empty password', async () => {
    await expect(signIn('a@b.com', '')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// signOutAndGoAnonymous
// ---------------------------------------------------------------------------
describe('signOutAndGoAnonymous', () => {
  it('calls signOut then signInAnonymously', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const anonUser = { uid: 'fresh-anon', isAnonymous: true };
    mockSignInAnonymously.mockResolvedValue({ user: anonUser });

    const result = await signOutAndGoAnonymous();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(result).toEqual(anonUser);
  });
});

// ---------------------------------------------------------------------------
// sendPasswordReset
// ---------------------------------------------------------------------------
describe('sendPasswordReset', () => {
  it('calls sendPasswordResetEmail with a valid email', async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);

    await sendPasswordReset('a@b.com');

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(), 'a@b.com'
    );
  });

  it('throws ZodError for invalid email', async () => {
    await expect(sendPasswordReset('not-an-email')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// mapAuthError
// ---------------------------------------------------------------------------
describe('mapAuthError', () => {
  it('maps email-already-in-use', () => {
    expect(mapAuthError('auth/email-already-in-use')).toMatch(/already exists/i);
  });

  it('maps wrong-password', () => {
    expect(mapAuthError('auth/wrong-password')).toMatch(/incorrect/i);
  });

  it('maps user-not-found', () => {
    expect(mapAuthError('auth/user-not-found')).toMatch(/no account/i);
  });

  it('maps invalid-credential', () => {
    expect(mapAuthError('auth/invalid-credential')).toMatch(/incorrect/i);
  });

  it('maps operation-not-allowed', () => {
    expect(mapAuthError('auth/operation-not-allowed')).toMatch(/not available/i);
  });

  it('maps credential-already-in-use', () => {
    expect(mapAuthError('auth/credential-already-in-use')).toMatch(/linked to another account/i);
  });

  it('maps provider-already-linked', () => {
    expect(mapAuthError('auth/provider-already-linked')).toMatch(/already has an email/i);
  });

  it('maps user-token-expired', () => {
    expect(mapAuthError('auth/user-token-expired')).toMatch(/session expired/i);
  });

  it('returns network error when code is empty but message contains "network"', () => {
    expect(mapAuthError('', 'TypeError: Network request failed')).toMatch(/network error/i);
  });

  it('returns network error when code is empty but message contains "fetch"', () => {
    expect(mapAuthError('', 'Failed to fetch')).toMatch(/network error/i);
  });

  it('returns generic message for unknown codes with no raw message', () => {
    const msg = mapAuthError('auth/unknown-code-xyz');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('maps requires-recent-login', () => {
    expect(mapAuthError('auth/requires-recent-login')).toMatch(/sign out and sign back in/i);
  });
});

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------
describe('deleteAccount', () => {
  it('calls deleteUser with the current user', async () => {
    const user = stubUser({ uid: 'uid-to-delete', isAnonymous: false });
    (auth as { currentUser: unknown }).currentUser = user;
    mockDeleteUser.mockResolvedValue(undefined);
    mockSignInAnonymously.mockResolvedValue({ user: { uid: 'anon', isAnonymous: true } });

    await deleteAccount();

    expect(mockDeleteUser).toHaveBeenCalledWith(user);
  });

  it('clears AsyncStorage after deletion', async () => {
    const user = stubUser({ uid: 'uid-to-delete', isAnonymous: false });
    (auth as { currentUser: unknown }).currentUser = user;
    mockDeleteUser.mockResolvedValue(undefined);
    mockSignInAnonymously.mockResolvedValue({ user: { uid: 'anon', isAnonymous: true } });

    await deleteAccount();

    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
  });

  it('signs in anonymously after deletion to restore a session', async () => {
    const user = stubUser({ uid: 'uid-to-delete', isAnonymous: false });
    (auth as { currentUser: unknown }).currentUser = user;
    mockDeleteUser.mockResolvedValue(undefined);
    const anonUser = { uid: 'fresh-anon', isAnonymous: true };
    mockSignInAnonymously.mockResolvedValue({ user: anonUser });

    await deleteAccount();

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('throws when there is no current user', async () => {
    (auth as { currentUser: unknown }).currentUser = null;

    await expect(deleteAccount()).rejects.toThrow('No authenticated user');
  });

  it('re-throws Firebase errors without swallowing them (e.g. requires-recent-login)', async () => {
    const user = stubUser({ uid: 'uid-to-delete', isAnonymous: false });
    (auth as { currentUser: unknown }).currentUser = user;
    const firebaseError = Object.assign(new Error('requires recent login'), {
      code: 'auth/requires-recent-login',
    });
    mockDeleteUser.mockRejectedValue(firebaseError);

    await expect(deleteAccount()).rejects.toMatchObject({ code: 'auth/requires-recent-login' });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});
