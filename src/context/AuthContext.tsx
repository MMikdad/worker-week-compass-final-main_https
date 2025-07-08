import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { toast } from "sonner";

export type UserRole = "admin" | "user";

export interface User {
  username: string;
  role: UserRole;
  memberId?: string; // Link to team member ID
}

interface UserCredential {
  username: string;
  password: string;
  role: UserRole;
  isDefaultPassword: boolean;
  memberId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: () => boolean;
  isAuthenticated: () => boolean;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
  resetUserPassword: (username: string) => boolean;
  isSelf: (memberId: string) => boolean;
  getUserCredentials: () => UserCredential[];
  addUserCredentials: (username: string, password: string, role: UserRole, memberId?: string) => void;
  updateUserRole: (username: string, role: UserRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Local storage keys
const STORAGE_KEY_USERS = "team-calendar-users";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Initialize with default credentials if localStorage is empty
  const initialCredentials = (): UserCredential[] => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { username: "admin", password: "admin", role: "admin" as UserRole, isDefaultPassword: false },
      { username: "user", password: "user", role: "user" as UserRole, isDefaultPassword: false },
    ];
  };

  const [credentials, setCredentials] = useState<UserCredential[]>(initialCredentials());

  // Save to localStorage when credentials change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(credentials));
  }, [credentials]);

  const login = (username: string, password: string): boolean => {
    // Find user by username
    const userCredential = credentials.find(cred => cred.username === username);
    
    if (!userCredential) {
      toast.error("Invalid username or password");
      return false;
    }
    
    // Check password
    if (userCredential.password !== password) {
      toast.error("Invalid username or password");
      return false;
    }
    
    // Login successful
    setUser({
      username: userCredential.username,
      role: userCredential.role,
      memberId: userCredential.memberId
    });
    
    // Show appropriate message based on password status
    if (userCredential.isDefaultPassword) {
      toast.warning("Please change your default password", {
        duration: 5000
      });
    } else {
      toast.success(`Welcome, ${userCredential.role === "admin" ? "Admin" : "User"}!`);
    }
    
    return true;
  };

  const logout = () => {
    setUser(null);
    toast.info("Logged out successfully");
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const isAuthenticated = (): boolean => {
    return user !== null;
  };
  
  const changePassword = (currentPassword: string, newPassword: string): boolean => {
    if (!user) {
      toast.error("You must be logged in to change your password");
      return false;
    }
    
    // Find user credential
    const index = credentials.findIndex(cred => cred.username === user.username);
    if (index === -1) {
      toast.error("User not found");
      return false;
    }
    
    // Verify current password
    if (credentials[index].password !== currentPassword) {
      toast.error("Current password is incorrect");
      return false;
    }
    
    // Update password
    const updatedCredentials = [...credentials];
    updatedCredentials[index] = {
      ...updatedCredentials[index],
      password: newPassword,
      isDefaultPassword: false
    };
    
    setCredentials(updatedCredentials);
    toast.success("Password changed successfully");
    return true;
  };
  
  const resetUserPassword = (username: string): boolean => {
    if (!isAdmin()) {
      toast.error("Only admin can reset passwords");
      return false;
    }
    
    // Find user credential
    const index = credentials.findIndex(cred => cred.username === username);
    if (index === -1) {
      toast.error("User not found");
      return false;
    }
    
    // Reset password to default
    const updatedCredentials = [...credentials];
    updatedCredentials[index] = {
      ...updatedCredentials[index],
      password: "Hallo123",
      isDefaultPassword: true
    };
    
    setCredentials(updatedCredentials);
    toast.success(`Password for ${username} has been reset to the default password`);
    return true;
  };
  
  const isSelf = (memberId: string): boolean => {
    return user?.memberId === memberId;
  };
  
  const getUserCredentials = (): UserCredential[] => {
    if (!isAdmin()) {
      return [];
    }
    return credentials;
  };
  
  const addUserCredentials = (username: string, password: string, role: UserRole, memberId?: string) => {
    if (!isAdmin()) {
      toast.error("Only admin can add users");
      return;
    }
    
    // Check if username already exists
    if (credentials.some(cred => cred.username === username)) {
      toast.error(`Username "${username}" already exists`);
      return;
    }
    
    // Add new user
    const newUserCredential: UserCredential = {
      username,
      password,
      role,
      isDefaultPassword: true,
      memberId
    };
    
    setCredentials([...credentials, newUserCredential]);
    toast.success(`User ${username} has been added`);
  };

  const updateUserRole = (username: string, role: UserRole): boolean => {
    if (!isAdmin()) {
      toast.error("Only admins can change user roles");
      return false;
    }
    
    // Don't allow changing the main admin role
    if (username === 'admin') {
      toast.error("Cannot change role for the main admin account");
      return false;
    }
    
    // Find user credential
    const index = credentials.findIndex(cred => cred.username === username);
    if (index === -1) {
      toast.error("User not found");
      return false;
    }
    
    // Update role
    const updatedCredentials = [...credentials];
    updatedCredentials[index] = {
      ...updatedCredentials[index],
      role
    };
    
    setCredentials(updatedCredentials);
    toast.success(`${username}'s role has been updated to ${role}`);
    
    // If the current user's role is being changed, update the user state
    if (user && user.username === username) {
      setUser({
        ...user,
        role
      });
    }
    
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isAuthenticated,
        changePassword,
        resetUserPassword,
        isSelf,
        getUserCredentials,
        addUserCredentials,
        updateUserRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
