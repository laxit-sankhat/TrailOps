import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import api from '../api/axiosInstance';
import axios from 'axios';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); 
  const [isLoading, setIsLoading] = useState(true); // true initially, since we're checking on load

  useEffect(() => {
      const restoreSession = async () => {
        try {
          const refreshResponse = await axios.post(
            'http://localhost:5000/api/auth/refresh',
            {},
            { withCredentials: true }
          );
          localStorage.setItem('accessToken', refreshResponse.data.accessToken);

          const meResponse = await api.get('/auth/me'); // this one CAN use api - if it 401s, that's a genuinely broken state worth investigating
          setUser(meResponse.data.user);
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      };

      restoreSession();
  }, []);

  const login  = async (email: string, password: string) => {
    setIsLoading(true);
    try{
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
    }
    finally{
        setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context)
        throw new Error('useAuth must be used within an AuthProvider');

    return context;
}