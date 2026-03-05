import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface Salon {
    id: number;
    name: string;
    app_name?: string;
    app_logo_url?: string;
    app_colors?: { primary: string; secondary: string };
}

interface Professional {
    id: number;
    name: string;
}

const PublicBooking: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [salon, setSalon] = useState<Salon | null>(null);
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [step, setStep] = useState(1); // 1: Info, 2: Professional, 3: Date/Time, 4: Client Info

    // Selection state
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (slug) fetchSalon();
    }, [slug]);

    const fetchSalon = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('salons')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            setSalon(data);

            // Fetch active professionals
            const { data: profs } = await supabase
                .from('users')
                .select('id, name')
                .eq('salon_id', data.id)
                .neq('is_active', false);

            setProfessionals(profs || []);
        } catch (err) {
            console.error('Error fetching salon:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!salon || !selectedProfessional) return;

        setIsSubmitting(true);
        try {
            const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

            const { error } = await supabase
                .from('appointments')
                .insert([{
                    salon_id: salon.id,
                    professional_id: selectedProfessional.id,
                    client_name: clientName,
                    notes: `Agendamento Online - WhatsApp: ${clientPhone}`,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    service_name: 'Agendamento Online',
                    status: 'agendado'
                }]);

            if (error) throw error;
            setSuccess(true);
        } catch (err) {
            console.error('Error booking:', err);
            alert('Erro ao realizar agendamento.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="booking-loading">Carregando...</div>;
    if (!salon) return <div className="booking-error">Salão não encontrado.</div>;

    if (success) {
        return (
            <div className="booking-container fade-in" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
                <h1 style={{ color: salon.app_colors?.primary }}>Agendamento Confirmado!</h1>
                <p>Obrigado, {clientName.split(' ')[0]}! Seu horário foi reservado com sucesso.</p>
                <div style={{ marginTop: '40px', fontSize: '14px', color: '#8E8E93' }}>
                    Entraremos em contato via WhatsApp {clientPhone} se houver qualquer alteração.
                </div>
            </div>
        );
    }

    const availableTimes = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    return (
        <div className="public-booking-page" style={{ '--primary': salon.app_colors?.primary || '#007AFF' } as React.CSSProperties}>
            <div className="booking-container fade-in">
                <header className="booking-header">
                    {salon.app_logo_url && <img src={salon.app_logo_url} alt={salon.name} className="salon-logo" />}
                    <h1>{salon.app_name || salon.name}</h1>
                </header>

                <div className="booking-card glass">
                    {step === 1 && (
                        <div className="step-content">
                            <h2>Escolha um Profissional</h2>
                            <div className="professional-grid">
                                {professionals.map(p => (
                                    <button
                                        key={p.id}
                                        className={`prof-btn ${selectedProfessional?.id === p.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedProfessional(p);
                                            setStep(2);
                                        }}
                                    >
                                        <div className="prof-avatar">{p.name[0]}</div>
                                        <span>{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-content">
                            <button className="back-btn" onClick={() => setStep(1)}>← Voltar</button>
                            <h2>Escolha o Horário</h2>
                            <div className="form-group">
                                <label>Data</label>
                                <input
                                    type="date"
                                    className="ios-input"
                                    value={selectedDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>
                            <div className="time-grid" style={{ marginTop: '20px' }}>
                                {availableTimes.map(t => (
                                    <button
                                        key={t}
                                        className={`time-btn ${selectedTime === t ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedTime(t);
                                            setStep(3);
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-content">
                            <button className="back-btn" onClick={() => setStep(2)}>← Voltar</button>
                            <h2>Seus Dados</h2>
                            <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <input
                                        type="text"
                                        className="ios-input"
                                        required
                                        placeholder="Como devemos te chamar?"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp (com DDD)</label>
                                    <input
                                        type="tel"
                                        className="ios-input"
                                        required
                                        placeholder="(00) 00000-0000"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                    />
                                </div>
                                <div className="summary-box">
                                    <p><strong>Profissional:</strong> {selectedProfessional?.name}</p>
                                    <p><strong>Data:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                    <p><strong>Horário:</strong> {selectedTime}</p>
                                </div>
                                <button type="submit" className="confirm-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .public-booking-page {
                    min-height: 100vh;
                    background: #F2F2F7;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .booking-container { max-width: 500px; margin: 0 auto; }
                .booking-header { text-align: center; margin-bottom: 30px; padding-top: 40px; }
                .salon-logo { width: 80px; height: 80px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .booking-header h1 { font-size: 24px; font-weight: 800; color: #1C1C1E; }
                .booking-card { padding: 30px; border-radius: 24px; background: rgba(255,255,255,0.8); }
                .professional-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
                .prof-btn { 
                    padding: 20px; border-radius: 16px; border: 2px solid transparent; background: white;
                    display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s;
                }
                .prof-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .prof-btn.active { border-color: var(--primary); background: rgba(0,122,255,0.05); }
                .prof-avatar { 
                    width: 50px; height: 50px; border-radius: 25px; background: var(--primary); color: white;
                    display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;
                }
                .time-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                .time-btn { 
                    padding: 12px; border-radius: 12px; border: none; background: white; 
                    font-weight: 700; cursor: pointer; transition: all 0.2s;
                }
                .time-btn.active { background: var(--primary); color: white; }
                .confirm-btn {
                    background: var(--primary); color: white; border: none; padding: 16px; border-radius: 16px;
                    font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 10px;
                }
                .back-btn { background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; margin-bottom: 15px; }
                .summary-box { background: rgba(0,0,0,0.03); padding: 15px; border-radius: 12px; font-size: 14px; }
                .summary-box p { margin: 5px 0; }
                h2 { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #1C1C1E; }
            `}} />
        </div>
    );
};

export default PublicBooking;
