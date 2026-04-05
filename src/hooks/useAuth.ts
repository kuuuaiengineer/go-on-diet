"use client";

import { useState, useEffect } from "react";
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const token = sessionStorage.getItem("gd_access_token");
        setState({ user, accessToken: token, loading: false });
      } else {
        sessionStorage.removeItem("gd_access_token");
        setState({ user: null, accessToken: null, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) {
      sessionStorage.setItem("gd_access_token", token);
    }
    setState((prev) => ({ ...prev, user: result.user, accessToken: token }));
    return { user: result.user, accessToken: token };
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    sessionStorage.removeItem("gd_access_token");
    setState({ user: null, accessToken: null, loading: false });
  };

  const refreshAccessToken = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) {
      sessionStorage.setItem("gd_access_token", token);
      setState((prev) => ({ ...prev, accessToken: token }));
    }
    return token;
  };

  return { ...state, signIn, signOut, refreshAccessToken };
}
