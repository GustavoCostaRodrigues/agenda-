import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update users table
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 4. Update local state (context will refresh on next mount or manual trigger)
            alert('Foto de perfil atualizada com sucesso! ✨');
            window.location.reload(); // Simple way to refresh context
        } catch (err) {
            console.error('Error uploading avatar:', err);
            alert('Erro ao atualizar foto de perfil.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="agenda-screen fade-in">
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '38px', marginBottom: '8px' }}>Meu Perfil</h1>
                <p>Gerencie suas informações pessoais</p>
            </header>

            <div className="glass" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '500px', margin: '0 auto' }}>

                {/* Avatar Section */}
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handlePhotoClick}>
                    {user?.avatar_url ? (
                        <div style={{ position: 'relative' }}>
                            <img
                                src={user.avatar_url}
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderRadius: '70px',
                                    objectFit: 'cover',
                                    border: '4px solid white',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)'
                                }}
                            />
                            {/* Pencil Icon (from Agenda) */}
                            <div style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                background: 'var(--ios-primary)',
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '3px solid white',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20"><path fill="currentColor" d="M17.181 2.927a2.975 2.975 0 0 0-4.259-.054l-9.375 9.375a2.44 2.44 0 0 0-.656 1.194l-.877 3.95a.5.5 0 0 0 .596.597l3.927-.873a2.5 2.5 0 0 0 1.234-.678l9.358-9.358a2.975 2.975 0 0 0 .052-4.153m-3.552.653a1.975 1.975 0 1 1 2.793 2.793l-.671.671l-2.793-2.792zm-1.378 1.38l2.793 2.792l-7.98 7.98a1.5 1.5 0 0 1-.744.409l-3.16.702l.708-3.183c.059-.267.193-.511.386-.704z" /></svg>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '140px',
                            height: '140px',
                            borderRadius: '70px',
                            background: 'var(--ios-gradient-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            border: '4px solid white',
                            boxShadow: '0 10px 40px rgba(157, 0, 255, 0.2)'
                        }}>
                            <span style={{ fontSize: '48px', fontWeight: '800' }}>{user?.name?.[0]}</span>
                            <span style={{ fontSize: '10px', fontWeight: '800', marginTop: '4px', opacity: 0.9 }}>INSERIR FOTO</span>
                        </div>
                    )}

                    {uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--ios-primary)' }}>
                            ...
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={handlePhotoUpload}
                    />
                </div>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>{user?.name}</h2>
                    <p style={{ color: 'var(--ios-text-secondary)', fontSize: '16px', fontWeight: '500' }}>{user?.email}</p>
                    <div className="glass-pill" style={{ display: 'inline-block', marginTop: '16px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--ios-primary)' }}>
                        {user?.role === 'owner' ? 'Proprietário' : user?.role === 'manager' ? 'Gerente' : 'Colaborador'}
                    </div>
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--ios-border)', margin: '8px 0' }} />

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Alterar Senha Button */}
                    <button className="ios-input" style={{ textAlign: 'left', fontWeight: '700', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'not-allowed', opacity: 0.7 }}>
                        <div style={{ color: 'var(--ios-primary)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 12 12"><path fill="currentColor" d="M8 3a1 1 0 0 1 2 0a.5.5 0 0 0 1 0a2 2 0 1 0-4 0v1H3.5A1.5 1.5 0 0 0 2 5.5v4A1.5 1.5 0 0 0 3.5 11h5A1.5 1.5 0 0 0 10 9.5v-4A1.5 1.5 0 0 0 8.5 4H8zM3.5 5h5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5" /></svg>
                        </div>
                        Alterar Senha
                    </button>

                    {/* Sair Button */}
                    <button
                        onClick={logout}
                        className="ios-input"
                        style={{ textAlign: 'left', fontWeight: '700', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#FF3B30' }}
                    >
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 20 20"><path fill="currentColor" d="M8.5 11.25a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5M11 3.5a.5.5 0 0 0-.576-.494l-7 1.07A.5.5 0 0 0 3 4.57v10.86a.5.5 0 0 0 .424.494l7 1.071a.5.5 0 0 0 .576-.494V10h5.172l-.997.874a.5.5 0 0 0 .658.752l1.996-1.75a.5.5 0 0 0 0-.752l-1.996-1.75a.499.499 0 1 0-.658.752l.997.874H11zm-1 .582V15.92L4 15V4.999zM12.5 16H12v-5h1v4.5a.5.5 0 0 1-.5.5M12 8V4h.5a.5.5 0 0 1 .5.5V8z" /></svg>
                        </div>
                        Sair da Conta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
