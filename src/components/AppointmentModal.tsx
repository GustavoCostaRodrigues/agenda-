import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate: Date;
    appointment?: any; // For editing
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSuccess, initialDate, appointment }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [professionals, setProfessionals] = useState<{ id: number; name: string }[]>([]);

    // Form states
    const [clientName, setClientName] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [price, setPrice] = useState('0.00');
    const [professionalId, setProfessionalId] = useState<string>('');
    const [status, setStatus] = useState('agendado');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && user?.salon_id) {
            fetchProfessionals();
            if (appointment) {
                setClientName(appointment.client_name);
                setServiceName(appointment.service_name);
                const appDate = new Date(appointment.start_time);
                setDate(appDate.toISOString().split('T')[0]);
                setTime(appDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                setPrice(appointment.price?.toString() || '0.00');
                setProfessionalId(appointment.professional_id?.toString() || '');
                setStatus(appointment.status || 'agendado');
                setNotes(appointment.notes || '');
            } else {
                setClientName('');
                setServiceName('');
                setDate(initialDate.toISOString().split('T')[0]);
                setTime('09:00');
                setPrice('0.00');
                setStatus('agendado');
                setNotes('');
            }
        }
    }, [isOpen, user, initialDate, appointment]);

    const fetchProfessionals = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, name')
            .eq('salon_id', user?.salon_id)
            .neq('is_active', false);

        if (data) {
            setProfessionals(data);
            if (!professionalId && !appointment && data.length > 0) {
                setProfessionalId(data[0].id.toString());
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const startTime = new Date(`${date}T${time}:00`);
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1h

            const payload = {
                salon_id: user?.salon_id,
                client_name: clientName,
                service_name: serviceName,
                professional_id: parseInt(professionalId),
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                price: parseFloat(price),
                status: status,
                notes: notes
            };

            let error;
            if (appointment?.id) {
                const { error: err } = await supabase
                    .from('appointments')
                    .update(payload)
                    .eq('id', appointment.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('appointments')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving appointment:', err);
            alert('Erro ao salvar agendamento.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                        <label>Cliente</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="Nome do cliente"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Serviço</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="Ex: Corte + Barba"
                            value={serviceName}
                            onChange={e => setServiceName(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Data</label>
                            <input
                                type="date"
                                className="ios-input"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Horário</label>
                            <input
                                type="time"
                                className="ios-input"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Profissional</label>
                        <select
                            className="ios-input"
                            value={professionalId}
                            onChange={e => setProfessionalId(e.target.value)}
                            required
                        >
                            <option value="" disabled>Selecione um profissional</option>
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="ios-input"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Status</label>
                            <select
                                className="ios-input"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                required
                            >
                                <option value="agendado">Agendado</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Observações</label>
                        <textarea
                            className="ios-input"
                            style={{ minHeight: '80px', resize: 'none' }}
                            placeholder="Notas adicionais..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
                        {loading ? 'Salvando...' : appointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
