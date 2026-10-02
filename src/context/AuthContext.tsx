import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthModal } from '../components/AuthModal';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logOut: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  requireAuth: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logOut: async () => {},
  deleteAccount: async () => {},
  requireAuth: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // If user logs in and we have a pending action, execute it
      if (currentUser && pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
        setShowModal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const logOut = async () => {
    await signOut(auth);
  };

  const deleteAccount = async (password?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (password && currentUser.email) {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }
    await deleteUser(currentUser);
  };

  const requireAuth = (callback: () => void) => {
    if (user) {
      callback();
    } else {
      pendingActionRef.current = callback;
      setShowModal(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logOut, deleteAccount, requireAuth }}>
      {children}
      {showModal && (
        <AuthModal 
          onClose={() => {
            setShowModal(false);
            pendingActionRef.current = null;
          }} 
        />
      )}
    </AuthContext.Provider>
  );
};
