import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Shield, Activity, Clock, AtSign, ImageUp } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function Profile() {
  const { user, logoutUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [lastVisited, setLastVisited] = useState(null);
  const fileInputRef = useRef(null);

  const username = user?.username || user?.email?.split('@')[0] || 'operator';
  const lastVisitedStorageKey = user?.email ? `rescuesync_last_visited_${user.email.toLowerCase()}` : null;

  useEffect(() => {
    setAvatar(user?.avatar || null);
  }, [user?.avatar]);

  useEffect(() => {
    if (!lastVisitedStorageKey) {
      return;
    }

    const previousVisit = localStorage.getItem(lastVisitedStorageKey);
    setLastVisited(previousVisit);
    localStorage.setItem(lastVisitedStorageKey, new Date().toISOString());
  }, [lastVisitedStorageKey]);

  const formatDateTime = (value) => {
    if (!value) {
      return 'First visit';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }

    return parsed.toLocaleString();
  };

  const handleAvatarUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file.');
      event.target.value = '';
      return;
    }

    // Limit size to avoid localStorage quota issues.
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size must be under 2MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = typeof reader.result === 'string' ? reader.result : null;

      if (!imageData) {
        setUploadError('Unable to process this image.');
        return;
      }

      try {
        const response = await fetch(apiUrl('/auth/avatar'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email, avatar: imageData }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.msg || 'Failed to update avatar');
        }

        updateUserProfile({ ...user, ...payload.user });
        setAvatar(payload.user?.avatar || imageData);
        setUploadError('');
      } catch (err) {
        setUploadError(err.message || 'Could not save image. Try a smaller file.');
      }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  if (!user) {
    return (
      <main className="flex-1 px-8 py-16 flex justify-center items-center">
        <h2 className="font-display text-2xl font-bold">No user profile found. Please log in.</h2>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 py-16 max-w-5xl mx-auto w-full">
      <div className="mb-12 flex justify-between items-end border-b-4 border-primary pb-6">
        <div>
          <h3 className="font-display text-4xl font-bold tracking-tight mb-2 uppercase">User Profile</h3>
          <h1 className="text-secondary font-bold tracking-wider uppercase text-sm">Information and Logs</h1>
        </div>
        <button
          onClick={handleLogout}
          className="bg-[#FF0000] text-white px-6 py-3 font-bold uppercase text-sm hover:bg-[#CC0000] active:scale-95 transition-all duration-100 flex items-center gap-2 shadow-ambient"
        >
          <LogOut size={18} strokeWidth={2.5} /> TERMINATE SESSION
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-surface-lowest p-8 border border-outline/20 shadow-ambient flex flex-col items-center text-center relative overflow-hidden">
             <div className="w-32 h-32 bg-primary rounded-full flex justify-center items-center mb-4 relative z-10 shadow-lg overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-5xl text-on-primary uppercase">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </span>
                )}
             </div>
             <input
               ref={fileInputRef}
               type="file"
               accept="image/*"
               className="hidden"
               onChange={handleAvatarUpload}
             />
             <button
               onClick={handleAvatarUploadClick}
               className="z-10 mb-2 text-xs font-bold uppercase tracking-wider bg-surface-container hover:bg-surface-high px-3 py-2 flex items-center gap-2 transition-colors"
               type="button"
             >
               <ImageUp size={14} /> Upload Photo
             </button>
             {uploadError && (
               <p className="z-10 mb-3 text-xs font-bold text-[#CC0000]">{uploadError}</p>
             )}
             <h2 className="font-display text-3xl font-bold uppercase mb-1 z-10">
               {user.firstName} {user.lastName}
             </h2>
             <span className="text-xs font-bold px-3 py-1 bg-black text-white uppercase tracking-widest z-10 mb-6">
               {user.role}
             </span>

             <div className="w-full text-left space-y-4 border-t border-outline/20 pt-6 mt-2 relative z-10">
               <div className="flex items-center gap-3">
                 <Mail size={18} className="text-secondary" />
                 <span className="font-mono text-sm text-secondary truncate">{user.email}</span>
               </div>
               <div className="flex items-center gap-3">
                 <AtSign size={18} className="text-secondary" />
                 <span className="font-mono text-sm text-secondary">{username}</span>
               </div>
               <div className="flex items-center gap-3">
                 <Clock size={18} className="text-secondary" />
                 <span className="font-mono text-sm text-secondary">{formatDateTime(lastVisited)}</span>
               </div>
               <div className="flex items-center gap-3">
                 <Shield size={18} className="text-secondary" />
                 <span className="font-bold text-sm uppercase">Clearance Level {user.role === 'ADMIN' ? 'Omega' : 'Alpha'}</span>
               </div>
             </div>
             
             {/* Decorative Background Element */}
             <div className="absolute -bottom-10 -right-10 opacity-5 z-0">
               <User size={200} />
             </div>
          </div>
        </div>

        {/* Details List */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-lowest p-8 border border-outline/20 shadow-ambient flex-1">
             <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2 uppercase">
               <Activity size={24} /> Telemetry Record
             </h3>
             <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4 border-b border-outline/10 pb-4">
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Assigned ID</p>
                   <p className="font-mono text-sm">{user.id}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Status</p>
                   <p className="font-bold text-sm text-[#00AA00] flex items-center gap-2">
                     <span className="animate-pulse">●</span> ONLINE
                   </p>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4 border-b border-outline/10 pb-4">
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">User Mail</p>
                   <p className="font-mono text-sm truncate">{user.email}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Username</p>
                   <p className="font-mono text-sm flex items-center gap-2">
                     <AtSign size={14} /> {username}
                   </p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 border-b border-outline/10 pb-4">
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Encryption Key</p>
                   <p className="font-mono text-sm">VALIDATED</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Last Visited</p>
                   <p className="font-mono text-sm flex items-center gap-2">
                     <Clock size={14} /> {formatDateTime(lastVisited)}
                   </p>
                 </div>
               </div>
               
               <div>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Access Privileges</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-surface-container text-xs font-bold uppercase">Dashboard</span>
                    <span className="px-2 py-1 bg-surface-container text-xs font-bold uppercase">Terminal</span>
                    {user.role === 'ADMIN' && (
                      <span className="px-2 py-1 bg-primary text-on-primary text-xs font-bold uppercase">Override Command</span>
                    )}
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
