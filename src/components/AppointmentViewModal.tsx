import React, { useState } from 'react';
import { supabase } from '../utils/supabase';

interface AppointmentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
    onSuccess: () => void;
}

const AppointmentViewModal: React.FC<AppointmentViewModalProps> = ({ isOpen, onClose, appointment, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    if (!isOpen || !appointment) return null;

    const handleUpdateStatus = async (newStatus: 'concluido' | 'cancelado') => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', appointment.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status.');
        } finally {
            setLoading(false);
        }
    };

    const statusMap: any = {
        agendado: { label: 'Agendado', color: '#007AFF' },
        concluido: { label: 'Concluído', color: '#34C759' },
        cancelado: { label: 'Cancelado', color: '#FF3B30' }
    };

    const currentStatus = statusMap[appointment.status] || { label: 'Pendente', color: '#8E8E93' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Detalhes do Agendamento</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p style={{ fontWeight: '800', fontSize: '20px', color: 'var(--ios-text-primary)' }}>{appointment.client_name}</p>
                            <p style={{ fontSize: '15px', color: 'var(--ios-text-secondary)' }}>{appointment.service_name}</p>
                        </div>
                        <div style={{ background: currentStatus.color + '15', color: currentStatus.color, padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>
                            {currentStatus.label}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>DATA E HORA</p>
                            <p style={{ fontWeight: '700' }}>
                                {new Date(appointment.start_time).toLocaleDateString('pt-BR')} às {new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>VALOR</p>
                            <p style={{ fontWeight: '700', color: '#34C759' }}>R$ {appointment.price?.toFixed(2) || '0,00'}</p>
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>PROFISSIONAL RESPONSÁVEL</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {appointment.users?.avatar_url ? (
                                <img src={appointment.users.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '16px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '14px' }}>
                                    {appointment.users?.name?.[0]}
                                </div>
                            )}
                            <p style={{ fontWeight: '700' }}>{appointment.users?.name || 'Não atribuído'}</p>
                        </div>
                    </div>

                    {appointment.notes && (
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--ios-text-secondary)', marginBottom: '4px' }}>OBSERVAÇÕES</p>
                            <p style={{ background: '#F2F2F7', padding: '12px', borderRadius: '12px', fontSize: '14px', fontStyle: 'italic' }}>{appointment.notes}</p>
                        </div>
                    )}

                    {appointment.status === 'agendado' && (
                        <div className="btn-row">
                            <button
                                className="btn-cancel"
                                onClick={() => handleUpdateStatus('cancelado')}
                                disabled={loading}
                            >
                                {loading ? '...' : 'Cancelar'}
                            </button>
                            <button
                                className="btn-complete"
                                onClick={() => handleUpdateStatus('concluido')}
                                disabled={loading}
                            >
                                {loading ? 'Salvando...' : 'Concluir Agendamento'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentViewModal;
