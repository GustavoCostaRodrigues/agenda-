import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
    onBack: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signUp(email.trim(), password.trim(), name.trim(), 'staff');
        } catch (err: any) {
            setError(err.message || 'Erro ao cadastrar.');
            setLoading(false);
        }
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '30px',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '32px' }}>Começar Agora</h1>
                <p>Crie sua conta no ecossistema SalonHub.</p>
            </div>

            <div className="glass" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {error && (
                    <div style={{ color: '#FF3B30', fontSize: '14px', textAlign: 'center', padding: '12px', background: 'rgba(255, 59, 48, 0.05)', borderRadius: '12px', fontWeight: '500' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="ios-input-group">
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginLeft: '4px' }}>NOME COMPLETO</label>
                        <input
                            className="ios-input"
                            placeholder="Seu Nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', height: '56px' }}>
                        {loading ? 'Criando conta...' : 'Registrar'}
                    </button>
                </form>

                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ios-primary)', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
                    Já tenho conta? Entrar
                </button>
            </div>
        </div>
    );
};

export default Register;
