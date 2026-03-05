import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
    onRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email.trim(), password.trim());
        } catch (err: any) {
            if (err.message === 'Invalid login credentials') {
                setError('E-mail ou senha incorretos.');
            } else {
                setError(err.message || 'Erro ao entrar.');
            }
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
                <div style={{
                    width: '72px',
                    height: '72px',
                    background: 'var(--ios-gradient-primary)',
                    borderRadius: '18px',
                    margin: '0 auto 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: '800',
                    boxShadow: '0 10px 25px rgba(157, 0, 255, 0.25)'
                }}>
                    S
                </div>
                <h1 style={{ fontSize: '36px' }}>SalonHub</h1>
                <p>Gestão de beleza em um toque.</p>
            </div>

            <div className="glass" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {error && (
                    <div style={{ color: '#FF3B30', fontSize: '14px', textAlign: 'center', padding: '12px', background: 'rgba(255, 59, 48, 0.05)', borderRadius: '12px', fontWeight: '500' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="ios-input-group">
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginLeft: '4px' }}>E-MAIL</label>
                        <input
                            type="email"
                            className="ios-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="ios-input-group">
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginLeft: '4px' }}>SENHA</label>
                        <input
                            type="password"
                            className="ios-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '10px', height: '56px' }} disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <p style={{ fontSize: '15px' }}>Ainda não tem conta? <span
                        onClick={onRegister}
                        style={{ color: 'var(--ios-primary)', fontWeight: '700', cursor: 'pointer' }}
                    >Criar conta</span></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
