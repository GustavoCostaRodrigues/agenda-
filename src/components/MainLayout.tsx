import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface MainLayoutProps {
    children: (activeTab: string) => React.ReactNode;
}

const Icons = {
    Agenda: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 20 20">
            <path fill="currentColor" d="M17 14.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5zm-1 0v-9A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5m-2-8a.5.5 0 0 1-.41.492L13.5 7h-7a.5.5 0 0 1-.09-.992L6.5 6h7a.5.5 0 0 1 .5.5m0 3.5a.5.5 0 0 1-.41.492l-.09.008h-7a.5.5 0 0 1-.09-.992L6.5 9.5h7a.5.5 0 0 1 .5.5m0 3.5a.5.5 0 0 1-.41.492L13.5 14h-7a.5.5 0 0 1-.09-.992L6.5 13h7a.5.5 0 0 1 .5.5" />
        </svg>
    ),
    Estoque: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.923 1.378a3 3 0 0 1 2.154 0l4.962 1.908a1.5 1.5 0 0 1 .961 1.4v6.626a1.5 1.5 0 0 1-.961 1.4l-4.962 1.909a3 3 0 0 1-2.154 0l-4.961-1.909a1.5 1.5 0 0 1-.962-1.4V4.686a1.5 1.5 0 0 1 .962-1.4zm1.795.933a2 2 0 0 0-1.436 0l-1.384.533l5.59 2.116l1.948-.834zM14 4.971L8.5 7.33v6.428q.11-.028.218-.07l4.962-1.908a.5.5 0 0 0 .32-.467zm-6.5 8.786V7.33L2 4.972v6.34a.5.5 0 0 0 .32.467l4.962 1.908q.107.042.218.07M2.564 4.126L8 6.456l2.164-.928l-5.667-2.146z" />
        </svg>
    ),
    Equipe: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.002 4a1.998 1.998 0 1 1 3.996 0a1.998 1.998 0 0 1-3.996 0M8 3.002a.998.998 0 1 0 0 1.996a.998.998 0 0 0 0-1.996M11 4.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0m1.5-.5a.5.5 0 1 0 0 1a.5.5 0 0 0 0-1m-9-1a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3M3 4.5a.5.5 0 1 1 1 0a.5.5 0 0 1-1 0M4.268 7A2 2 0 0 0 4 8H2v2.5a1.5 1.5 0 0 0 2.096 1.377c.074.331.19.647.34.942A2.5 2.5 0 0 1 1 10.5V8a1 1 0 0 1 1-1zm7.296 5.819A2.5 2.5 0 0 0 15 10.5V8a1 1 0 0 0-1-1h-2.268c.17.294.268.635.268 1h2v2.5a1.5 1.5 0 0 1-2.096 1.377q-.114.498-.34.942M6 6.999a1 1 0 0 0-1 1V11a3 3 0 0 0 6 0V8a1 1 0 0 0-1-1zm0 1h4V11a2 2 0 0 1-4 0z" />
        </svg>
    ),
    Ajustes: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.012 2.25c.734.008 1.465.093 2.182.253a.75.75 0 0 1 .582.649l.17 1.527a1.384 1.384 0 0 0 1.927 1.116l1.4-.615a.75.75 0 0 1 .85.174a9.8 9.8 0 0 1 2.205 3.792a.75.75 0 0 1-.272.825l-1.241.916a1.38 1.38 0 0 0 0 2.226l1.243.915a.75.75 0 0 1 .272.826a9.8 9.8 0 0 1-2.204 3.792a.75.75 0 0 1-.849.175l-1.406-.617a1.38 1.38 0 0 0-1.926 1.114l-.17 1.526a.75.75 0 0 1-.571.647a9.5 9.5 0 0 1-4.406 0a.75.75 0 0 1-.572-.647l-.169-1.524a1.382 1.382 0 0 0-1.925-1.11l-1.406.616a.75.75 0 0 1-.85-.175a9.8 9.8 0 0 1-2.203-3.796a.75.75 0 0 1 .272-.826l1.243-.916a1.38 1.38 0 0 0 0-2.226l-1.243-.914a.75.75 0 0 1-.272-.826a9.8 9.8 0 0 1 2.205-3.792a.75.75 0 0 1 .85-.174l1.4.615a1.387 1.387 0 0 0 1.93-1.118l.17-1.526a.75.75 0 0 1 .583-.65q1.074-.238 2.201-.252m0 1.5a9 9 0 0 0-1.354.117l-.11.977A2.886 2.886 0 0 1 6.526 7.17l-.899-.394A8.3 8.3 0 0 0 4.28 9.092l.797.587a2.88 2.88 0 0 1 .001 4.643l-.799.588c.32.842.776 1.626 1.348 2.322l.905-.397a2.882 2.882 0 0 1 4.017 2.318l.109.984c.89.15 1.799.15 2.688 0l.11-.984a2.88 2.88 0 0 1 4.018-2.322l.904.396a8.3 8.3 0 0 0 1.348-2.318l-.798-.588a2.88 2.88 0 0 1-.001-4.643l.797-.587a8.3 8.3 0 0 0-1.348-2.317l-.897.393a2.884 2.884 0 0 1-4.023-2.324l-.109-.976a9 9 0 0 0-1.334-.117M12 8.25a3.75 3.75 0 1 1 0 7.5a3.75 3.75 0 0 1 0-7.5m0 1.5a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5" />
        </svg>
    ),
    Caixa: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 16 16">
            <path fill="currentColor" d="M9 7a2 2 0 1 1-4 0a2 2 0 0 1 4 0M8 7a1 1 0 1 0-2 0a1 1 0 0 0 2 0M1 4.25C1 3.56 1.56 3 2.25 3h9.5c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25h-9.5C1.56 11 1 10.44 1 9.75zM2.25 4a.25.25 0 0 0-.25.25V5h.5a.5.5 0 0 0 .5-.5V4zM2 9.75c0 .138.112.25.25.25H3v-.5a.5.5 0 0 0-.5-.5H2zm2-.25v.5h6v-.5A1.5 1.5 0 0 1 11.5 8h.5V6h-.5A1.5 1.5 0 0 1 10 4.5V4H4v.5A1.5 1.5 0 0 1 2.5 6H2v2h.5A1.5 1.5 0 0 1 4 9.5m7 .5h.75a.25.25 0 0 0 .25-.25V9h-.5a.5.5 0 0 0-.5.5zm1-5v-.75a.25.25 0 0 0-.25-.25H11v.5a.5.5 0 0 0 .5.5zm-7.5 8a1.5 1.5 0 0 1-1.427-1.036Q3.281 12 3.5 12h8.25A2.25 2.25 0 0 0 14 9.75V5.085A1.5 1.5 0 0 1 15 6.5v3.25A3.25 3.25 0 0 1 11.75 13z" />
        </svg>
    )
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('agenda');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [salonPermissions, setSalonPermissions] = useState<string[]>(['Agenda', 'Perfil']);
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const [salonInfo, setSalonInfo] = useState<{ name: string, logo: string | null }>({ name: 'Agenda+', logo: null });
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [hasLowStock, setHasLowStock] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user?.salon_id) {
            fetchSalonData();
            fetchLowStockAlert();

            // Periodically check for stock alerts
            const interval = setInterval(fetchLowStockAlert, 60000); // Every 1 min
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchLowStockAlert = async () => {
        if (!user?.salon_id) return;
        try {
            const { data } = await supabase
                .from('inventory')
                .select('id, quantity, min_stock')
                .eq('salon_id', user.salon_id);

            const isLow = data?.some(p => p.quantity <= p.min_stock) || false;
            setHasLowStock(isLow);
        } catch (err) {
            console.error('Error checking stock alerts:', err);
        }
    };

    const fetchSalonData = async () => {
        try {
            const { data, error } = await supabase
                .from('salons')
                .select('manager_permissions, app_name, logo_url, app_colors')
                .eq('id', user?.salon_id)
                .single();

            if (!error && data) {
                if (data.manager_permissions) setSalonPermissions(data.manager_permissions);
                setSalonInfo({
                    name: data.app_name || 'Agenda+',
                    logo: data.logo_url || null
                });

                // Apply Dynamic Theme
                if (data.app_colors) {
                    const root = document.documentElement;
                    if (data.app_colors.primary) {
                        root.style.setProperty('--ios-primary', data.app_colors.primary);
                    }
                    if (data.app_colors.secondary) {
                        root.style.setProperty('--ios-secondary', data.app_colors.secondary);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching salon data:', err);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const allMenuItems = [
        { id: 'agenda', label: 'Agenda', icon: <Icons.Agenda />, permission: 'Agenda' },
        { id: 'estoque', label: 'Estoque', icon: <Icons.Estoque />, permission: 'Estoque' },
        { id: 'equipe', label: 'Equipe', icon: <Icons.Equipe />, permission: 'Profissionais' },
        { id: 'caixa', label: 'Caixa', icon: <Icons.Caixa />, permission: 'Caixa' },
        { id: 'ajustes', label: 'Ajustes', icon: <Icons.Ajustes />, permission: 'Ajustes' },
    ];

    const menuItems = allMenuItems.filter(item => {
        if (user?.role === 'owner' || user?.role === 'DEV') return true;
        if (user?.role === 'manager') {
            return salonPermissions.includes(item.permission);
        }
        // Staff can only see Agenda by default
        return item.id === 'agenda';
    });

    if (loadingPermissions && user?.role !== 'staff') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Verificando permissões...</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <nav className="sidebar">
                    {/* App Logo */}
                    <div style={{ padding: '0 10px 40px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {salonInfo.logo ? (
                            <img src={salonInfo.logo} style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', background: 'white', border: '1px solid rgba(0,0,0,0.05)' }} />
                        ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: '900', boxShadow: '0 10px 20px rgba(157, 0, 255, 0.25)' }}>
                                {salonInfo.name[0]}
                            </div>
                        )}
                        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>{salonInfo.name}</h2>
                    </div>

                    {/* User Card */}
                    <div className="glass" style={{ margin: '0 0 32px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: 'none', background: 'rgba(0,0,0,0.035)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    style={{ width: '52px', height: '52px', borderRadius: '26px', objectFit: 'cover', border: '3px solid white' }}
                                />
                            ) : (
                                <div style={{ width: '52px', height: '52px', borderRadius: '26px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '20px', border: '3px solid white' }}>
                                    {user?.name?.[0].toUpperCase()}
                                </div>
                            )}
                            <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontWeight: '800', fontSize: '16px', color: 'var(--ios-text-primary)' }}>{user?.name}</p>
                                <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', opacity: 0.8 }}>{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveTab('perfil')}
                            className="glass-pill"
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '13px',
                                background: 'white',
                                fontWeight: '800',
                                borderRadius: '14px',
                                border: '1px solid rgba(0,0,0,0.05)',
                                color: 'var(--ios-text-primary)'
                            }}
                        >
                            Ver Perfil
                        </button>

                        {/* Plan Indicator - Sidebar */}
                        <div
                            onClick={() => setActiveTab('planos')}
                            style={{
                                marginTop: '8px',
                                padding: '12px 16px',
                                background: 'var(--ios-gradient-primary)',
                                borderRadius: '16px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 8px 16px rgba(157, 0, 255, 0.15)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase' }}>Plano Atual</span>
                                <span style={{ fontSize: '14px', fontWeight: '900' }}>
                                    {user?.current_plan === 1 ? 'Básico' : user?.current_plan === 2 ? 'Premium' : user?.current_plan === 3 ? 'Pro' : 'Tradicional'}
                                </span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {menuItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    padding: '14px 18px',
                                    gap: '14px',
                                    borderRadius: '16px',
                                    background: activeTab === item.id ? 'white' : 'transparent',
                                    boxShadow: activeTab === item.id ? '0 10px 25px rgba(0,0,0,0.04)' : 'none',
                                    color: activeTab === item.id ? 'var(--ios-primary)' : 'var(--ios-text-secondary)'
                                }}
                            >
                                <div style={{ opacity: activeTab === item.id ? 1 : 0.6, position: 'relative' }}>
                                    {item.icon}
                                    {item.id === 'estoque' && hasLowStock && (
                                        <div className="pulse-dot" style={{ position: 'absolute', top: '-2px', right: '-2px' }} />
                                    )}
                                </div>
                                <span style={{ fontWeight: activeTab === item.id ? '800' : '600', fontSize: '16px' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={logout}
                        style={{
                            marginTop: 'auto',
                            padding: '18px',
                            background: 'none',
                            border: 'none',
                            color: '#FF3B30',
                            fontWeight: '800',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            borderRadius: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style={{ color: '#FF3B30' }}>
                            <path fill="currentColor" d="M8.5 11.25a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5M11 3.5a.5.5 0 0 0-.576-.494l-7 1.07A.5.5 0 0 0 3 4.57v10.86a.5.5 0 0 0 .424.494l7 1.071a.5.5 0 0 0 .576-.494V10h5.172l-.997.874a.5.5 0 0 0 .658.752l1.996-1.75a.5.5 0 0 0 0-.752l-1.996-1.75a.499.499 0 1 0-.658.752l.997.874H11zm-1 .582V15.92L4 15V4.999zM12.5 16H12v-5h1v4.5a.5.5 0 0 1-.5.5M12 8V4h.5a.5.5 0 0 1 .5.5V8z" />
                        </svg>
                        Sair
                    </button>
                </nav>
            )}

            {/* Mobile Top Navbar */}
            {isMobile && (
                <nav style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '70px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {salonInfo.logo ? (
                            <img src={salonInfo.logo} style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)' }} />
                        ) : (
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '900' }}>
                                {salonInfo.name[0]}
                            </div>
                        )}
                        <h2 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--ios-text-primary)' }}>{salonInfo.name}</h2>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Plan Indicator - Top Nav */}
                            <div
                                onClick={() => setActiveTab('planos')}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--ios-gradient-primary)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(157, 0, 255, 0.2)'
                                }}
                            >
                                {user?.current_plan === 1 ? 'Básico' : user?.current_plan === 2 ? 'Premium' : user?.current_plan === 3 ? 'Pro' : 'Tradicional'}
                            </div>

                            <div
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{ cursor: 'pointer' }}
                            >
                                {user?.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.name}
                                        style={{ width: '38px', height: '38px', borderRadius: '19px', objectFit: 'cover', border: '2px solid var(--ios-primary)' }}
                                    />
                                ) : (
                                    <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: 'var(--ios-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '16px', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                        {user?.name?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {showUserMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '50px',
                                right: 0,
                                width: '160px',
                                background: 'white',
                                borderRadius: '16px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                padding: '8px',
                                border: '1px solid rgba(0,0,0,0.05)',
                                zIndex: 1001
                            }}>
                                <button
                                    onClick={() => { setActiveTab('perfil'); setShowUserMenu(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: 'var(--ios-text-primary)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F7')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 12 12" style={{ color: 'var(--ios-primary)' }}>
                                        <path fill="currentColor" d="M6 1a2 2 0 1 0 0 4a2 2 0 0 0 0-4M5 3a1 1 0 1 1 2 0a1 1 0 0 1-2 0m3.5 3h-5A1.5 1.5 0 0 0 2 7.5c0 1.116.459 2.01 1.212 2.615C3.953 10.71 4.947 11 6 11s2.047-.29 2.788-.885C9.54 9.51 10 8.616 10 7.5A1.5 1.5 0 0 0 8.5 6m-5 1h5a.5.5 0 0 1 .5.5c0 .817-.325 1.423-.838 1.835C7.636 9.757 6.88 10 6 10s-1.636-.243-2.162-.665C3.325 8.923 3 8.317 3 7.5a.5.5 0 0 1 .5-.5" />
                                    </svg>
                                    Ver Perfil
                                </button>
                                <div style={{ height: '1px', background: '#F2F2F7', margin: '4px 0' }} />
                                <button
                                    onClick={logout}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: '#FF3B30',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.05)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style={{ color: '#FF3B30' }}>
                                        <path fill="currentColor" d="M8.5 11.25a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5M11 3.5a.5.5 0 0 0-.576-.494l-7 1.07A.5.5 0 0 0 3 4.57v10.86a.5.5 0 0 0 .424.494l7 1.071a.5.5 0 0 0 .576-.494V10h5.172l-.997.874a.5.5 0 0 0 .658.752l1.996-1.75a.5.5 0 0 0 0-.752l-1.996-1.75a.499.499 0 1 0-.658.752l.997.874H11zm-1 .582V15.92L4 15V4.999zM12.5 16H12v-5h1v4.5a.5.5 0 0 1-.5.5M12 8V4h.5a.5.5 0 0 1 .5.5V8z" />
                                    </svg>
                                    Sair
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
            )}

            <main className="main-content" style={isMobile ? { paddingTop: '70px', paddingBottom: '80px' } : {}}>
                {children(activeTab)}
            </main>

            {/* Mobile Bottom Bar */}
            {isMobile && (
                <nav className="bottom-bar" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            style={{ gap: '4px' }}
                        >
                            <div style={{ opacity: activeTab === item.id ? 1 : 0.6, position: 'relative' }}>
                                {item.icon}
                                {item.id === 'estoque' && hasLowStock && (
                                    <div className="pulse-dot" style={{ position: 'absolute', top: '-1px', right: '-1px', width: '8px', height: '8px' }} />
                                )}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.2px' }}>{item.label}</span>
                        </div>
                    ))}
                </nav>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .pulse-dot {
                    width: 10px;
                    height: 10px;
                    background-color: #FF3B30;
                    border-radius: 50%;
                    border: 2px solid white;
                    animation: pulse-red 1.5s infinite;
                    box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
                }

                @keyframes pulse-red {
                    0% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
                    }
                    70% {
                        transform: scale(1);
                        box-shadow: 0 0 0 10px rgba(255, 59, 48, 0);
                    }
                    100% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(255, 59, 48, 0);
                    }
                }
            `}} />
        </>
    );
};

export default MainLayout;
