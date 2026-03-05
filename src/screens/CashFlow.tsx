import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface Transaction {
    id: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    transaction_date: string;
}

const CashFlow: React.FC = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New transaction form state
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.salon_id) {
            fetchTransactions();
        }
    }, [user]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cash_flow')
                .select('*')
                .eq('salon_id', user?.salon_id)
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!amount || numAmount <= 0) return;

        setSaving(true);
        try {
            const amountPerParcel = Number((numAmount / installments).toFixed(2));
            const newTransactions = [];

            for (let i = 0; i < installments; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() + i);

                newTransactions.push({
                    salon_id: user?.salon_id,
                    type,
                    category: category || 'Manual',
                    description: installments > 1
                        ? `${description || category || 'Lançamento'} (${i + 1}/${installments})`
                        : (description || category || 'Lançamento'),
                    amount: amountPerParcel,
                    transaction_date: date.toISOString()
                });
            }

            const { error } = await supabase.from('cash_flow').insert(newTransactions);

            if (error) throw error;

            setIsModalOpen(false);
            setAmount('');
            setDescription('');
            setCategory('');
            setInstallments(1);
            fetchTransactions();
        } catch (err) {
            console.error('Error saving transaction:', err);
            alert('Erro ao salvar lançamento.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="agenda-container fade-in">
            <header className="agenda-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1>Fluxo de Caixa</h1>
                    <p>Controle financeiro do salão</p>
                </div>
                <button
                    className="fab-center"
                    onClick={() => setIsModalOpen(true)}
                    style={{ position: 'static', transform: 'none', width: '44px', height: '44px', fontSize: '24px' }}
                >
                    +
                </button>
            </header>

            {/* Resume Cards */}
            <div className="glass" style={{ padding: '24px', borderRadius: '28px', marginBottom: '24px', background: 'linear-gradient(135deg, white 0%, #F8F8F8 100%)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <p className="label-ios" style={{ fontSize: '12px' }}>Saldo Atual</p>
                    <h2 style={{ fontSize: '36px', fontWeight: '900', color: stats.balance >= 0 ? '#34C759' : '#FF3B30', margin: '4px 0' }}>
                        R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #F2F2F7', paddingTop: '20px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <p className="label-ios" style={{ fontSize: '10px', color: '#34C759' }}>Entradas</p>
                        <p style={{ fontSize: '18px', fontWeight: '800', color: '#34C759' }}>
                            + R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p className="label-ios" style={{ fontSize: '10px', color: '#FF3B30' }}>Saídas</p>
                        <p style={{ fontSize: '18px', fontWeight: '800', color: '#FF3B30' }}>
                            - R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="label-ios" style={{ marginLeft: '4px' }}>Lançamentos Recentes</h3>

                {loading ? (
                    <p style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>Carregando...</p>
                ) : transactions.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', borderStyle: 'dashed', background: 'transparent', borderRadius: '24px' }}>
                        <p style={{ opacity: 0.5 }}>Nenhum lançamento encontrado.</p>
                    </div>
                ) : (
                    transactions.map(t => (
                        <div key={t.id} className="glass" style={{ padding: '16px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: t.type === 'income' ? '#34C75915' : '#FF3B3015',
                                    color: t.type === 'income' ? '#34C759' : '#FF3B30'
                                }}>
                                    {t.type === 'income' ? '↙' : '↗'}
                                </div>
                                <div>
                                    <p style={{ fontWeight: '700', color: 'var(--ios-text-primary)' }}>{t.description || t.category}</p>
                                    <p style={{ fontSize: '12px', opacity: 0.6 }}>{formatDate(t.transaction_date)} • {t.category}</p>
                                </div>
                            </div>
                            <p style={{ fontWeight: '800', color: t.type === 'income' ? '#34C759' : '#FF3B30' }}>
                                {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Manual Entry Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Novo Lançamento</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSaveManual} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px', background: '#F2F2F7', padding: '4px', borderRadius: '14px' }}>
                                <button
                                    type="button"
                                    onClick={() => setType('income')}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'income' ? 'white' : 'transparent', fontWeight: '700', color: type === 'income' ? '#34C759' : '#8E8E93', transition: 'all 0.2s', boxShadow: type === 'income' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
                                >
                                    Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('expense')}
                                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'expense' ? 'white' : 'transparent', fontWeight: '700', color: type === 'expense' ? '#FF3B30' : '#8E8E93', transition: 'all 0.2s', boxShadow: type === 'expense' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
                                >
                                    Saída
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="label-ios">Valor Total</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="ios-input"
                                        placeholder="0,00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label-ios">Parcelas</label>
                                    <select
                                        className="ios-input"
                                        value={installments}
                                        onChange={e => setInstallments(Number(e.target.value))}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                            <option key={n} value={n}>{n}x</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label-ios">Categoria</label>
                                <select
                                    className="ios-input"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Manual">Lançamento Geral</option>
                                    <option value="Serviço">Serviço Extra</option>
                                    <option value="Aluguel">Aluguel / Despesa</option>
                                    <option value="Salários">Pagamentos</option>
                                    <option value="Limpeza">Limpeza / Insumos</option>
                                    <option value="Marketing">Marketing / ADS</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="label-ios">Descrição (Opcional)</label>
                                <input
                                    type="text"
                                    className="ios-input"
                                    placeholder="Ex: Venda de café, Troco..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? 'Salvando...' : 'Confirmar Lançamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashFlow;
