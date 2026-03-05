import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface Salon {
    id: number;
    name: string;
    code: string;
    is_active: number;
    current_plan: string | null;
    requested_plan: string | null;
    billing_day: number;
    plan_change_date: string | null;
    previous_plan_id: string | null;
    city?: string;
    neighborhood?: string;
    street?: string;
    number?: string;
    zip_code?: string;
}

interface Payment {
    id: number;
    amount: number;
    description: string;
    payment_date: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    position?: string;
    is_active?: boolean;
}

interface Props {
    salonId: number;
    onBack: () => void;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    // Use hyphen to slash replacement to ensure local time interpretation for YYYY-MM-DD
    const date = new Date(dateStr.split('T')[0].replace(/-/g, '/'));
    return isNaN(date.getTime()) ? 'Data Inválida' : date.toLocaleDateString('pt-BR');
};

const SalonDetail: React.FC<Props> = ({ salonId, onBack }) => {
    const [salon, setSalon] = useState<Salon | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [owners, setOwners] = useState<User[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [allPlans, setAllPlans] = useState<{ id: number, name: string, price: number }[]>([]);
    const [planHistory, setPlanHistory] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showBillBreakdown, setShowBillBreakdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ownerEmail, setOwnerEmail] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDesc, setPaymentDesc] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => {
        fetchData();
    }, [salonId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Salon Data
            const { data: salonData, error: salonError } = await supabase.from('salons').select('*').eq('id', salonId).single();
            if (salonError) throw salonError;
            setSalon(salonData);

            // 2. Fetch Payments
            const { data: paymentData, error: paymentError } = await supabase.from('payments').select('*').eq('salon_id', salonId).order('payment_date', { ascending: false });
            if (paymentError) throw paymentError;
            setPayments(paymentData || []);

            // 3. Fetch Owners
            const { data: ownersData, error: ownersError } = await supabase.from('users').select('id, name, email, role').eq('salon_id', salonId).eq('role', 'owner');
            if (ownersError) throw ownersError;
            setOwners(ownersData || []);

            // 4. Fetch Staff members
            const { data: staffData, error: staffError } = await supabase.from('users').select('*').eq('salon_id', salonId).neq('role', 'owner');
            if (staffError) throw staffError;
            setStaff(staffData || []);

            // 5. Fetch Plans for pricing
            const { data: plansData, error: plansError } = await supabase.from('plans').select('id, name, price');
            if (plansError) throw plansError;
            setAllPlans(plansData || []);

        } catch (err: any) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlanHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('salon_plan_history')
                .select('*, previous_plan:previous_plan_id(name), new_plan:new_plan_id(name)')
                .eq('salon_id', salonId)
                .order('change_date', { ascending: false });

            if (error) throw error;
            setPlanHistory(data || []);
        } catch (err) {
            console.error('History fetch error:', err);
        }
    };

    useEffect(() => {
        if (salonId) fetchPlanHistory();
    }, [salonId]);

    const handleToggleActive = async () => {
        if (!salon) return;
        const newStatus = salon.is_active ? 0 : 1;
        try {
            const { error } = await supabase.from('salons').update({ is_active: newStatus }).eq('id', salonId);
            if (error) throw error;
            setSalon({ ...salon, is_active: newStatus });
            showMessage('success', `Salão ${newStatus ? 'ativado' : 'inativado'}`);
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const planMap: { [key: string]: number } = {
        'Basic': 1,
        'Plus': 2,
        'Pro': 3
    };

    const reversePlanMap: { [key: number]: string } = {
        1: 'Basic',
        2: 'Plus',
        3: 'Pro'
    };

    const handleUpdatePlan = async (name: string) => {
        if (!salon) return;
        const planId = planMap[name];
        const oldPlanId = salon.current_plan;

        try {
            // 1. Update Salon
            const { error: updateError } = await supabase.from('salons').update({
                current_plan: planId,
                previous_plan_id: oldPlanId,
                plan_change_date: new Date().toISOString(),
                requested_plan: null
            }).eq('id', salonId);

            if (updateError) throw updateError;

            // 2. Record to History Table
            const { error: historyError } = await supabase.from('salon_plan_history').insert([{
                salon_id: salonId,
                previous_plan_id: oldPlanId,
                new_plan_id: planId
            }]);

            if (historyError) console.error('History record failed:', historyError);

            setSalon({
                ...salon,
                current_plan: planId.toString(),
                previous_plan_id: oldPlanId,
                plan_change_date: new Date().toISOString(),
                requested_plan: null
            });
            showMessage('success', 'Plano atualizado!');
            fetchPlanHistory(); // Refresh history
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const calculateProRata = () => {
        if (!salon || !allPlans.length) return { total: 0, breakdown: null };

        const now = new Date();
        const billingDay = salon.billing_day || 5;

        // Define current cycle
        let cycleStart = new Date(now.getFullYear(), now.getMonth(), billingDay);
        if (cycleStart > now) {
            cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
        }
        let cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingDay);

        const totalDaysInCycle = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));

        const currentPlan = allPlans.find(p => p.id === Number(salon.current_plan));
        const currentPrice = currentPlan?.price || 0;

        // No change in this cycle
        if (!salon.plan_change_date || !salon.previous_plan_id) {
            return { total: currentPrice, breakdown: null };
        }

        const changeDate = new Date(salon.plan_change_date);

        // If change was before this cycle, it's irrelevant now
        if (changeDate < cycleStart) return { total: currentPrice, breakdown: null };

        // If change is in future cycle (edge case), also irrelevant
        if (changeDate > cycleEnd) return { total: currentPrice, breakdown: null };

        // Change happened within this cycle
        const previousPlan = allPlans.find(p => p.id === Number(salon.previous_plan_id));
        const previousPrice = previousPlan?.price || 0;

        // Days at old price (inclusive of the day of change)
        const daysInPeriod1 = Math.floor((changeDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysInPeriod2 = totalDaysInCycle - daysInPeriod1;

        const partial1 = (previousPrice / totalDaysInCycle) * daysInPeriod1;
        const partial2 = (currentPrice / totalDaysInCycle) * daysInPeriod2;

        return {
            total: partial1 + partial2,
            breakdown: {
                period1: {
                    name: previousPlan?.name || 'Plano Anterior',
                    price: previousPrice,
                    days: daysInPeriod1,
                    value: partial1,
                },
                period2: {
                    name: currentPlan?.name || 'Novo Plano',
                    price: currentPrice,
                    days: daysInPeriod2,
                    value: partial2,
                },
                totalDays: totalDaysInCycle
            }
        };
    };

    const calculatedBill = calculateProRata();

    const handleUpdateBillingDay = async (day: number) => {
        if (!salon) return;
        if (day < 1 || day > 31) return;
        try {
            const { error } = await supabase.from('salons').update({ billing_day: day }).eq('id', salonId);
            if (error) throw error;
            setSalon({ ...salon, billing_day: day });
            showMessage('success', 'Dia de vencimento atualizado!');
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const handleAddOwner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const email = ownerEmail.trim().toLowerCase();
            const { data: targetUser, error: findError } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
            if (findError) throw findError;
            if (!targetUser) throw new Error('Usuário não encontrado com este e-mail.');

            const { error } = await supabase.from('users').update({ role: 'owner', salon_id: salonId }).eq('id', targetUser.id);
            if (error) throw error;

            showMessage('success', 'Proprietário adicionado!');
            setOwnerEmail('');
            fetchData();
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const handleRemoveOwner = async (userId: number) => {
        if (!window.confirm('Remover privilégios de dono deste usuário?')) return;
        try {
            const { error } = await supabase.from('users').update({ role: 'staff' }).eq('id', userId);
            if (error) throw error;
            showMessage('success', 'Privilégios removidos.');
            fetchData();
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase.from('payments').insert([{
                salon_id: salonId,
                amount: parseFloat(paymentAmount),
                description: paymentDesc,
                payment_date: paymentDate
            }]).select().single();
            if (error) throw error;
            setPayments([data, ...payments]);
            setPaymentAmount('');
            setPaymentDesc('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            showMessage('success', 'Pagamento registrado!');
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '24px' }} className="premium-bg-surface">
            <div className="pulse-dot" style={{ width: '32px', height: '32px' }} />
            <p style={{ fontWeight: '800', fontSize: '20px', opacity: 0.5 }}>Sincronizando Terminal de Gestão...</p>
        </div>
    );
    if (!salon) return (
        <div style={{ padding: '60px', textAlign: 'center' }}>
            <p>Salão não encontrado.</p>
            <button onClick={onBack} className="btn-primary" style={{ marginTop: '20px' }}>Voltar</button>
        </div>
    );

    const currentPlanName = reversePlanMap[Number(salon.current_plan)] || 'Basic';

    return (
        <div className="premium-bg-surface" style={{ flex: 1, width: '100%', minHeight: '100vh', paddingBottom: '80px', display: 'flex', justifyContent: 'center' }}>
            <div className="agenda-container" style={{ paddingTop: '60px', width: '100%', margin: '0 auto' }}>
                <header className="agenda-header" style={{ marginBottom: '48px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <button
                            onClick={onBack}
                            className="nav-arrow-btn glass-pill"
                            style={{
                                width: '64px', height: '64px', fontSize: '32px',
                                background: 'white', border: '1px solid rgba(0,0,0,0.05)',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <div>
                            <h1 className="text-gradient" style={{ fontSize: '48px', marginBottom: '4px', letterSpacing: '-1.5px' }}>{salon.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.6 }}>
                                <span style={{ fontWeight: '800', fontSize: '18px' }}>#{salon.code}</span>
                                <span style={{ width: '4px', height: '4px', borderRadius: '2px', background: 'currentColor' }} />
                                <span style={{ fontWeight: '600', fontSize: '18px' }}>{staff.length + owners.length} Integrantes na Rede</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="glass-pill" style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.6)', fontWeight: '800', color: 'var(--ios-primary)' }}>
                            PRO DASHBOARD 3.0
                        </div>
                    </div>
                </header>

                {/* Requested Plan Modal / Notification */}
                {salon.requested_plan && (
                    <div className="glass premium fade-in" style={{
                        padding: '32px',
                        marginBottom: '40px',
                        background: 'rgba(255, 59, 48, 0.05)',
                        border: '2px solid rgba(255, 59, 48, 0.2)',
                        borderRadius: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="pulse-red" style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF3B30' }} />
                            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#FF3B30' }}>Solicitação de Upgrade Pendente</h2>
                        </div>
                        <p style={{ fontSize: '17px', fontWeight: '600', color: 'var(--ios-text-primary)', lineHeight: '1.5' }}>
                            O proprietário deste salão solicitou a alteração do plano atual para o plano:
                            <strong style={{ marginLeft: '8px', padding: '4px 12px', background: '#FF3B30', color: 'white', borderRadius: '8px' }}>
                                {reversePlanMap[Number(salon.requested_plan)] || 'Plano Desconhecido'}
                            </strong>
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => handleUpdatePlan(reversePlanMap[Number(salon.requested_plan)])}
                                className="btn-primary"
                                style={{ background: '#34C759', border: 'none', height: '52px', padding: '0 24px' }}
                            >
                                Aprovar e Alterar Plano
                            </button>
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.from('salons').update({ requested_plan: null }).eq('id', salonId);
                                    if (!error) {
                                        if (salon) setSalon({ ...salon, requested_plan: null });
                                        showMessage('success', 'Solicitação descartada.');
                                    }
                                }}
                                className="glass-pill"
                                style={{ height: '52px', padding: '0 24px', border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                                Descartar Solicitação
                            </button>
                        </div>
                    </div>
                )}

                {message && (
                    <div className="glass premium fade-in" style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: message.type === 'success' ? '#34C759' : '#FF3B30',
                        fontWeight: '900',
                        marginBottom: '40px',
                        borderRadius: '24px',
                        fontSize: '18px'
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr 1.2fr',
                    gap: '40px',
                    alignItems: 'stretch'
                }}>
                    {/* COLUMN 1: Identity & Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        <div className="glass premium" style={{ padding: '40px', borderRadius: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Status Operacional</h3>
                                    <p style={{ fontSize: '16px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>{salon.is_active ? 'Unidade ativa e operante' : 'Acesso temporariamente bloqueado'}</p>
                                </div>
                                <label className="ios-switch" style={{ transform: 'scale(1.2)' }}>
                                    <input type="checkbox" checked={salon.is_active === 1} onChange={handleToggleActive} />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.03)', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ios-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: '900', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>Localização Localizada</p>
                                        <p style={{ fontSize: '15px', fontWeight: '700' }}>
                                            {salon.street ? `${salon.street}, ${salon.number}` : 'Endereço não configurado'}
                                        </p>
                                        <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary)' }}>
                                            {salon.neighborhood} {salon.city && `• ${salon.city}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass premium" style={{ padding: '40px', borderRadius: '40px' }}>
                            <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '12px', color: 'var(--ios-text-primary)' }}>Configuração de Ciclo</h3>
                            <p style={{ fontSize: '15px', color: 'var(--ios-text-secondary)', marginBottom: '24px' }}>Defina o dia do mês para o fechamento da fatura.</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    defaultValue={salon.billing_day || 5}
                                    onBlur={(e) => handleUpdateBillingDay(parseInt(e.target.value))}
                                    className="ios-input"
                                    style={{ width: '100px', textAlign: 'center', fontSize: '20px', fontWeight: '800' }}
                                />
                                <span style={{ fontWeight: '700', color: 'var(--ios-text-secondary)' }}>de cada mês</span>
                            </div>
                        </div>

                        <div className="glass premium" style={{ padding: '40px', borderRadius: '40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '12px', color: 'var(--ios-text-primary)' }}>Plano de Serviço</h3>
                            <p style={{ fontSize: '15px', color: 'var(--ios-text-secondary)', marginBottom: '32px' }}>Defina o tier de recursos para esta unidade.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {['Basic', 'Plus', 'Pro'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handleUpdatePlan(p)}
                                        style={{
                                            padding: '20px 24px',
                                            borderRadius: '24px',
                                            fontSize: '17px',
                                            fontWeight: '800',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: currentPlanName === p ? 'var(--ios-primary)' : 'rgba(255,255,255,0.7)',
                                            color: currentPlanName === p ? 'white' : 'var(--ios-text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: currentPlanName === p ? '0 12px 28px rgba(0, 122, 255, 0.3)' : '0 2px 5px rgba(0,0,0,0.02)',
                                            border: currentPlanName === p ? 'none' : '1px solid rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        {p}
                                        {currentPlanName === p && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: Team & Access */}
                    <div className="glass premium" style={{ padding: '40px', borderRadius: '40px', height: '100%' }}>
                        <div style={{ marginBottom: '48px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Nível: Proprietários</h3>
                                <span style={{ background: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}>ADMIN PRIVILEGE</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                                {owners.map(o => (
                                    <div key={o.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '20px 24px',
                                        background: 'rgba(255,255,255,0.6)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(0,0,0,0.02)'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: '800', fontSize: '18px', color: 'var(--ios-text-primary)' }}>{o.name}</p>
                                            <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: '600' }}>{o.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveOwner(o.id)}
                                            style={{
                                                background: 'rgba(255, 59, 48, 0.08)',
                                                border: 'none',
                                                color: '#FF3B30',
                                                fontWeight: '900',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                padding: '10px 20px',
                                                borderRadius: '14px'
                                            }}
                                        >
                                            REVOGAR
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddOwner} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <input
                                    className="ios-input"
                                    style={{ borderRadius: '20px', height: '64px', padding: '0 24px', fontSize: '17px' }}
                                    placeholder="E-mail para novo proprietário"
                                    value={ownerEmail}
                                    onChange={(e) => setOwnerEmail(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn-primary" style={{ height: '64px', borderRadius: '22px', fontSize: '17px' }}>Autorizar Acesso Root</button>
                            </form>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '40px' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '32px', color: 'var(--ios-text-primary)' }}>Equipe / Colaboradores ({staff.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }} className="no-scrollbar">
                                {staff.map(s => (
                                    <div key={s.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '20px',
                                        padding: '16px 20px',
                                        background: 'rgba(255,255,255,0.3)',
                                        borderRadius: '20px'
                                    }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--ios-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800' }}>
                                            {s.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: '800', fontSize: '16px' }}>{s.name}</p>
                                            <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', fontWeight: '600' }}>{s.position || 'Staff'} • {s.role.toUpperCase()}</p>
                                        </div>
                                        <div style={{ marginLeft: 'auto' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: s.is_active !== false ? '#34C759' : '#C7C7CC' }} />
                                        </div>
                                    </div>
                                ))}
                                {staff.length === 0 && <p style={{ textAlign: 'center', padding: '40px', opacity: 0.3, fontWeight: '700' }}>Nenhum colaborador registrado.</p>}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: Financial & Payments */}
                    <div className="glass premium" style={{ padding: '40px', borderRadius: '40px', height: '100%' }}>
                        <div style={{ marginBottom: '48px' }}>
                            {/* Row 1: Title Only */}
                            <h3 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--ios-text-primary)', marginBottom: '32px', width: '100%' }}>
                                Faturamento da Unidade
                            </h3>

                            {/* Row 2: Billing Info Splits */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Vencimento Mensal</p>
                                    <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ios-text-primary)' }}>Todo dia {salon.billing_day || 5}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>Valor do Mês Atual</p>
                                        <button
                                            type="button"
                                            onClick={() => setShowBillBreakdown(true)}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', color: 'var(--ios-primary)', padding: '0' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '32px', fontWeight: '900', color: 'var(--ios-primary)' }}>
                                        R$ {calculatedBill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Plan History Button */}
                            <button
                                onClick={() => setShowHistoryModal(true)}
                                className="glass-pill"
                                style={{
                                    width: '100%',
                                    height: '56px',
                                    marginBottom: '32px',
                                    padding: '0 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    fontWeight: '800',
                                    fontSize: '15px'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Ver Histórico de Troca de Planos
                            </button>

                            <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label-ios" style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>VALOR</label>
                                        <input
                                            className="ios-input"
                                            style={{ borderRadius: '20px', height: '64px', fontSize: '20px', fontWeight: '900', color: '#34C759' }}
                                            type="number"
                                            placeholder="0,00"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div style={{ flex: 1.5 }}>
                                        <label className="label-ios" style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>REFERÊNCIA</label>
                                        <input
                                            className="ios-input"
                                            style={{ borderRadius: '20px', height: '64px', fontSize: '17px' }}
                                            placeholder="Ex: Assinatura Mar/26"
                                            value={paymentDesc}
                                            onChange={(e) => setPaymentDesc(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ width: '100%' }}>
                                    <label className="label-ios" style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px' }}>DATA DA LIQUIDAÇÃO (PAGAMENTO)</label>
                                    <input
                                        type="date"
                                        className="ios-input"
                                        style={{ borderRadius: '20px', height: '64px', fontSize: '17px' }}
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{
                                    height: '72px',
                                    background: '#34C759',
                                    boxShadow: '0 15px 30px rgba(52, 199, 89, 0.4)',
                                    borderRadius: '24px',
                                    fontSize: '18px'
                                }}>
                                    Registrar Transação (Receita)
                                </button>
                            </form>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Livro de Receitas</h3>
                                <span style={{ fontSize: '14px', fontWeight: '800', opacity: 0.5 }}>ULTIMOS LANÇAMENTOS</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }} className="no-scrollbar">
                                {payments.map(p => (
                                    <div key={p.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '24px',
                                        background: 'rgba(255,255,255,0.4)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(0,0,0,0.02)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '22px', color: '#34C759' }}>+ R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                            <div style={{ fontSize: '15px', color: 'var(--ios-text-secondary)', fontWeight: '700', marginTop: '4px' }}>{p.description}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ fontSize: '14px', color: '#8E8E93', fontWeight: '800' }}>
                                                {formatDate(p.payment_date)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#34C759', fontWeight: '900', marginTop: '4px' }}>LIQUIDADO</div>
                                        </div>
                                    </div>
                                ))}
                                {payments.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(0,0,0,0.02)', borderRadius: '32px' }}>
                                        <p style={{ opacity: 0.3, fontSize: '16px', fontWeight: '800' }}>Nenhum fluxo financeiro registrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan History Modal */}
                {showHistoryModal && (
                    <div className="glass-modal fade-in" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '20px'
                    }}>
                        <div className="glass premium" style={{
                            width: '100%', maxWidth: '600px', maxHeight: '80vh',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            borderRadius: '40px', padding: '0', background: 'white'
                        }}>
                            <header style={{ padding: '32px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900' }}>Histórico de Planos</h3>
                                    <p style={{ fontSize: '14px', color: '#8E8E93', fontWeight: '600' }}>Linha do tempo de todas as alterações</p>
                                </div>
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </header>

                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {planHistory.map((h, i) => (
                                        <div key={h.id} style={{
                                            display: 'flex', gap: '20px', padding: '20px',
                                            background: 'rgba(0,0,0,0.02)', borderRadius: '24px',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: '2px', background: 'var(--ios-primary)', opacity: 0.1,
                                                position: 'absolute', left: '39px', top: i === 0 ? '50px' : 0,
                                                bottom: i === planHistory.length - 1 ? '50px' : 0
                                            }} />

                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '20px',
                                                background: 'var(--ios-primary)', color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: '900', zIndex: 1
                                            }}>
                                                {planHistory.length - i}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <p style={{ fontWeight: '800', fontSize: '18px' }}>
                                                        {h.new_plan?.name || 'Plano Atualizado'}
                                                    </p>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#8E8E93' }}>
                                                        {new Date(h.change_date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '14px', color: '#8E8E93', fontWeight: '600', marginTop: '4px' }}>
                                                    {h.previous_plan?.name ? `Vindo do plano ${h.previous_plan.name}` : 'Ativação inicial do sistema'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {planHistory.length === 0 && (
                                        <p style={{ textAlign: 'center', padding: '40px', opacity: 0.4, fontWeight: '700' }}>Nenhuma alteração registrada até o momento.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Breakdown Modal */}
                {showBillBreakdown && (
                    <div className="glass-modal fade-in" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '20px'
                    }}>
                        <div className="glass premium" style={{
                            width: '100%', maxWidth: '500px',
                            borderRadius: '40px', padding: '0', background: 'white'
                        }}>
                            <header style={{ padding: '32px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900' }}>Detalhamento do Valor</h3>
                                    <p style={{ fontSize: '14px', color: '#8E8E93', fontWeight: '600' }}>Como chegamos ao valor deste mês</p>
                                </div>
                                <button
                                    onClick={() => setShowBillBreakdown(false)}
                                    style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </header>

                            <div style={{ padding: '32px' }}>
                                {!calculatedBill.breakdown ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ios-text-primary)' }}>
                                            O valor de <strong>R$ {calculatedBill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> é referente à mensalidade integral do plano atual.
                                        </p>
                                        <p style={{ fontSize: '14px', color: '#8E8E93' }}>
                                            Não foram identificadas trocas de plano durante o ciclo de faturamento vigente.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '800', color: 'var(--ios-text-secondary)', fontSize: '12px' }}>PERÍODO 1</span>
                                                <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '8px' }}>{calculatedBill.breakdown.period1.days} dias</span>
                                            </div>
                                            <p style={{ fontWeight: '800', fontSize: '17px' }}>{calculatedBill.breakdown.period1.name}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                                                <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '600' }}>
                                                    R$ {calculatedBill.breakdown.period1.price.toLocaleString('pt-BR')} / {calculatedBill.breakdown.totalDays} dias
                                                </span>
                                                <span style={{ fontWeight: '900', fontSize: '18px', color: 'var(--ios-text-primary)' }}>
                                                    R$ {calculatedBill.breakdown.period1.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(0,122,255,0.05)', borderRadius: '24px', border: '1px solid rgba(0,122,255,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '800', color: 'var(--ios-primary)', fontSize: '12px' }}>PERÍODO 2</span>
                                                <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(0,122,255,0.1)', color: 'var(--ios-primary)', padding: '4px 10px', borderRadius: '8px' }}>{calculatedBill.breakdown.period2.days} dias</span>
                                            </div>
                                            <p style={{ fontWeight: '800', fontSize: '17px', color: 'var(--ios-primary)' }}>{calculatedBill.breakdown.period2.name}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                                                <span style={{ fontSize: '13px', color: 'rgba(0,122,255,0.6)', fontWeight: '600' }}>
                                                    R$ {calculatedBill.breakdown.period2.price.toLocaleString('pt-BR')} / {calculatedBill.breakdown.totalDays} dias
                                                </span>
                                                <span style={{ fontWeight: '900', fontSize: '18px', color: 'var(--ios-primary)' }}>
                                                    R$ {calculatedBill.breakdown.period2.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 8px 8px 8px', borderTop: '2px dashed rgba(0,0,0,0.05)' }}>
                                            <span style={{ fontWeight: '900', fontSize: '18px' }}>Total do Mês</span>
                                            <span style={{ fontWeight: '900', fontSize: '28px', color: 'var(--ios-primary)' }}>
                                                R$ {calculatedBill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalonDetail;
