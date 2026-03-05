import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import ProductModal from '../components/ProductModal';
import QuantityAdjustmentModal from '../components/QuantityAdjustmentModal';

// --- Types ---
interface Product {
    id: number;
    item_name: string;
    category: string;
    quantity: number;
    min_stock: number;
    cost_price: number;
    price: number;
    usage_type: 'professional' | 'retail';
    status?: 'ok' | 'warning' | 'urgent';
}

const Stock: React.FC = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        if (user?.salon_id) {
            fetchProducts();
        } else {
            // Fallback for demo/dev if user/salon not available
            setProducts(MOCK_PRODUCTS);
            setLoading(false);
        }
    }, [user]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('salon_id', user?.salon_id)
                .order('item_name');

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            // Fallback to mock on error to keep UI functional for now
            setProducts(MOCK_PRODUCTS);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.item_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const stats = useMemo(() => {
        const totalValue = products.reduce((acc, p) => acc + (p.quantity * p.cost_price), 0);
        const critical = products.filter(p => p.quantity <= p.min_stock).length;
        return { totalValue, critical };
    }, [products]);

    const getStatusClass = (p: Product) => {
        if (p.quantity === 0) return 'status-cancelado'; // Red
        if (p.quantity <= p.min_stock) return 'status-cancelado'; // Red
        if (p.quantity <= p.min_stock * 1.5) return 'status-concluido'; // Green
        return 'status-agendado'; // Blue
    };

    const handleOpenEdit = (e: React.MouseEvent, p: Product) => {
        e.stopPropagation();
        setSelectedProduct(p);
        setIsModalOpen(true);
    };

    const handleOpenDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (window.confirm('Deseja excluir este item do estoque?')) {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (!error) {
                setProducts(prev => prev.filter(p => p.id !== id));
            } else {
                alert('Erro ao excluir item.');
            }
        }
    };

    const handleCardClick = (p: Product) => {
        setSelectedProduct(p);
        setIsAdjustModalOpen(true);
    };

    return (
        <div className="agenda-container animate-in fade-in transition-all">
            <header className="agenda-header">
                <div>
                    <h1>Controle de Estoque</h1>
                    <p>Gerencie seus insumos e materiais</p>
                </div>
            </header>

            {/* KPIs Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
                    <p className="label-ios" style={{ fontSize: '10px' }}>Capital em Mercadoria</p>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 0' }}>
                        R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                <div className="glass" style={{ padding: '20px', borderRadius: '24px' }}>
                    <p className="label-ios" style={{ fontSize: '10px', color: stats.critical > 0 ? '#FF3B30' : 'inherit' }}>Alertas Críticos</p>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 0', color: stats.critical > 0 ? '#FF3B30' : 'inherit' }}>
                        {stats.critical}
                    </h2>
                </div>
            </div>

            {/* Tools Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        className="ios-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                    />
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        🔍
                    </div>
                </div>
                <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '16px 20px', borderRadius: '18px', boxShadow: 'none' }}
                    onClick={() => {
                        setSelectedProduct(null);
                        setIsModalOpen(true);
                    }}
                >
                    +
                </button>
            </div>

            {/* Products List */}
            <div className="timeline-wrapper">
                <div className="timeline-line" />

                {loading ? (
                    <div style={{ padding: '40px 0', marginLeft: '20px' }}>
                        <p>Buscando inventário...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {filteredProducts.map((p) => (
                            <div
                                key={p.id}
                                className="appointment-card glass fade-in"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleCardClick(p)}
                            >
                                <div className={`status-bar-inner ${getStatusClass(p)}`} />

                                <div className="card-actions">
                                    <button className="icon-btn" onClick={(e) => handleOpenEdit(e, p)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="currentColor" d="M17.181 2.927a2.975 2.975 0 0 0-4.259-.054l-9.375 9.375a2.44 2.44 0 0 0-.656 1.194l-.877 3.95a.5.5 0 0 0 .596.597l3.927-.873a2.5 2.5 0 0 0 1.234-.678l9.358-9.358a2.975 2.975 0 0 0 .052-4.153m-3.552.653a1.975 1.975 0 1 1 2.793 2.793l-.671.671l-2.793-2.792zm-1.378 1.38l2.793 2.792l-7.98 7.98a1.5 1.5 0 0 1-.744.409l-3.16.702l.708-3.183c.059-.267.193-.511.386-.704z" /></svg>
                                    </button>
                                    <button className="icon-btn delete" onClick={(e) => handleOpenDelete(e, p.id)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z" /></svg>
                                    </button>
                                </div>

                                <div className="card-top">
                                    <span className="time">{p.item_name}</span>
                                </div>

                                <div className="card-mid" style={{ fontSize: '14px', color: '#8E8E93', fontWeight: '500' }}>
                                    {p.category} • {p.usage_type === 'professional' ? 'Profissional' : 'Venda'}
                                </div>

                                <div className="card-bottom" style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="price-pill" style={{ background: p.quantity <= p.min_stock ? '#FF3B3015' : '#F2F2F7', color: p.quantity <= p.min_stock ? '#FF3B30' : 'inherit' }}>
                                            Estoque: {p.quantity}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', alignItems: 'center' }}>
                                            Mín: {p.min_stock}
                                        </div>
                                    </div>
                                    <div className="price-pill">
                                        R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="glass" style={{ padding: '60px 20px', textAlign: 'center', marginLeft: '20px', borderStyle: 'dashed', background: 'transparent', borderRadius: '24px', borderColor: 'var(--ios-primary)' }}>
                                <p style={{ fontWeight: '700', color: 'var(--ios-text-secondary)', opacity: 0.6 }}>
                                    Nenhum produto encontrado.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal for Addition/Edition */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchProducts}
                product={selectedProduct}
            />

            {/* Modal for Quantity Adjustment */}
            <QuantityAdjustmentModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                onSuccess={fetchProducts}
                product={selectedProduct ? {
                    ...selectedProduct,
                    salon_id: user?.salon_id
                } : null}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .status-urgent { background: #FF3B30; }
                .status-ok { background: #007AFF; }
                .status-warning { background: #34C759; }
            `}} />
        </div>
    );
};

const MOCK_PRODUCTS: Product[] = [
    { id: 1, item_name: 'Shampoo Hidratação 1L', category: 'Cabelo', quantity: 4, min_stock: 5, cost_price: 45.0, price: 120.0, usage_type: 'professional' },
    { id: 2, item_name: 'Esmalte Vermelho', category: 'Unhas', quantity: 12, min_stock: 5, cost_price: 8.0, price: 25.0, usage_type: 'retail' },
    { id: 3, item_name: 'Pó Descolorante', category: 'Cabelo', quantity: 2, min_stock: 2, cost_price: 35.0, price: 90.0, usage_type: 'professional' },
];

export default Stock;
