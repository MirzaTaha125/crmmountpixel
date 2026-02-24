import React, { createContext, useContext, useState, useEffect } from 'react';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  // Initialize user from localStorage
  const [user, setUserState] = useState(() => {
    const stored = localStorage.getItem('crm_user');
    const userData = stored ? JSON.parse(stored) : null;
    // Ensure token is in localStorage if user has it
    if (userData?.token && !localStorage.getItem('token')) {
      localStorage.setItem('token', userData.token);
    }
    return userData;
  });

  // Save user to localStorage on change
  useEffect(() => {
    if (user) {
      localStorage.setItem('crm_user', JSON.stringify(user));
      // Also store token separately for easy access
      if (user.token) {
        localStorage.setItem('token', user.token);
      }
    } else {
      localStorage.removeItem('crm_user');
      localStorage.removeItem('token');
    }
  }, [user]);

  // Wrap setUser to update both state and localStorage
  const setUser = (u) => {
    setUserState(u);
  };

  return (
    <SessionContext.Provider value={{ user, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}  