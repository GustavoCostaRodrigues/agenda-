import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import SalonDetail from './SalonDetail';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Salon {
    id: number;
    name: string;
    code: string;
    is_active: number;
    current_plan?: string | null;
    requested_plan?: string | null;
    billing_day?: number;
}

interface Payment {
    id: number;
    salon_id: number;
    amount: number;
    description: string;
    payment_date: string;
    salon_name?: string;
}

interface PlanHistory {
    id: string;
    salon_id: number;
    previous_plan_id: number | null;
    new_plan_id: number;
    change_date: string;
    salon_name?: string;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr.split('T')[0].replace(/-/g, '/'));
    return isNaN(date.getTime()) ? 'Data Inválida' : date.toLocaleDateString('pt-BR');
};

const DevDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [salons, setSalons] = useState<Salon[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [allPlanHistory, setAllPlanHistory] = useState<PlanHistory[]>([]);
    const [allPlans, setAllPlans] = useState<{ id: number, name: string, price: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'financeiro'>('dashboard');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [salonToDelete, setSalonToDelete] = useState<Salon | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    useEffect(() => {
        fetchSalons();
        fetchGlobalData();
    }, []);

    const fetchGlobalData = async () => {
        try {
            // 1. Fetch All Payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .order('payment_date', { ascending: true });

            if (paymentsError) throw paymentsError;

            // 2. Fetch All Plan History
            const { data: historyData, error: historyError } = await supabase
                .from('salon_plan_history')
                .select('*')
                .order('change_date', { ascending: true });

            if (historyError) throw historyError;

            // 3. Fetch All Plans for labels and pro-rata
            const { data: plansData, error: plansError } = await supabase
                .from('plans')
                .select('id, name, price');
            if (plansError) throw plansError;
            setAllPlans(plansData || []);

            setAllPayments(paymentsData || []);
            setAllPlanHistory(historyData || []);
        } catch (err: any) {
            console.error('Error fetching global data:', err);
        }
    };

    const generateFinanceReport = () => {
        const doc = new jsPDF();
        const salonMap = new Map(salons.map(s => [s.id, s.name]));

        // Group payments by month
        const paymentsByMonth: { [key: string]: Payment[] } = {};
        allPayments.forEach(p => {
            const date = new Date(p.payment_date.split('T')[0].replace(/-/g, '/'));
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!paymentsByMonth[key]) paymentsByMonth[key] = [];
            paymentsByMonth[key].push({
                ...p,
                salon_name: salonMap.get(p.salon_id) || 'Unidade Desconhecida'
            });
        });

        // Group history by month
        const historyByMonth: { [key: string]: PlanHistory[] } = {};
        allPlanHistory.forEach(h => {
            const date = new Date(h.change_date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!historyByMonth[key]) historyByMonth[key] = [];
            historyByMonth[key].push({
                ...h,
                salon_name: salonMap.get(h.salon_id) || 'Unidade Desconhecida'
            });
        });

        const sortedMonths = Object.keys(paymentsByMonth).sort().reverse();

        doc.setFontSize(22);
        doc.setTextColor(0, 122, 255);
        doc.text('Relatório Financeiro Global - Agenda+', 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(142, 142, 147);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

        let yPos = 40;

        sortedMonths.forEach((month, idx) => {
            if (idx > 0 && yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            const [year, m] = month.split('-');
            const monthDate = new Date(Number(year), Number(m) - 1);
            const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(monthDate);

            doc.setFontSize(16);
            doc.setTextColor(26, 26, 26);
            doc.text(`${monthName.toUpperCase()} ${year}`, 14, yPos);
            yPos += 10;

            const tableData = paymentsByMonth[month].map(p => {
                const salonObj = salons.find(s => s.id === p.salon_id);
                const billingDay = salonObj?.billing_day || 5;

                // Determine Billing Cycle for this payment
                const paymentDateObj = new Date(p.payment_date.split('T')[0].replace(/-/g, '/'));
                let cycleStart = new Date(paymentDateObj.getFullYear(), paymentDateObj.getMonth(), billingDay);
                if (cycleStart > paymentDateObj) {
                    cycleStart = new Date(paymentDateObj.getFullYear(), paymentDateObj.getMonth() - 1, billingDay);
                }
                let cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingDay);
                const totalDaysInCycle = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));

                // Find if there was an upgrade in this cycle
                const relevantUpgrades = allPlanHistory.filter(h => {
                    if (h.salon_id !== p.salon_id) return false;
                    const changeDate = new Date(h.change_date);
                    return changeDate >= cycleStart && changeDate < cycleEnd;
                });

                let descriptionHighlight = p.description;
                if (relevantUpgrades.length > 0) {
                    const h = relevantUpgrades[0];
                    const prevPlan = allPlans.find(pl => Number(pl.id) === Number(h.previous_plan_id));
                    const newPlan = allPlans.find(pl => Number(pl.id) === Number(h.new_plan_id));
                    const changeDate = new Date(h.change_date);

                    const daysInPeriod1 = Math.floor((changeDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const daysInPeriod2 = totalDaysInCycle - daysInPeriod1;

                    const price1 = Number(prevPlan?.price || 0);
                    const price2 = Number(newPlan?.price || 0);
                    const totalDays = Number(totalDaysInCycle) || 30;

                    const val1 = (price1 / totalDays) * daysInPeriod1;
                    const val2 = (price2 / totalDays) * daysInPeriod2;

                    descriptionHighlight += `\n\nUPGRADE: ${prevPlan?.name || 'Sem Plano'} -> ${newPlan?.name || 'Novo Plano'}`;
                    descriptionHighlight += `\nAlteração em: ${changeDate.toLocaleDateString('pt-BR')}`;
                    descriptionHighlight += `\n• ${daysInPeriod1} dias ${prevPlan?.name || 'Anterior'}: R$ ${val1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    descriptionHighlight += `\n• ${daysInPeriod2} dias ${newPlan?.name || 'Novo'}: R$ ${val2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }

                return [
                    formatDate(p.payment_date),
                    p.salon_name || 'Unidade Desconhecida',
                    descriptionHighlight,
                    `R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                ];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['Data', 'Unidade', 'Descrição', 'Valor']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 122, 255], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 5 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 45 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 28, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            });

            // @ts-ignore
            yPos = doc.lastAutoTable.finalY + 20;
        });

        doc.save(`Relatorio_Financeiro_Agenda+_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Chart Data Processing
    const getRevenueChartData = () => {
        const grouped: { [key: string]: number } = {};
        allPayments.forEach(p => {
            const date = new Date(p.payment_date.split('T')[0].replace(/-/g, '/'));
            const m = date.toLocaleString('pt-BR', { month: 'short' });
            grouped[m] = (grouped[m] || 0) + p.amount;
        });
        return Object.entries(grouped).map(([month, amount]) => ({ month, amount }));
    };

    const getUpgradesChartData = () => {
        const grouped: { [key: string]: number } = {};
        allPlanHistory.forEach(h => {
            const date = new Date(h.change_date);
            const m = date.toLocaleString('pt-BR', { month: 'short' });
            grouped[m] = (grouped[m] || 0) + 1;
        });
        return Object.entries(grouped).map(([month, count]) => ({ month, count }));
    };

    const fetchSalons = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('salons')
                .select('*')
                .order('name');
            if (error) throw error;
            setSalons(data || []);
        } catch (err: any) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSalon = async (e: React.FormEvent) => {
        e.preventDefault();
        const generatedCode = generateRandomCode();
        try {
            const { data, error } = await supabase
                .from('salons')
                .insert([{ name: newName, code: generatedCode, is_active: 1 }])
                .select()
                .single();
            if (error) throw error;
            setSalons([...salons, data]);
            setNewName('');
            setShowAddModal(false);
            showMessage('success', `Salão "${newName}" criado com código ${generatedCode}!`);
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const toggleStatus = async (id: number, currentStatus: number) => {
        const newStatus = currentStatus ? 0 : 1;
        try {
            const { error } = await supabase
                .from('salons')
                .update({ is_active: newStatus })
                .eq('id', id);
            if (error) throw error;
            setSalons(salons.map(s => s.id === id ? { ...s, is_active: newStatus } : s));
            showMessage('success', `Salão ${newStatus ? 'ativado' : 'inativado'}`);
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    const handleDeleteSalon = async () => {
        if (!salonToDelete) return;

        if (deleteConfirmCode !== salonToDelete.code) {
            showMessage('error', 'Código de confirmação incorreto!');
            return;
        }

        try {
            const { error } = await supabase
                .from('salons')
                .delete()
                .eq('id', salonToDelete.id);

            if (error) throw error;

            setSalons(salons.filter(s => s.id !== salonToDelete.id));
            setShowDeleteModal(false);
            setSalonToDelete(null);
            setDeleteConfirmCode('');
            showMessage('success', 'Salão excluído com sucesso!');
        } catch (err: any) {
            showMessage('error', err.message);
        }
    };

    if (selectedSalonId) {
        return <SalonDetail salonId={selectedSalonId} onBack={() => {
            setSelectedSalonId(null);
            fetchSalons();
        }} />;
    }

    const stats = {
        total: salons.length,
        active: salons.filter(s => s.is_active).length,
        inactive: salons.filter(s => !s.is_active).length
    };

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
            {/* Sidebar */}
            <nav className="sidebar">
                <div style={{ padding: '0 10px 40px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: '900', boxShadow: '0 10px 20px rgba(157, 0, 255, 0.25)' }}>
                        S
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>Agenda+</h2>
                </div>

                <div className="glass" style={{ margin: '0 0 32px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: 'none', background: 'rgba(0,0,0,0.035)', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '26px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '20px', border: '3px solid white' }}>
                            {user?.name?.[0].toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontWeight: '800', fontSize: '16px', color: 'var(--ios-text-primary)' }}>{user?.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--ios-primary)', fontWeight: '900', letterSpacing: '1px' }}>DEVELOPER</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                        onClick={() => setActiveTab('dashboard')}
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            padding: '14px 18px',
                            gap: '14px',
                            borderRadius: '16px',
                            background: activeTab === 'dashboard' ? 'white' : 'transparent',
                            boxShadow: activeTab === 'dashboard' ? '0 10px 25px rgba(0,0,0,0.04)' : 'none',
                            color: activeTab === 'dashboard' ? 'var(--ios-primary)' : 'var(--ios-text-secondary)'
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><path d="M10.75 15A2.25 2.25 0 0 1 13 17.25v5.5A2.25 2.25 0 0 1 10.75 25h-5.5A2.25 2.25 0 0 1 3 22.75v-5.5A2.25 2.25 0 0 1 5.25 15zm12 0A2.25 2.25 0 0 1 25 17.25v5.5A2.25 2.25 0 0 1 22.75 25h-5.5A2.25 2.25 0 0 1 15 22.75v-5.5A2.25 2.25 0 0 1 17.25 15zm-12 1.5h-5.5a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-5.5a.75.75 0 0 0-.75-.75m12 0h-5.5a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-5.5a.75.75 0 0 0-.75-.75M10.75 3A2.25 2.25 0 0 1 13 5.25v5.5A2.25 2.25 0 0 1 10.75 13h-5.5A2.25 2.25 0 0 1 3 10.75v-5.5A2.25 2.25 0 0 1 5.25 3zm12 0A2.25 2.25 0 0 1 25 5.25v5.5A2.25 2.25 0 0 1 22.75 13h-5.5A2.25 2.25 0 0 1 15 10.75v-5.5A2.25 2.25 0 0 1 17.25 3zm-12 1.5h-5.5a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-5.5a.75.75 0 0 0-.75-.75m12 0h-5.5a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-5.5a.75.75 0 0 0-.75-.75" fill="currentColor" /></svg>
                        <span style={{ fontWeight: activeTab === 'dashboard' ? '800' : '600' }}>Dashboard</span>
                    </div>

                    <div
                        onClick={() => setActiveTab('financeiro')}
                        className={`nav-item ${activeTab === 'financeiro' ? 'active' : ''}`}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            padding: '14px 18px',
                            gap: '14px',
                            borderRadius: '16px',
                            background: activeTab === 'financeiro' ? 'white' : 'transparent',
                            boxShadow: activeTab === 'financeiro' ? '0 10px 25px rgba(0,0,0,0.04)' : 'none',
                            color: activeTab === 'financeiro' ? 'var(--ios-primary)' : 'var(--ios-text-secondary)'
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M12.5 10.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75m.75 4.75a.75.75 0 1 0 0 1.5h3.5a.75.75 0 1 0 0-1.5zm-2.47-5.22a.75.75 0 1 0-1.06-1.06l-1.47 1.47l-.47-.47a.75.75 0 0 0-1.06 1.06l1 1a.75.75 0 0 0 1.06 0zm0 4.44a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 0 1-1.06 0l-1-1a.75.75 0 1 1 1.06-1.06l.47.47l1.47-1.47a.75.75 0 0 1 1.06 0m5.214-10.136A2.25 2.25 0 0 0 13.75 2h-3.5a2.25 2.25 0 0 0-2.236 2H6.25A2.25 2.25 0 0 0 4 6.25v13.5A2.25 2.25 0 0 0 6.25 22h11.5A2.25 2.25 0 0 0 20 19.75V6.25A2.25 2.25 0 0 0 17.75 4h-1.764zm0 .012L16 4.25q0-.078-.005-.154M10.25 6.5h3.5c.78 0 1.467-.397 1.871-1h2.129a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H6.25a.75.75 0 0 1-.75-.75V6.25a.75.75 0 0 1 .75-.75h2.129c.404.603 1.091 1 1.871 1m0-3h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5" /></svg>
                        <span style={{ fontWeight: activeTab === 'financeiro' ? '800' : '600' }}>Financeiro</span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    style={{
                        marginTop: 'auto',
                        padding: '18px',
                        background: 'none',
                        border: 'none',
                        color: '#FF3B30',
                        fontWeight: '800',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        borderRadius: '16px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sair
                </button>
            </nav>

            {/* Main Content */}
            <main className="main-content premium-bg-surface" style={{ flex: 1, padding: '60px 80px' }}>
                {activeTab === 'dashboard' ? (
                    <div className="agenda-container" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                        <header className="agenda-header" style={{ marginBottom: '40px', alignItems: 'center' }}>
                            <div>
                                <h1 className="text-gradient" style={{ fontSize: '48px', marginBottom: '8px', letterSpacing: '-1.5px' }}>Ecosistema Agenda+</h1>
                                <p style={{ fontSize: '18px', fontWeight: '500', opacity: 0.7 }}>Painel de Gestão Centralizado • Developer Suite</p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary desktop-only"
                                style={{
                                    height: '56px',
                                    padding: '0 32px',
                                    width: 'auto',
                                    borderRadius: '20px',
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    boxShadow: '0 15px 30px rgba(0, 122, 255, 0.2)'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Nova Unidade
                            </button>
                        </header>

                        {/* Stats Bar */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '24px',
                            marginBottom: '48px'
                        }}>
                            <div className="glass premium" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: '24px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-primary)' }}>
                                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path fill="currentColor" d="M14 17h-3.5V3H14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3M6 3h3.5v6.5H3V6a3 3 0 0 1 3-3m-3 7.5V14a3 3 0 0 0 3 3h3.5v-6.5z" /></svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total de Unidades</p>
                                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>{stats.total}</h2>
                                </div>
                            </div>
                            <div className="glass premium" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: '24px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
                                    <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><path fill="currentColor" d="M8.406 2.852A1.33 1.33 0 0 1 9.65 2h8.516c.927 0 1.57.922 1.252 1.792L17.324 9.5h4.837c1.178 0 1.777 1.416.957 2.262L9.784 25.503c-1.14 1.175-3.106.117-2.753-1.482l1.66-7.521H5.917a1.917 1.917 0 0 1-1.787-2.61z" /></svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Unidades Ativas</p>
                                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#34C759' }}>{stats.active}</h2>
                                </div>
                            </div>
                            <div className="glass premium" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', borderRadius: '24px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30' }}>
                                    <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><path fill="currentColor" d="M9 6.5a4.5 4.5 0 1 1 9 0V8h1.25A3.75 3.75 0 0 1 23 11.75v9.5A3.75 3.75 0 0 1 19.25 25H7.75A3.75 3.75 0 0 1 4 21.25v-9.5A3.75 3.75 0 0 1 7.75 8H9zm4.5-3a3 3 0 0 0-3 3V8h6V6.5a3 3 0 0 0-3-3m0 14.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3" /></svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bloqueados</p>
                                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#FF3B30' }}>{stats.inactive}</h2>
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className="glass premium fade-in" style={{
                                padding: '24px',
                                marginBottom: '40px',
                                textAlign: 'center',
                                color: message.type === 'success' ? '#34C759' : '#FF3B30',
                                fontWeight: '800',
                                fontSize: '17px',
                                borderRadius: '24px'
                            }}>
                                {message.text}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '24px' }}>
                                <div className="pulse-dot" style={{ width: '24px', height: '24px' }} />
                                <p style={{ fontWeight: '700', fontSize: '18px', opacity: 0.5 }}>Sincronizando Ecossistema...</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                                gap: '40px',
                                padding: '10px 0'
                            }}>
                                {salons.map(salon => (
                                    <div
                                        key={salon.id}
                                        className="glass premium"
                                        style={{
                                            padding: '40px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '32px',
                                            cursor: 'pointer',
                                            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                            borderRadius: '40px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            height: '100%'
                                        }}
                                        onClick={() => setSelectedSalonId(salon.id)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <h3 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>{salon.name}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        color: 'var(--ios-primary)',
                                                        fontWeight: '900',
                                                        letterSpacing: '1px',
                                                        background: 'rgba(0, 122, 255, 0.1)',
                                                        padding: '6px 14px',
                                                        borderRadius: '10px'
                                                    }}>CODE: {salon.code}</span>
                                                    {/* @ts-ignore */}
                                                    {(salon.city || salon.neighborhood) && (
                                                        <span style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: '600' }}>
                                                            {/* @ts-ignore */}
                                                            {salon.city && `${salon.city}`} {salon.neighborhood && `• ${salon.neighborhood}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                <div
                                                    onClick={() => {
                                                        setSalonToDelete(salon);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '12px',
                                                        background: 'rgba(255, 59, 48, 0.1)',
                                                        color: '#FF3B30',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z" /></svg>
                                                </div>
                                                <label className="ios-switch" style={{ transform: 'scale(1.2)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={salon.is_active === 1}
                                                        onChange={() => toggleStatus(salon.id, salon.is_active)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            padding: '16px 24px',
                                            background: 'rgba(255,255,255,0.5)',
                                            borderRadius: '24px',
                                            border: '1px solid rgba(255,255,255,0.8)',
                                            alignItems: 'center',
                                            gap: '12px',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                backgroundColor: salon.is_active ? '#34C759' : '#C7C7CC',
                                                boxShadow: salon.is_active ? '0 0 12px rgba(52, 199, 89, 0.6)' : 'none'
                                            }} />
                                            <span style={{ fontSize: '16px', fontWeight: '800' }}>
                                                {salon.is_active ? 'Online' : 'Bloqueado'}
                                            </span>

                                            {/* @ts-ignore */}
                                            {salon.requested_plan && (
                                                <div style={{
                                                    marginLeft: 'auto',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'rgba(255, 59, 48, 0.1)',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div className="pulse-red" style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#FF3B30',
                                                        boxShadow: '0 0 10px rgba(255, 59, 48, 0.5)'
                                                    }} />
                                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#FF3B30' }}>UPGRADE</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: '8px',
                                            paddingTop: '16px',
                                            borderTop: '1px solid rgba(0,0,0,0.05)'
                                        }}>
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: '900',
                                                color: 'var(--ios-primary)',
                                                letterSpacing: '1.5px'
                                            }}>ABRIR CONSOLE DE GESTÃO</span>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '20px',
                                                background: 'var(--ios-gradient-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 8px 20px rgba(0,122,255,0.25)',
                                                color: 'white'
                                            }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {salons.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '120px', background: 'rgba(255,255,255,0.4)', borderRadius: '48px', border: '3px dashed rgba(0,0,0,0.05)' }}>
                                        <p style={{ fontSize: '22px', fontWeight: '800', opacity: 0.3 }}>Nenhuma unidade cadastrada no ecossistema Agenda+.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="agenda-container" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                        <header className="agenda-header" style={{ marginBottom: '48px', alignItems: 'center' }}>
                            <div>
                                <h1 className="text-gradient" style={{ fontSize: '48px', marginBottom: '8px', letterSpacing: '-1.5px' }}>Financeiro Global</h1>
                                <p style={{ fontSize: '18px', fontWeight: '500', opacity: 0.7 }}>Ecossistema Agenda+ • Analytics de Receita e Escalonamento</p>
                            </div>
                            <button
                                onClick={generateFinanceReport}
                                className="btn-primary"
                                style={{
                                    height: '56px',
                                    padding: '0 32px',
                                    width: 'auto',
                                    borderRadius: '20px',
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    boxShadow: '0 15px 30px rgba(0, 122, 255, 0.2)',
                                    background: 'var(--ios-gradient-primary)'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Exportar PDF Mensal
                            </button>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            {/* Revenue Chart */}
                            <div className="glass premium" style={{ padding: '40px', borderRadius: '40px' }}>
                                <div style={{ marginBottom: '32px' }}>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Evolução de Faturamento</h3>
                                    <p style={{ fontSize: '15px', color: 'var(--ios-text-secondary)' }}>Receita total consolidada por mês</p>
                                </div>
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getRevenueChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: '700' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: '700' }}
                                                tickFormatter={(value) => `R$ ${value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '800' }}
                                                formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="var(--ios-primary)"
                                                strokeWidth={4}
                                                dot={{ r: 6, fill: 'var(--ios-primary)', strokeWidth: 3, stroke: 'white' }}
                                                activeDot={{ r: 8, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Upgrades Chart */}
                            <div className="glass premium" style={{ padding: '40px', borderRadius: '40px' }}>
                                <div style={{ marginBottom: '32px' }}>
                                    <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ios-text-primary)' }}>Fluxo de Upgrades</h3>
                                    <p style={{ fontSize: '15px', color: 'var(--ios-text-secondary)' }}>Novas adesões e migrações de plano</p>
                                </div>
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getUpgradesChartData()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: '700' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: '700' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '800' }}
                                                formatter={(value) => [value, 'Upgrades']}
                                            />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                                {getUpgradesChartData().map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--ios-primary)' : '#5856D6'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions Recap */}
                        <div className="glass premium" style={{ marginTop: '40px', padding: '40px', borderRadius: '40px' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '32px', color: 'var(--ios-text-primary)' }}>Atividade Mensal Consolidada</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {allPayments.slice().reverse().slice(0, 5).map(p => (
                                    <div key={p.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '20px 32px',
                                        background: 'rgba(255,255,255,0.4)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '800', fontSize: '18px' }}>R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: '600' }}>
                                                    {salons.find(s => s.id === p.salon_id)?.name} • {p.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '14px', fontWeight: '800', opacity: 0.5 }}>{formatDate(p.payment_date)}</p>
                                            <p style={{ fontSize: '12px', color: '#34C759', fontWeight: '900', marginTop: '4px' }}>CONFIRMADO</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal for Adding Salon */}
            {showAddModal && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)' }}>
                    <div className="modal-content glass premium" style={{ maxWidth: '500px', padding: '56px', borderRadius: '48px' }}>
                        <div className="modal-header" style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '32px', letterSpacing: '-1px' }}>Expandir Rede</h2>
                            <button onClick={() => setShowAddModal(false)} className="close-btn" style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.03)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <p style={{ marginTop: '-20px', marginBottom: '40px', fontSize: '17px', color: 'var(--ios-text-secondary)', fontWeight: '600', lineHeight: 1.5, opacity: 0.8 }}>
                            Informe o nome da nova unidade para gerar automaticamente um código exclusivo de acesso.
                        </p>

                        <form onSubmit={handleAddSalon} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            <div className="form-group">
                                <label className="label-ios" style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>IDENTIFICAÇÃO DA UNIDADE</label>
                                <input
                                    className="ios-input"
                                    style={{ height: '72px', fontSize: '20px', borderRadius: '24px', padding: '0 32px' }}
                                    placeholder="Ex: Salon Luxury & Spa"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ height: '76px', fontSize: '20px', borderRadius: '28px', fontWeight: '900' }}>Ativar Nova Unidade</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .pulse-dot {
                    width: 10px;
                    height: 10px;
                    background-color: #FF3B30;
                    border-radius: 50%;
                    border: 2px solid white;
                    animation: pulse-red 1.5s infinite;
                    box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
                }

                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 59, 48, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
                }
                .pulse-red {
                    animation: pulse-red 2s infinite;
                }
            `}</style>
            {/* Modal for Deleting Salon */}
            {showDeleteModal && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)' }}>
                    <div className="modal-content glass premium" style={{ maxWidth: '500px', padding: '48px', borderRadius: '40px', border: '2px solid rgba(255, 59, 48, 0.2)' }}>
                        <div className="modal-header" style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '28px', color: '#FF3B30', letterSpacing: '-1.5px' }}>Excluir Unidade?</h2>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSalonToDelete(null);
                                    setDeleteConfirmCode('');
                                }}
                                className="close-btn"
                                style={{ width: '40px', height: '40px', background: 'rgba(0,0,0,0.03)', borderRadius: '20px' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div style={{ background: 'rgba(255, 59, 48, 0.05)', padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
                            <p style={{ fontSize: '15px', color: '#FF3B30', fontWeight: '700', lineHeight: 1.5 }}>
                                ATENÇÃO: Esta ação é irreversível. Todos os dados, pagamentos e usuários vinculados a <span style={{ textDecoration: 'underline' }}>{salonToDelete?.name}</span> serão removidos.
                            </p>
                        </div>

                        <div className="form-group" style={{ marginBottom: '40px' }}>
                            <label className="label-ios" style={{ fontSize: '12px', marginBottom: '16px', fontWeight: '900', color: 'var(--ios-text-secondary)' }}>
                                DIGITE O CÓDIGO <span style={{ color: 'var(--ios-text-primary)' }}>{salonToDelete?.code}</span> PARA CONFIRMAR
                            </label>
                            <input
                                className="ios-input"
                                style={{ height: '64px', fontSize: '24px', borderRadius: '20px', padding: '0 24px', textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900' }}
                                placeholder="------"
                                maxLength={6}
                                value={deleteConfirmCode}
                                onChange={(e) => setDeleteConfirmCode(e.target.value.toUpperCase())}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSalonToDelete(null);
                                    setDeleteConfirmCode('');
                                }}
                                style={{ flex: 1, height: '64px', borderRadius: '20px', background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--ios-text-primary)', fontWeight: '800', fontSize: '16px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteSalon}
                                disabled={deleteConfirmCode !== salonToDelete?.code}
                                style={{
                                    flex: 1,
                                    height: '64px',
                                    borderRadius: '20px',
                                    background: deleteConfirmCode === salonToDelete?.code ? '#FF3B30' : 'rgba(255, 59, 48, 0.1)',
                                    border: 'none',
                                    color: deleteConfirmCode === salonToDelete?.code ? 'white' : '#FF3B30',
                                    fontWeight: '800',
                                    fontSize: '16px',
                                    opacity: deleteConfirmCode === salonToDelete?.code ? 1 : 0.5,
                                    boxShadow: deleteConfirmCode === salonToDelete?.code ? '0 10px 20px rgba(255, 59, 48, 0.2)' : 'none'
                                }}
                            >
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DevDashboard;
