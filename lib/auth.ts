import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from "firebase/auth";
import { auth } from "./firebase";

export const login = async (email: string, password: string) => {
  try {
    // Validate input
    if (!email || !email.trim()) {
      return { user: null, error: "Email is required" };
    }
    if (!password || password.length < 6) {
      return { user: null, error: "Password must be at least 6 characters" };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Provide user-friendly error messages
    let errorMessage = "Login failed. Please try again.";
    
    if (error.code) {
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email. Please sign up first.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address. Please check your email.";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled. Please contact support.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password authentication is not enabled. Please contact support.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password. Please try again.";
          break;
        default:
          errorMessage = error.message || "Login failed. Please try again.";
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return { user: null, error: errorMessage };
  }
};

export const register = async (email: string, password: string) => {
  try {
    // Validate input
    if (!email || !email.trim()) {
      return { user: null, error: "Email is required" };
    }
    if (!password || password.length < 6) {
      return { user: null, error: "Password must be at least 6 characters" };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { user: null, error: "Please enter a valid email address" };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Provide user-friendly error messages
    let errorMessage = "Registration failed. Please try again.";
    
    if (error.code) {
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered. Please log in instead.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address. Please check your email.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password registration is not enabled. Please contact support.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please choose a stronger password.";
          break;
        default:
          errorMessage = error.message || "Registration failed. Please try again.";
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return { user: null, error: errorMessage };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Force account picker to show every time
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    // Handle popup closed by user
    if (error.code === 'auth/popup-closed-by-user') {
      return { user: null, error: 'Sign-in cancelled' };
    }
    return { user: null, error: error.message };
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

