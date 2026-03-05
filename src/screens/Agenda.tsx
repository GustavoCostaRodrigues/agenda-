import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import AppointmentModal from '../components/AppointmentModal';
import AppointmentViewModal from '../components/AppointmentViewModal';

interface Appointment {
    id: number;
    client_name: string;
    service_name: string;
    start_time: string;
    end_time: string;
    status: 'agendado' | 'concluido' | 'cancelado';
    price?: number;
    professional_id: number;
    notes?: string;
    users?: { name: string; avatar_url?: string };
}

const WEEK_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

const Agenda: React.FC = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekOffset, setWeekOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState<{ id: number, name: string }[]>([]);
    const [filterProfessionalId, setFilterProfessionalId] = useState<string | 'all' | 'me'>('all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    useEffect(() => {
        if (user?.salon_id) {
            fetchData();
            if (user.role === 'owner' || user.role === 'manager') {
                fetchProfessionals();
            }
        }
    }, [user, selectedDate, filterProfessionalId]);

    const fetchProfessionals = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('id, name')
            .eq('salon_id', user?.salon_id)
            .neq('is_active', false);

        if (!error && data) setProfessionals(data);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            let query = supabase
                .from('appointments')
                .select('*, users:professional_id(name, avatar_url)')
                .eq('salon_id', user?.salon_id)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .order('start_time');

            // Apply filters based on role and selection
            if (user?.role === 'staff') {
                // Staff always sees only their own
                query = query.eq('professional_id', user.id);
            } else {
                // Owners/Managers use the filter
                if (filterProfessionalId === 'me') {
                    query = query.eq('professional_id', user?.id);
                } else if (filterProfessionalId !== 'all') {
                    query = query.eq('professional_id', filterProfessionalId);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            setAppointments(data || []);
        } catch (err) {
            console.error('Error fetching agenda:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFormattedDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('pt-BR', options);
    };

    const generateDays = (offset: number) => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            const dayOfWeek = d.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(new Date().setDate(new Date().getDate() + diffToMonday + (offset * 7)));
            return new Date(monday.setDate(monday.getDate() + i));
        });
    };

    const days = generateDays(weekOffset);

    const handleCardClick = (app: Appointment) => {
        setSelectedAppointment(app);
        setIsViewModalOpen(true);
    };

    const handleOpenEdit = (e: React.MouseEvent, app: Appointment) => {
        e.stopPropagation();
        setSelectedAppointment(app);
        setIsCreateModalOpen(true);
    };

    const handleOpenDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (window.confirm('Deseja excluir este agendamento?')) {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (!error) {
                setAppointments(prev => prev.filter(a => a.id !== id));
            } else {
                alert('Erro ao excluir.');
            }
        }
    };

    const handleEditSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };

    const handleCreateNew = () => {
        setSelectedAppointment(null);
        setIsCreateModalOpen(true);
    };

    return (
        <div className="agenda-container">
            <header className="agenda-header">
                <div>
                    <h1>Agenda</h1>
                    <p style={{ textTransform: 'capitalize' }}>{getFormattedDate(selectedDate)}</p>
                </div>
            </header>

            {/* Week Navigation & Picker */}
            <div className="week-nav-container">
                <button className="nav-arrow-btn" onClick={() => setWeekOffset(prev => prev - 1)}>‹</button>
                <div className="week-picker no-scrollbar">
                    {days.map((day, idx) => {
                        const isActive = day.toDateString() === selectedDate.toDateString();
                        return (
                            <button
                                key={idx}
                                className={`day-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setSelectedDate(new Date(day))}
                            >
                                <span style={{ fontSize: '10px' }}>{WEEK_DAYS[idx]}</span>
                                <span style={{ fontSize: '14px', fontWeight: '800', marginTop: '2px', color: isActive ? 'white' : 'var(--ios-text-primary)' }}>{day.getDate()}</span>
                            </button>
                        )
                    })}
                </div>
                <button className="nav-arrow-btn" onClick={() => setWeekOffset(prev => prev + 1)}>›</button>
            </div>

            {/* Professional Filters (Only for Owners/Managers) */}
            {(user?.role === 'owner' || user?.role === 'manager') && (
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1 }} className="no-scrollbar">
                        <button
                            className={`glass-pill ${filterProfessionalId === 'all' ? 'active-pill' : ''}`}
                            onClick={() => setFilterProfessionalId('all')}
                            style={filterProfessionalId === 'all' ? { background: 'var(--ios-primary)', color: 'white' } : {}}
                        >
                            Todos
                        </button>
                        <button
                            className={`glass-pill ${filterProfessionalId === 'me' ? 'active-pill' : ''}`}
                            onClick={() => setFilterProfessionalId('me')}
                            style={filterProfessionalId === 'me' ? { background: 'var(--ios-primary)', color: 'white' } : {}}
                        >
                            Eu
                        </button>
                        {professionals.filter(p => p.id !== user?.id).map(p => (
                            <button
                                key={p.id}
                                className={`glass-pill ${filterProfessionalId === p.id.toString() ? 'active-pill' : ''}`}
                                onClick={() => setFilterProfessionalId(p.id.toString())}
                                style={filterProfessionalId === p.id.toString() ? { background: 'var(--ios-primary)', color: 'white' } : {}}
                            >
                                {p.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleCreateNew}
                        style={{
                            background: 'var(--ios-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0 12px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '700',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: '20px', fontWeight: '400' }}>+</span>
                        Agendamento
                    </button>
                </div>
            )}

            {user?.role === 'staff' && (
                <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleCreateNew}
                        style={{
                            background: 'var(--ios-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0 12px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.2)'
                        }}
                    >
                        <span style={{ fontSize: '20px', fontWeight: '400' }}>+</span>
                        Agendamento
                    </button>
                </div>
            )}

            {/* List with Timeline */}
            <div className="timeline-wrapper">
                <div className="timeline-line" />

                {loading ? (
                    <div style={{ padding: '40px 0', marginLeft: '20px' }}>
                        <p>Buscando agendamentos...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {appointments.map((app, idx) => (
                            <React.Fragment key={app.id}>
                                {idx > 0 && (
                                    <p className="timeline-label">Intervalo</p>
                                )}
                                <div className="timeline-node" style={{ top: '30px' }} />
                                <div
                                    className="appointment-card glass fade-in"
                                    onClick={() => handleCardClick(app)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={`status-bar-inner status-${app.status}`} />

                                    <div className="card-actions">
                                        <button className="icon-btn" onClick={(e) => handleOpenEdit(e, app)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20"><path fill="currentColor" d="M17.181 2.927a2.975 2.975 0 0 0-4.259-.054l-9.375 9.375a2.44 2.44 0 0 0-.656 1.194l-.877 3.95a.5.5 0 0 0 .596.597l3.927-.873a2.5 2.5 0 0 0 1.234-.678l9.358-9.358a2.975 2.975 0 0 0 .052-4.153m-3.552.653a1.975 1.975 0 1 1 2.793 2.793l-.671.671l-2.793-2.792zm-1.378 1.38l2.793 2.792l-7.98 7.98a1.5 1.5 0 0 1-.744.409l-3.16.702l.708-3.183c.059-.267.193-.511.386-.704z" /></svg>
                                        </button>
                                        <button className="icon-btn delete" onClick={(e) => handleOpenDelete(e, app.id)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z" /></svg>
                                        </button>
                                    </div>

                                    <div className="card-top">
                                        <span className="time">
                                            {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="card-mid">{app.client_name}</div>
                                    <div style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        👤 {app.users?.name || 'Não atribuído'}
                                    </div>
                                    <div className="card-bottom">
                                        <div className="services">{app.service_name}</div>
                                        <div className="price-pill">
                                            R$ {app.price?.toFixed(2) || '0,00'}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}

                        {appointments.length === 0 && (
                            <div className="glass" style={{ padding: '80px 20px', textAlign: 'center', marginLeft: '20px', borderStyle: 'dashed', background: 'transparent', borderRadius: '24px', borderColor: 'var(--ios-primary)' }}>
                                <p style={{ fontWeight: '700', color: 'var(--ios-text-secondary)', opacity: 0.6 }}>Nenhum agendamento para este dia.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Creation/Edition Modal */}
            <AppointmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleEditSuccess}
                initialDate={selectedDate}
                appointment={selectedAppointment}
            />

            {/* View Modal */}
            <AppointmentViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                appointment={selectedAppointment}
                onSuccess={fetchData}
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                .glass-pill {
                    padding: 8px 16px;
                    border-radius: 20px;
                    background: rgba(0,0,0,0.05);
                    border: none;
                    font-size: 13px;
                    font-weight: 700;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--ios-text-secondary);
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default Agenda;
