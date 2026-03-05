import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: any; // For editing if needed later
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form states
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('0.00');
    const [costPrice, setCostPrice] = useState('0.00');
    const [quantity, setQuantity] = useState('0');
    const [minStock, setMinStock] = useState('0');
    const [usageType, setUsageType] = useState<'professional' | 'retail'>('professional');

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setItemName(product.item_name || '');
                setCategory(product.category || '');
                setPrice(product.price?.toString() || '0.00');
                setCostPrice(product.cost_price?.toString() || '0.00');
                setQuantity(product.quantity?.toString() || '0');
                setMinStock(product.min_stock?.toString() || '0');
                setUsageType(product.usage_type || 'professional');
            } else {
                setItemName('');
                setCategory('');
                setPrice('0.00');
                setCostPrice('0.00');
                setQuantity('0');
                setMinStock('0');
                setUsageType('professional');
            }
        }
    }, [isOpen, product]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                salon_id: user?.salon_id,
                item_name: itemName,
                category: category,
                price: parseFloat(price),
                cost_price: parseFloat(costPrice),
                quantity: parseInt(quantity),
                min_stock: parseInt(minStock),
                usage_type: usageType
            };

            let error;
            if (product?.id) {
                const { error: err } = await supabase
                    .from('inventory')
                    .update(payload)
                    .eq('id', product.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('inventory')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving product:', err);
            alert(`Erro ao salvar produto: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{product ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                        <label>Nome do Insumo</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="Ex: Shampoo Hidratação"
                            value={itemName}
                            onChange={e => setItemName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Categoria</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="Cabelo, Unha..."
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Preço Custo (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="ios-input"
                                value={costPrice}
                                onChange={e => setCostPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Preço Venda (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="ios-input"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Qtd Inicial</label>
                            <input
                                type="number"
                                className="ios-input"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Estoque Mínimo</label>
                            <input
                                type="number"
                                className="ios-input"
                                value={minStock}
                                onChange={e => setMinStock(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tipo de Uso</label>
                        <select
                            className="ios-input"
                            value={usageType}
                            onChange={e => setUsageType(e.target.value as any)}
                            required
                        >
                            <option value="professional">Uso Profissional</option>
                            <option value="retail">Venda para Cliente</option>
                        </select>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
                        {loading ? 'Salvando...' : product ? 'Salvar Alterações' : 'Cadastrar Produto'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
