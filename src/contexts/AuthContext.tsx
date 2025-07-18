// CENTRALIZED AUTH CONTEXT - Fixes auth race conditions and excessive calls
// This replaces scattered auth.getUser() calls throughout the app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getUserProfile, checkUserRole, type UserProfile, type UserRole } from '../lib/supabase';
import { logger } from '../utils/logger';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    userRole: UserRole;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('user');
    const [loading, setLoading] = useState(true);

    // Initialize auth state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setLoading(true);

                // Get initial session
                const { data: { user: initialUser } } = await supabase.auth.getUser();
                logger.log('AuthContext - Initial user:', initialUser);
                setUser(initialUser);

                if (initialUser) {
                    // Skip profile/role fetching if database is broken
                    setProfile(null); // Will be populated from forms
                    setUserRole('user');
                }
            } catch (error) {
                logger.error('Error initializing auth:', error);
                setUser(null);
                setProfile(null);
                setUserRole('user');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const newUser = session?.user ?? null;
            logger.log('AuthContext - Auth state changed:', event, newUser);
            setUser(newUser);

            if (newUser) {
                // Skip profile fetching for now
                setProfile(null);
                setUserRole('user');
            } else {
                // Clear data when user logs out
                setProfile(null);
                setUserRole('user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            setUserRole('user');
            // Force page reload to clear any cached state
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
            // Even if there's an error, clear local state
            setUser(null);
            setProfile(null);
            setUserRole('user');
            window.location.href = '/';
        }
    };

    const refreshProfile = async () => {
        if (user) {
            try {
                const profileData = await getUserProfile();
                setProfile(profileData);
            } catch (error) {
                logger.error('Error refreshing profile:', error);
            }
        }
    };

    const refreshRole = async () => {
        if (user) {
            try {
                const roleData = await checkUserRole();
                setUserRole(roleData);
            } catch (error) {
                logger.error('Error refreshing role:', error);
            }
        }
    };

    const value: AuthContextType = {
        user,
        profile,
        userRole,
        loading,
        signOut,
        refreshProfile,
        refreshRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// HOC for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
    return (props: P) => {
        const { user, loading } = useAuth();

        if (loading) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold"></div>
                </div>
            );
        }

        if (!user) {
            // Redirect to login or show auth modal
            return null;
        }

        return <Component {...props} />;
    };
};
