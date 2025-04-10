import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  getAuth,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from './config';

// Register a new user
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the user profile
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in existing user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign out current user
export const signOut = async () => {
  const auth = getAuth();
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Return the current user's auth state
export const onAuthStateChanged = (callback) => {
  const auth = getAuth();
  return auth.onAuthStateChanged(callback);
};

// Update the user's profile (display name, photo URL)
export const updateUserProfile = async (profileData) => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('No user logged in');
  
  await updateProfile(auth.currentUser, profileData);
  return auth.currentUser;
};

// Update the user's email
export const updateUserEmail = async (newEmail) => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('No user logged in');
  
  await updateEmail(auth.currentUser, newEmail);
  return auth.currentUser;
};

// Update the user's password
export const updateUserPassword = async (newPassword) => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('No user logged in');
  
  await updatePassword(auth.currentUser, newPassword);
  return auth.currentUser;
};

// Re-authenticate the user (required for sensitive operations)
export const reauthenticateUser = async (currentPassword) => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('No user logged in');
  
  const credential = EmailAuthProvider.credential(
    auth.currentUser.email, 
    currentPassword
  );
  
  await reauthenticateWithCredential(auth.currentUser, credential);
  return true;
};
