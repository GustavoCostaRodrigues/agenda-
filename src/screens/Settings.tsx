import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const PageIcons = {
    Agenda: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <path fill="currentColor" d="M17 14.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5zm-1 0v-9A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5m-2-8a.5.5 0 0 1-.41.492L13.5 7h-7a.5.5 0 0 1-.09-.992L6.5 6h7a.5.5 0 0 1 .5.5m0 3.5a.5.5 0 0 1-.41.492l-.09.008h-7a.5.5 0 0 1-.09-.992L6.5 9.5h7a.5.5 0 0 1 .5.5m0 3.5a.5.5 0 0 1-.41.492L13.5 14h-7a.5.5 0 0 1-.09-.992L6.5 13h7a.5.5 0 0 1 .5.5" />
        </svg>
    ),
    Estoque: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.923 1.378a3 3 0 0 1 2.154 0l4.962 1.908a1.5 1.5 0 0 1 .961 1.4v6.626a1.5 1.5 0 0 1-.961 1.4l-4.962 1.909a3 3 0 0 1-2.154 0l-4.961-1.909a1.5 1.5 0 0 1-.962-1.4V4.686a1.5 1.5 0 0 1 .962-1.4zm1.795.933a2 2 0 0 0-1.436 0l-1.384.533l5.59 2.116l1.948-.834zM14 4.971L8.5 7.33v6.428q.11-.028.218-.07l4.962-1.908a.5.5 0 0 0 .32-.467zm-6.5 8.786V7.33L2 4.972v6.34a.5.5 0 0 0 .32.467l4.962 1.908q.107.042.218.07M2.564 4.126L8 6.456l2.164-.928l-5.667-2.146z" />
        </svg>
    ),
    Equipe: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
            <path fill="currentColor" d="M6.002 4a1.998 1.998 0 1 1 3.996 0a1.998 1.998 0 0 1-3.996 0M8 3.002a.998.998 0 1 0 0 1.996a.998.998 0 0 0 0-1.996M11 4.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0m1.5-.5a.5.5 0 1 0 0 1a.5.5 0 0 0 0-1m-9-1a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3M3 4.5a.5.5 0 1 1 1 0a.5.5 0 0 1-1 0M4.268 7A2 2 0 0 0 4 8H2v2.5a1.5 1.5 0 0 0 2.096 1.377c.074.331.19.647.34.942A2.5 2.5 0 0 1 1 10.5V8a1 1 0 0 1 1-1zm7.296 5.819A2.5 2.5 0 0 0 15 10.5V8a1 1 0 0 0-1-1h-2.268c.17.294.268.635.268 1h2v2.5a1.5 1.5 0 0 1-2.096 1.377q-.114.498-.34.942M6 6.999a1 1 0 0 0-1 1V11a3 3 0 0 0 6 0V8a1 1 0 0 0-1-1zm0 1h4V11a2 2 0 0 1-4 0z" />
        </svg>
    ),
    Ajustes: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.012 2.25c.734.008 1.465.093 2.182.253a.75.75 0 0 1 .582.649l.17 1.527a1.384 1.384 0 0 0 1.927 1.116l1.4-.615a.75.75 0 0 1 .85.174a9.8 9.8 0 0 1 2.205 3.792a.75.75 0 0 1-.272.825l-1.241.916a1.38 1.38 0 0 0 0 2.226l1.243.915a.75.75 0 0 1 .272.826a9.8 9.8 0 0 1-2.204 3.792a.75.75 0 0 1-.849.175l-1.406-.617a1.38 1.38 0 0 0-1.926 1.114l-.17 1.526a.75.75 0 0 1-.571.647a9.5 9.5 0 0 1-4.406 0a.75.75 0 0 1-.572-.647l-.169-1.524a1.382 1.382 0 0 0-1.925-1.11l-1.406.616a.75.75 0 0 1-.85-.175a9.8 9.8 0 0 1-2.203-3.796a.75.75 0 0 1 .272-.826l1.243-.916a1.38 1.38 0 0 0 0-2.226l-1.243-.914a.75.75 0 0 1-.272-.826a9.8 9.8 0 0 1 2.205-3.792a.75.75 0 0 1 .85-.174l1.4.615a1.387 1.387 0 0 0 1.93-1.118l.17-1.526a.75.75 0 0 1 .583-.65q1.074-.238 2.201-.252m0 1.5a9 9 0 0 0-1.354.117l-.11.977A2.886 2.886 0 0 1 6.526 7.17l-.899-.394A8.3 8.3 0 0 0 4.28 9.092l.797.587a2.88 2.88 0 0 1 .001 4.643l-.799.588c.32.842.776 1.626 1.348 2.322l.905-.397a2.882 2.882 0 0 1 4.017 2.318l.109.984c.89.15 1.799.15 2.688 0l.11-.984a2.88 2.88 0 0 1 4.018-2.322l.904.396a8.3 8.3 0 0 0 1.348-2.318l-.798-.588a2.88 2.88 0 0 1-.001-4.643l.797-.587a8.3 8.3 0 0 0-1.348-2.317l-.897.393a2.884 2.884 0 0 1-4.023-2.324l-.109-.976a9 9 0 0 0-1.334-.117M12 8.25a3.75 3.75 0 1 1 0 7.5a3.75 3.75 0 0 1 0-7.5m0 1.5a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5" />
        </svg>
    ),
    Caixa: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
            <path fill="currentColor" d="M9 7a2 2 0 1 1-4 0a2 2 0 0 1 4 0M8 7a1 1 0 1 0-2 0a1 1 0 0 0 2 0M1 4.25C1 3.56 1.56 3 2.25 3h9.5c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25h-9.5C1.56 11 1 10.44 1 9.75zM2.25 4a.25.25 0 0 0-.25.25V5h.5a.5.5 0 0 0 .5-.5V4zM2 9.75c0 .138.112.25.25.25H3v-.5a.5.5 0 0 0-.5-.5H2zm2-.25v.5h6v-.5A1.5 1.5 0 0 1 11.5 8h.5V6h-.5A1.5 1.5 0 0 1 10 4.5V4H4v.5A1.5 1.5 0 0 1 2.5 6H2v2h.5A1.5 1.5 0 0 1 4 9.5m7 .5h.75a.25.25 0 0 0 .25-.25V9h-.5a.5.5 0 0 0-.5.5zm1-5v-.75a.25.25 0 0 0-.25-.25H11v.5a.5.5 0 0 0 .5.5zm-7.5 8a1.5 1.5 0 0 1-1.427-1.036Q3.281 12 3.5 12h8.25A2.25 2.25 0 0 0 14 9.75V5.085A1.5 1.5 0 0 1 15 6.5v3.25A3.25 3.25 0 0 1 11.75 13z" />
        </svg>
    )
};

