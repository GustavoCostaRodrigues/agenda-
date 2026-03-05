import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface Plan {
    id: number;
    name: string;
    max_workers: number;
    price?: number;
    features?: string[];
}

const Plans: React.FC = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingId, setRequestingId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestUpgrade = async (planId: number, planName: string) => {
        if (!user?.salon_id) return;

        setRequestingId(planId);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('salons')
                .update({ requested_plan: planId })
                .eq('id', user.salon_id);

            if (error) throw error;

            setMessage({
                type: 'success',
                text: `Solicitação para o plano "${planName}" enviada com sucesso! Um desenvolvedor analisará seu pedido.`
            });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao solicitar upgrade. Tente novamente.' });
            console.error('Request upgrade error:', err);
        } finally {
            setRequestingId(null);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando planos...</div>;

    return (
        <div className="plans-container fade-in" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Planos Disponíveis</h1>
                <p style={{ color: 'var(--ios-text-secondary)', fontSize: '17px' }}>Escolha o plano ideal para a escala do seu negócio</p>
            </header>

            {message && (
                <div className="glass fade-in" style={{
                    padding: '16px',
                    marginBottom: '24px',
                    textAlign: 'center',
                    color: message.type === 'success' ? '#34C759' : '#FF3B30',
                    fontWeight: '700',
                    borderRadius: '16px',
                    border: message.type === 'success' ? '1px solid rgba(52, 199, 89, 0.2)' : '1px solid rgba(255, 59, 48, 0.2)'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
            }}>
                {plans.map((plan) => {
                    const isCurrent = user?.current_plan === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className="glass"
                            style={{
                                padding: '32px',
                                borderRadius: '32px',
                                border: isCurrent ? '3px solid var(--ios-primary)' : '1px solid rgba(0,0,0,0.05)',
                                background: isCurrent ? 'rgba(0,122,255,0.02)' : 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                position: 'relative',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {isCurrent && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-15px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--ios-primary)',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
                                }}>
                                    Plano Atual
                                </div>
                            )}

                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>{plan.name}</h2>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: '900' }}>
                                        {plan.price ? `R$ ${plan.price}` : 'Consultar'}
                                    </span>
                                    {plan.price && <span style={{ fontSize: '14px', color: '#8E8E93' }}>/mês</span>}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ color: 'var(--ios-primary)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '600' }}>
                                        {plan.max_workers >= 1000 ? (
                                            <strong>Colaboradores Ilimitados</strong>
                                        ) : (
                                            <>Até <strong>{plan.max_workers}</strong> {plan.max_workers === 1 ? 'colaborador' : 'colaboradores'}</>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <button
                                className={isCurrent ? "glass-pill" : "btn-primary"}
                                onClick={() => !isCurrent && handleRequestUpgrade(plan.id, plan.name)}
                                style={{
                                    marginTop: 'auto',
                                    padding: '16px',
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    opacity: (isCurrent || requestingId === plan.id) ? 0.6 : 1,
                                    cursor: (isCurrent || requestingId === plan.id) ? 'default' : 'pointer'
                                }}
                                disabled={isCurrent || requestingId !== null}
                            >
                                {isCurrent ? 'Plano Ativo' : requestingId === plan.id ? 'Enviando...' : 'Fazer Upgrade'}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="glass" style={{ marginTop: '40px', padding: '24px', textAlign: 'center', borderRadius: '24px', opacity: 0.8 }}>
                <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary)' }}>
                    Precisa de uma solução customizada para redes de salões? <br />
                    <a href="#" style={{ color: 'var(--ios-primary)', fontWeight: '700', textDecoration: 'none' }}>Fale com nosso time comercial</a>
                </p>
            </div>
        </div>
    );
};

export default Plans;
