import React, { useState } from 'react';
import { supabase } from '../utils/supabase';

interface QuantityAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: {
        id: number;
        item_name: string;
        quantity: number;
        usage_type?: 'professional' | 'retail';
        price?: number;
        cost_price?: number;
        salon_id?: number;
    } | null;
}

const QuantityAdjustmentModal: React.FC<QuantityAdjustmentModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
    const [adjustment, setAdjustment] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !product) return null;

    const handleUpdate = async (type: 'add' | 'remove' | 'sale' | 'purchase') => {
        setLoading(true);
        const newQuantity = (type === 'add' || type === 'purchase')
            ? product.quantity + adjustment
            : Math.max(0, product.quantity - adjustment);

        try {
            // 1. Update Inventory
            const { error: invError } = await supabase
                .from('inventory')
                .update({ quantity: newQuantity })
                .eq('id', product.id);

            if (invError) throw invError;

            // 2. Financial Records
            if (type === 'sale' && product.price) {
                const totalSale = adjustment * product.price;
                const { error: cashError } = await supabase
                    .from('cash_flow')
                    .insert({
                        salon_id: product.salon_id,
                        type: 'income',
                        category: 'Venda',
                        description: `Venda: ${product.item_name} (${adjustment} un)`,
                        amount: totalSale,
                        metadata: { product_id: product.id, quantity: adjustment }
                    });
                if (cashError) throw cashError;
            } else if (type === 'purchase' && (product.cost_price || 0) > 0) {
                const totalCost = adjustment * (product.cost_price || 0);
                const { error: cashError } = await supabase
                    .from('cash_flow')
                    .insert({
                        salon_id: product.salon_id,
                        type: 'expense',
                        category: 'Estoque',
                        description: `Compra: ${product.item_name} (${adjustment} un)`,
                        amount: totalCost,
                        metadata: { product_id: product.id, quantity: adjustment }
                    });
                if (cashError) throw cashError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating stock/cashflow:', err);
            alert(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
            setAdjustment(1);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '340px', textAlign: 'center' }}>
                <div className="modal-header">
                    <h2 style={{ fontSize: '18px' }}>Movimentação de Estoque</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <p style={{ fontSize: '14px', color: '#8E8E93', marginBottom: '20px' }}>
                    {product.item_name}<br />
                    <span style={{ fontWeight: '700', color: 'var(--ios-text-primary)' }}>
                        Atual: {product.quantity} unidades
                    </span>
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button
                        className="ios-input"
                        style={{ width: '44px', padding: '0', height: '44px', fontSize: '24px', borderRadius: '12px' }}
                        onClick={() => setAdjustment(prev => Math.max(1, prev - 1))}
                    >
                        -
                    </button>
                    <span style={{ fontSize: '24px', fontWeight: '800', minWidth: '40px' }}>{adjustment}</span>
                    <button
                        className="ios-input"
                        style={{ width: '44px', padding: '0', height: '44px', fontSize: '24px', borderRadius: '12px' }}
                        onClick={() => setAdjustment(prev => prev + 1)}
                    >
                        +
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {product.usage_type === 'retail' && (
                            <button
                                className="btn-primary"
                                style={{ flex: 1, backgroundColor: '#FF3B30', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)' }}
                                disabled={loading || product.quantity < adjustment}
                                onClick={() => handleUpdate('sale')}
                            >
                                <span style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>VENDER</span>
                                R$ {(adjustment * (product.price || 0)).toFixed(2)}
                            </button>
                        )}

                        <button
                            className="btn-primary"
                            style={{ flex: 1, backgroundColor: '#34C759', boxShadow: '0 4px 12px rgba(52, 199, 89, 0.2)' }}
                            disabled={loading}
                            onClick={() => handleUpdate('purchase')}
                        >
                            <span style={{ fontSize: '10px', display: 'block', opacity: 0.8 }}>COMPRAR</span>
                            R$ {(adjustment * (product.cost_price || 0)).toFixed(2)}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                            className="btn-complete"
                            style={{ flex: 1, backgroundColor: '#F2F2F7', color: '#8E8E93', padding: '12px', fontSize: '13px', borderRadius: '14px', boxShadow: 'none' }}
                            disabled={loading || product.quantity < adjustment}
                            onClick={() => handleUpdate('remove')}
                        >
                            Remover
                        </button>
                        <button
                            className="btn-complete"
                            style={{ flex: 1, backgroundColor: '#F2F2F7', color: '#8E8E93', padding: '12px', fontSize: '13px', borderRadius: '14px', boxShadow: 'none' }}
                            disabled={loading}
                            onClick={() => handleUpdate('add')}
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuantityAdjustmentModal;
