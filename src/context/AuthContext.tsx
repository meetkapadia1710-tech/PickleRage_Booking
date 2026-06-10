import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const userRef = useRef<User | null>(null);

  const refreshProfile = useCallback(async () => {
    const user = userRef.current;
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      setProfileComplete(snap.exists() && !!(snap.data()?.phone));
    } catch {
      setProfileComplete(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      userRef.current = user;
      setCurrentUser(user);
      if (!user) {
        setProfileComplete(false);
        setLoading(false);
        return;
      }
      getDoc(doc(db, 'users', user.uid))
        .then(snap => { if (!cancelled) setProfileComplete(snap.exists() && !!(snap.data()?.phone)); })
        .catch(() => { if (!cancelled) setProfileComplete(false); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, profileComplete, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
