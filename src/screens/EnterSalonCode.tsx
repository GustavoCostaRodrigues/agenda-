import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EnterSalonCode: React.FC = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { linkSalonByCode, logout } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await linkSalonByCode(code.trim().toUpperCase());
        } catch (err: any) {
            setError(err.message || 'Código inválido ou não encontrado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '40px',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px' }}>Vincular Unidade</h1>
                <p>Insira o código fornecido pelo seu administrador.</p>
            </div>

            <div className="glass" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {error && (
                    <div style={{ color: '#FF3B30', fontSize: '14px', textAlign: 'center', padding: '12px', background: 'rgba(255, 59, 48, 0.05)', borderRadius: '12px', fontWeight: '500' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="ios-input-group">
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ios-text-secondary)', marginLeft: '4px', letterSpacing: '1px' }}>CÓDIGO DE ACESSO</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="X X X X X"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            style={{
                                textAlign: 'center',
                                fontSize: '28px',
                                letterSpacing: '6px',
                                textTransform: 'uppercase',
                                fontWeight: '800',
                                height: '64px',
                                background: 'rgba(0,0,0,0.02)'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ height: '56px' }}>
                        {loading ? 'Validando...' : 'Conectar'}
                    </button>
                </form>

                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ios-text-secondary)',
                        fontSize: '15px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Sair da conta
                </button>
            </div>
        </div>
    );
};

export default EnterSalonCode;