const PAGES = [
    { id: 'Agenda', label: 'Agenda', icon: <PageIcons.Agenda /> },
    { id: 'Estoque', label: 'Estoque', icon: <PageIcons.Estoque /> },
    { id: 'Profissionais', label: 'Equipe', icon: <PageIcons.Equipe /> },
    { id: 'Caixa', label: 'Caixa', icon: <PageIcons.Caixa /> },
    { id: 'Ajustes', label: 'Ajustes', icon: <PageIcons.Ajustes /> }
];

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Salon settings state
    const [appName, setAppName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [colors, setColors] = useState({ primary: '#007AFF', secondary: '#5856D6' });
    const [slug, setSlug] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [managerPermissions, setManagerPermissions] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (user?.salon_id) {
            fetchSalonSettings();
        }
    }, [user]);

    const fetchSalonSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('salons')
                .select('*')
                .eq('id', user?.salon_id)
                .single();

            if (error) throw error;

            if (data) {
                setAppName(data.app_name || '');
                setLogoUrl(data.logo_url || ''); // Unified to logo_url
                setColors(data.app_colors || { primary: '#007AFF', secondary: '#5856D6' });
                setSlug(data.slug || '');
                setWhatsapp(data.whatsapp || '');
                setManagerPermissions(data.manager_permissions || []);
            }
        } catch (err) {
            console.error('Error fetching salon settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.salon_id) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${user.salon_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
        } catch (err) {
            console.error('Error uploading logo:', err);
            alert('Erro ao fazer upload do logo.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = () => {
        setLogoUrl('');
    };

    const handleTogglePermission = (pageId: string) => {
        setManagerPermissions(prev =>
            prev.includes(pageId)
                ? prev.filter(p => p !== pageId)
                : [...prev, pageId]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('salons')
                .update({
                    app_name: appName,
                    logo_url: logoUrl, // Unified to logo_url
                    app_colors: colors,
                    slug: slug.toLowerCase().replace(/\s+/g, '-'),
                    whatsapp: whatsapp,
                    manager_permissions: managerPermissions
                })
                .eq('id', user?.salon_id);

            if (error) throw error;

            // Apply theme immediately after saving
            const root = document.documentElement;
            if (colors.primary) root.style.setProperty('--ios-primary', colors.primary);
            if (colors.secondary) root.style.setProperty('--ios-secondary', colors.secondary);

            alert('Configurações salvas com sucesso! ✨');
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <p>Carregando configurações...</p>
            </div>
        );
    }

    if (user?.role !== 'owner' && user?.role !== 'DEV') {
        return (
            <div className="settings-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <p>Acesso negado. Apenas proprietários podem acessar esta tela.</p>
            </div>
        );
    }

    return (
        <div className="settings-container fade-in">
            <header className="agenda-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1>Ajustes</h1>
                    <p>Personalize seu {appName || 'Agenda+'}</p>
                </div>
            </header>

            <form onSubmit={handleSave}>
                {/* White Label Section */}
                <div className="settings-section">
                    <h2 style={{ gap: '10px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 12 12" style={{ color: 'var(--ios-primary)' }}><path fill="currentColor" d="M8.5 1h-6a.5.5 0 0 0-.5.5V7c0 .552.449 1 1 1h1v1.5c0 .827.673 1.5 1.5 1.5S7 10.327 7 9.5V8h1c.551 0 1-.448 1-1V1.5a.5.5 0 0 0-.5-.5M4 2v.5a.5.5 0 0 0 1 0V2h1v1a.5.5 0 0 0 1 0V2h1v3H3V2zm2.5 5a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 0-.5-.5H3V6h5v1z" /></svg>
                        Publicidade e Links
                    </h2>

                    {slug && (
                        <div style={{
                            background: 'rgba(0,122,255,0.05)',
                            padding: '16px',
                            borderRadius: '16px',
                            marginBottom: '20px',
                            border: '1px solid rgba(0,122,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--ios-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seu Link de Agendamento:</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    readOnly
                                    className="ios-input"
                                    style={{ background: 'white', fontSize: '13px' }}
                                    value={`https://agendaplus.com.br/agendar/${slug}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://agendaplus.com.br/agendar/${slug}`);
                                        alert('Link copiado! Cole na bio do Instagram ou no WhatsApp. 🚀');
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '0 15px', height: '44px', whiteSpace: 'nowrap' }}
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label-ios">Nome do Aplicativo</label>
                        <input
                            type="text"
                            className="ios-input"
                            placeholder="Ex: Salon Elegance"
                            value={appName}
                            onChange={(e) => setAppName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label-ios">Endereço de Agendamento (Link Único)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '600' }}>agendaplus.com.br/agendar/</span>
                            <input
                                type="text"
                                className="ios-input"
                                style={{ flex: 1 }}
                                placeholder="meu-salao"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                required
                            />
                        </div>
                        <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '6px' }}>Este é o link que você vai colocar na bío do Instagram e no WhatsApp.</p>
                    </div>

                    <div className="form-group">
                        <label className="label-ios">WhatsApp do Salão (Com DDD)</label>
                        <input
                            type="tel"
                            className="ios-input"
                            placeholder="(00) 00000-0000"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label-ios">Logo do Salão</label>
                        {logoUrl ? (
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                height: '200px',
                                margin: '8px 0 20px',
                                background: 'white',
                                borderRadius: '20px',
                                border: '2px solid #F2F2F7',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img
                                    src={logoUrl}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        padding: '24px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255, 59, 48, 0.9)', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(255, 59, 48, 0.3)', zIndex: 1 }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '130px',
                                background: '#F2F2F7',
                                borderRadius: '20px',
                                border: '2px dashed #C7C7CC',
                                cursor: 'pointer',
                                margin: '8px 0 20px',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ color: '#007AFF', marginBottom: '12px', opacity: 0.8 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><path fill="currentColor" d="M3.5 2a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm4.854 2.146a.5.5 0 0 0-.708 0l-3.5 3.5a.5.5 0 1 0 .708.708L7.5 5.707V13.5a.5.5 0 0 0 1 0V5.707l2.646 2.647a.5.5 0 0 0 .708-.708z" /></svg>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#8E8E93' }}>{uploading ? 'Subindo...' : 'CLIQUE PARA SUBIR O LOGO'}</span>
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                            </label>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="label-ios">Cor Primária</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    className="ios-color-picker"
                                    value={colors.primary}
                                    onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{colors.primary.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label-ios">Cor Secundária</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    className="ios-color-picker"
                                    value={colors.secondary}
                                    onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{colors.secondary.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions Section */}
                <div className="settings-section">
                    <h2 style={{ gap: '10px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 12 12" style={{ color: 'var(--ios-primary)' }}><path fill="currentColor" d="M8 3a1 1 0 0 1 2 0a.5.5 0 0 0 1 0a2 2 0 1 0-4 0v1H3.5A1.5 1.5 0 0 0 2 5.5v4A1.5 1.5 0 0 0 3.5 11h5A1.5 1.5 0 0 0 10 9.5v-4A1.5 1.5 0 0 0 8.5 4H8zM3.5 5h5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5" /></svg>
                        Permissões do Gerente
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginBottom: '16px', marginLeft: '4px' }}>
                        Defina quais telas o cargo "Gerente" tem permissão para acessar.
                    </p>

                    <div className="permissions-list">
                        {PAGES.map(page => (
                            <div key={page.id} className="switch-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: 'var(--ios-primary)', opacity: 0.6, display: 'flex' }}>
                                        {page.icon}
                                    </div>
                                    <span className="switch-label">{page.label}</span>
                                </div>
                                <label className="ios-switch">
                                    <input
                                        type="checkbox"
                                        checked={managerPermissions.includes(page.id)}
                                        onChange={() => handleTogglePermission(page.id)}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                    disabled={saving}
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </form>
        </div>
    );
};

export default Settings;
