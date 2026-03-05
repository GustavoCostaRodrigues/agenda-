import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { type User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'manager' | 'staff' | 'DEV';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    salon_id?: number;
    current_plan?: number;
    max_workers?: number;
    active_workers_count?: number;
    avatar_url?: string;
    permissions?: string[];
    is_active: boolean;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
    linkSalonByCode: (code: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets up listener
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) getProfile(session.user);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) getProfile(session.user);
            else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const getProfile = async (supabaseUser: SupabaseUser) => {
        const userEmail = supabaseUser.email?.toLowerCase();
        console.log('Fetching profile for:', userEmail);

        try {
            // Use maybeSingle() to avoid 406/PGRST116 error when 0 rows are found
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    salons (
                        current_plan,
                        plans:current_plan (
                            max_workers
                        )
                    )
                `)
                .ilike('email', userEmail || '')
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile from DB:', error);
                throw error;
            }

            if (data) {
                console.log('Profile loaded successfully:', data);

                // Security Check: Block inactive users
                if (data.is_active === false) {
                    console.warn('Account deactivated for:', userEmail);
                    await supabase.auth.signOut();
                    setUser(null);
                    setLoading(false);
                    throw new Error('Sua conta está inativa. Entre em contato com o Proprietário do salão.');
                }

                // 2. Fetch total active count in salon
                let totalActiveCount = 0;
                if (data.salon_id) {
                    const { count, error: countError } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('salon_id', data.salon_id)
                        .eq('is_active', true);

                    if (!countError) totalActiveCount = count || 0;
                }

                const maxWorkers = data.salons?.plans?.max_workers || 0;

                // 3. Security Check: Plan Limits blocking
                if (data.role !== 'owner' && data.role !== 'DEV' && data.salon_id) {
                    if (totalActiveCount > maxWorkers) {
                        console.warn('Plan limit exceeded for salon:', data.salon_id);
                        await supabase.auth.signOut();
                        setUser(null);
                        setLoading(false);
                        throw new Error(`Pelo visto seu salão atingiu o limite de integrantes do plano atual (${totalActiveCount}/${maxWorkers}). Que tal convidar o proprietário para conhecer nossos planos premium e liberar o acesso de toda a equipe? ✨`);
                    }
                }

                setUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role as UserRole,
                    salon_id: data.salon_id,
                    current_plan: data.salons?.current_plan,
                    max_workers: maxWorkers,
                    active_workers_count: totalActiveCount, // Unified count
                    avatar_url: data.avatar_url,
                    permissions: data.permissions || [],
                    is_active: data.is_active ?? true
                });
            } else {
                console.warn('Profile not found in "users" table for email:', userEmail);
                setUser(null);
            }
        } catch (error: any) {
            console.error('getProfile failed:', error);
            setUser(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await getProfile(session.user);
    };

    const login = async (email: string, password: string) => {
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        });

        if (error) {
            console.error('Supabase Auth Error:', error);
            throw error;
        }

        if (data.user) {
            await getProfile(data.user);
        }
    };

    const signUp = async (email: string, password: string, name: string, role: UserRole) => {
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        // 1. Create user in Supabase Auth with metadata
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
                data: {
                    name,
                    role
                }
            }
        });

        if (authError) throw authError;

        // 2. The database trigger 'handle_new_user' handles the record creation in 'users' table
        // No manual insert needed here to avoid race conditions or double entries
        if (authData.user) {
            // Wait a small moment for trigger to finish or just fetch directly
            // getProfile uses ilike 'email', so it will find the triggered record
            await getProfile(authData.user);
        }
    };

    const linkSalonByCode = async (code: string) => {
        if (!user) throw new Error('Usuário não autenticado.');

        // Find salon by code
        const { data: salon, error: salonError } = await supabase
            .from('salons')
            .select(`
                id,
                current_plan,
                plans:current_plan (max_workers),
                users (id, is_active)
            `)
            .eq('code', code.trim().toUpperCase())
            .eq('is_active', 1)
            .single();

        if (salonError || !salon) {
            throw new Error('Código do salão inválido ou salão inativo.');
        }

        // Plan Limits Check
        const totalActive = (salon.users as any[] || []).filter(u => u.is_active !== false).length;
        const planLimit = (salon.plans as any)?.max_workers || 1;

        if (totalActive >= planLimit) {
            throw new Error(`O plano deste salão (${totalActive}/${planLimit} usuários) já está completo. Peça ao proprietário para liberar uma vaga ou fazer upgrade.`);
        }

        // Link user to salon
        const { error: updateError } = await supabase
            .from('users')
            .update({ salon_id: salon.id, is_active: false }) // Link as INACTIVE by default if under limit but needs owner activation? 
            // Wait, usually they link as active if there's space. 
            // But the user said: "O dono determinará quais são os outros trabalhadores deverão ter suas contas ativadas."
            // So new users should probably start as inactive.
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Refresh profile in state
        const { data: updatedUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // Re-calculate worker count for verification
        const { count: totalActiveCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salon.id)
            .eq('is_active', true);

        setUser({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role as UserRole,
            salon_id: updatedUser.salon_id,
            current_plan: salon.current_plan,
            max_workers: (salon.plans as any)?.max_workers,
            active_workers_count: totalActiveCount || 0,
            avatar_url: updatedUser.avatar_url,
            permissions: updatedUser.permissions || [],
            is_active: updatedUser.is_active ?? true
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, signUp, linkSalonByCode, refreshProfile, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
