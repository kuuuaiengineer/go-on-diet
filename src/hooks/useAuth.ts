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

const TOKEN_KEY = "gd_access_token";
const TOKEN_TS_KEY = "gd_access_token_ts";
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55分（Googleトークンの有効期限1時間より前）

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TS_KEY, Date.now().toString());
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TS_KEY);
}

function loadToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const ts = localStorage.getItem(TOKEN_TS_KEY);
  if (!token || !ts) return null;
  if (Date.now() - parseInt(ts) > TOKEN_TTL_MS) {
    clearToken();
    return null; // 期限切れ
  }
  return token;
}

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
        const token = loadToken(); // 期限切れなら null
        setState({ user, accessToken: token, loading: false });
      } else {
        clearToken();
        setState({ user: null, accessToken: null, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) saveToken(token);
    setState((prev) => ({ ...prev, user: result.user, accessToken: token }));
    return { user: result.user, accessToken: token };
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    clearToken();
    setState({ user: null, accessToken: null, loading: false });
  };

  const refreshAccessToken = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) {
      saveToken(token);
      setState((prev) => ({ ...prev, accessToken: token }));
    }
    return token;
  };

  return { ...state, signIn, signOut, refreshAccessToken };
}
