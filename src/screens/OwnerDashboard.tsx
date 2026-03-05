import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
    is_active: boolean;
}

interface Props {
    section: 'equipe' | 'ajustes';
}

const OwnerDashboard: React.FC<Props> = ({ section }) => {
    const { user, refreshProfile } = useAuth();
    const [config, setConfig] = useState({
        name: 'Meu Salão',
        primary_color: '#9D00FF',
        logo_url: ''
    });

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [fetching, setFetching] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal State for ownership transfer
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [pendingTransfer, setPendingTransfer] = useState<{ id: number, name: string } | null>(null);

    useEffect(() => {
        if (section === 'equipe' && user?.salon_id) {
            fetchTeamMembers();
        }
    }, [section, user?.salon_id]);

    const fetchTeamMembers = async () => {
        if (!user?.salon_id) return;
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, role, avatar_url, is_active')
                .eq('salon_id', user.salon_id)
                .order('name', { ascending: true });

            if (error) throw error;

            // Sort to place Owner at the top
            const sorted = (data || []).sort((a, b) => {
                if (a.role === 'owner') return -1;
                if (b.role === 'owner') return 1;
                return a.name.localeCompare(b.name);
            });

            setTeamMembers((sorted || []).map(m => ({ ...m, is_active: m.is_active ?? true })));
        } catch (err: any) {
            console.error('Error fetching team:', err);
        } finally {
            setFetching(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleUpdateMember = async (memberId: number, updates: Partial<TeamMember>) => {
        // Plan Limits Check for activation
        if (updates.is_active === true && user?.max_workers) {
            const activeCount = teamMembers.filter(m => m.is_active).length;
            const planLimit = user.max_workers;

            if (activeCount >= planLimit) {
                showMessage('error', `Seu plano (${planLimit} usuário${planLimit > 1 ? 's' : ''}) já atingiu o limite de contas ativas. Desative outro colaborador para ativar este.`);
                return;
            }
        }

        // Intercept transfer to owner
        if (updates.role === 'owner') {
            const member = teamMembers.find(m => m.id === memberId);
            if (member && member.role !== 'owner') {
                setPendingTransfer({ id: memberId, name: member.name });
                setShowConsentModal(true);
                return;
            }
        }

        await executeMemberUpdate(memberId, updates);
    };

    const executeMemberUpdate = async (memberId: number, updates: Partial<TeamMember>) => {
        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', memberId);

            if (error) throw error;
            setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m));
            showMessage('success', 'Membro atualizado.');

            // Re-fetch to update sorting if role changed
            if (updates.role) fetchTeamMembers();

            // Refresh global user state to update active_workers_count
            refreshProfile();
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const confirmTransfer = () => {
        if (pendingTransfer) {
            executeMemberUpdate(pendingTransfer.id, { role: 'owner' });
            setShowConsentModal(false);
            setPendingTransfer(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px' }}>
            <header>
                <h1 style={{ fontSize: '32px' }}>{section === 'equipe' ? 'Equipe' : 'Ajustes'}</h1>
                <p>{section === 'equipe' ? 'Gerencie permissões e colaboradores' : 'Personalize sua experiência'}</p>
            </header>

            {message && (
                <div className="glass fade-in" style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: message.type === 'success' ? '#34C759' : '#FF3B30',
                    fontWeight: '600',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    position: 'sticky',
                    top: '80px',
                    zIndex: 100
                }}>
                    {message.text}
                </div>
            )}

            {/* Plan Limit Warning for Owner */}
            {user?.role === 'owner' && user.max_workers !== undefined && user.active_workers_count !== undefined && user.active_workers_count > user.max_workers && (
                <div className="glass fade-in" style={{
                    padding: '24px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(0, 122, 255, 0.1)',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>✨</span>
                        <h3 style={{ margin: 0, color: 'var(--ios-primary)', fontSize: '18px', fontWeight: '800' }}>Sua equipe cresceu!</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#3A3A3C', fontWeight: '500' }}>
                        Notamos que seu salão está com mais integrantes ativos do que o permitido no seu plano atual.
                        Para que todo o time continue aproveitando o Agenda+ sem interrupções, sugerimos um rápido upgrade para o próximo nível.
                        <br />
                        <span style={{ fontSize: '13px', opacity: 0.8 }}>É simples e leva apenas alguns segundos!</span>
                    </p>
                    <button
                        onClick={() => window.location.href = '/planos'}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '12px 24px',
                            background: 'var(--ios-gradient-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0, 122, 255, 0.2)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Conheça os Planos Disponíveis
                    </button>
                </div>
            )}

            {/* Team Management Section */}
            {section === 'equipe' && (user?.role === 'owner' || user?.permissions?.includes('equipe')) && (
                <>
                    {/* Member List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                            <h3 style={{ margin: 0 }}>Integrantes ({teamMembers.length})</h3>
                            {user?.role === 'owner' && user.max_workers !== undefined && (
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: (user.active_workers_count || 0) > (user.max_workers || 1) ? '#FF3B30' : 'var(--ios-text-secondary)',
                                    background: (user.active_workers_count || 0) > (user.max_workers || 1) ? 'rgba(255,59,48,0.1)' : 'rgba(0,0,0,0.03)',
                                    padding: '4px 12px',
                                    borderRadius: '10px'
                                }}>
                                    {Math.max(user.active_workers_count || 0, 1)} / {user.max_workers || 1} {user.max_workers === 1 ? 'Usuário' : 'Usuários'}
                                </span>
                            )}
                        </div>
                        {fetching ? (
                            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>Carregando equipe...</div>
                        ) : (
                            teamMembers.map((member) => (
                                <div key={member.id} className="glass" style={{
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    opacity: member.is_active ? 1 : 0.6,
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {/* Avatar */}
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} style={{ width: '50px', height: '50px', borderRadius: '25px', objectFit: 'cover', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} />
                                        ) : (
                                            <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '20px' }}>
                                                {member.name?.[0]}
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: '700', fontSize: '17px', marginBottom: '2px' }}>{member.name}</p>
                                            <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', fontWeight: '500' }}>{member.email}</p>
                                        </div>

                                        {/* Status Switch (iOS Style) - Only for non-owners */}
                                        {member.role !== 'owner' && (
                                            <div
                                                onClick={() => handleUpdateMember(member.id, { is_active: !member.is_active })}
                                                style={{
                                                    width: '51px',
                                                    height: '31px',
                                                    borderRadius: '15.5px',
                                                    background: member.is_active ? '#34C759' : '#D1D1D6',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <div style={{
                                                    width: '27px',
                                                    height: '27px',
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: member.is_active ? '22px' : '2px',
                                                    boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Role Toggle Buttons Row */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[
                                            { id: 'owner', label: 'Dono' },
                                            { id: 'manager', label: 'Gerente' },
                                            { id: 'staff', label: 'Colaborador' }
                                        ].filter(r => {
                                            // If it's an owner card, only show the 'Dono' button
                                            if (member.role === 'owner') return r.id === 'owner';
                                            return true;
                                        }).map((r) => {
                                            const isActive = member.role === r.id;
                                            const isOwnerCard = member.role === 'owner';

                                            return (
                                                <button
                                                    key={r.id}
                                                    disabled={isOwnerCard}
                                                    onClick={() => handleUpdateMember(member.id, { role: r.id })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 4px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        cursor: isOwnerCard ? 'default' : 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        border: isActive ? 'none' : '1px solid rgba(0,0,0,0.05)',
                                                        backgroundColor: isActive
                                                            ? 'var(--ios-primary)'
                                                            : 'rgba(0,0,0,0.02)',
                                                        color: isActive ? 'white' : 'var(--ios-text-secondary)',
                                                        boxShadow: isActive ? '0 4px 12px rgba(0, 122, 255, 0.2)' : 'none'
                                                    }}
                                                >
                                                    {r.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )
            }

            {/* White Label Section */}
            {
                section === 'ajustes' && (user?.role === 'owner' || user?.permissions?.includes('configuracoes')) && (
                    <div className="glass" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px' }}>Personalização</h3>
                        <div className="ios-input-group">
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ios-text-secondary)', marginLeft: '4px', textTransform: 'uppercase' }}>NOME DA UNIDADE</label>
                            <input
                                className="ios-input"
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            />
                        </div>
                    </div>
                )
            }

            {
                user?.role === 'manager' && section === 'equipe' && (!user.permissions || user.permissions.length === 0) && (
                    <div className="glass" style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>
                        <p>Aguardando configuração de acesso pelo proprietário.</p>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {
                showConsentModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '400px',
                            padding: '32px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '28px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            color: '#000000'
                        }}>
                            <div style={{ fontSize: '40px' }}>👑</div>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Transferir Propriedade?</h2>
                            <p style={{ color: '#3A3A3C', fontSize: '15px', lineHeight: '1.6' }}>
                                Você está prestes a tornar <strong>{pendingTransfer?.name}</strong> o proprietário deste salão.
                                <br /><br />
                                Esta ação é <strong>permanente</strong> e você perderá o controle administrativo total.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={confirmTransfer}
                                    style={{
                                        background: '#FF3B30',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '700',
                                        height: '54px',
                                        borderRadius: '16px',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Sim, Transferir
                                </button>
                                <button
                                    onClick={() => {
                                        setShowConsentModal(false);
                                        setPendingTransfer(null);
                                    }}
                                    style={{
                                        background: '#F2F2F7',
                                        color: '#000000',
                                        border: 'none',
                                        fontWeight: '600',
                                        height: '54px',
                                        borderRadius: '16px',
                                        fontSize: '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default OwnerDashboard;
