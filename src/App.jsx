import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updatePassword, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, query, 
  orderBy, onSnapshot, updateDoc, serverTimestamp, increment, runTransaction
} from 'firebase/firestore';
import { 
  Mail, History, User, LogOut, Menu, X, Copy, RefreshCw, 
  Shield, Key, Link as LinkIcon, Lock, Globe
} from 'lucide-react';

// --- CẤU HÌNH ---
const firebaseConfig = {
  apiKey: "AIzaSyC6MyEVJ7SH7MB6jgx7TW0yx36uy1_JrLc",
  authDomain: "mailao-9cffb.firebaseapp.com",
  projectId: "mailao-9cffb",
  storageBucket: "mailao-9cffb.firebasestorage.app",
  messagingSenderId: "904960606200",
  appId: "1:904960606200:web:ac40d9246431fb8f57200d"
};

const DOMAIN_NAME = "domail.online";
const APP_ID_DB = 'cloudmail-pro-production';

// Khởi tạo Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Lỗi khởi tạo Firebase:", e);
}

// --- Component Sidebar ---
const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, userData, view, setView, handleLogout, navigateToHome }) => (
  <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto md:flex md:flex-col shadow-xl border-r border-gray-800`}>
    <div className="p-6 flex justify-between items-center border-b border-gray-800">
      <h1 onClick={navigateToHome} className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">
        CloudMail Pro
      </h1>
      <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
        <X size={24} />
      </button>
    </div>
    
    <div className="p-4 border-b border-gray-800 bg-gray-800/50">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
          {userData?.email?.[0].toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="font-medium truncate text-sm">{userData?.email}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {userData?.role === 'admin' ? <Shield size={10} className="text-yellow-400"/> : <User size={10}/>}
            {userData?.role === 'admin' ? 'Admin (VIP)' : 'Thành viên'}
          </p>
        </div>
      </div>
      {userData?.role !== 'admin' && (
         <div className="text-xs text-gray-400 mt-2">
           Hôm nay: <span className={userData?.dailyCount >= 10 ? 'text-red-400' : 'text-green-400'}>{userData?.dailyCount || 0}/10</span>
         </div>
      )}
    </div>

    <nav className="flex-1 p-4 space-y-2">
      {[{id: 'dashboard', icon: Mail, label: 'Hòm thư'}, {id: 'history', icon: History, label: 'Lịch sử'}, {id: 'profile', icon: User, label: 'Tài khoản'}].map(item => (
        <button key={item.id} onClick={() => { setView(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <item.icon size={20} /> <span>{item.label}</span>
        </button>
      ))}
    </nav>

    <div className="p-4 border-t border-gray-800">
      <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
        <LogOut size={20} /> <span>Đăng xuất</span>
      </button>
    </div>
  </div>
);

// --- Component Auth ---
const AuthScreen = ({ email, setEmail, password, setPassword, loading, isRegistering, setIsRegistering, handleAuth, error }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">CloudMail Pro</h1>
        <p className="text-gray-400">Mail tạm thời domain {DOMAIN_NAME}</p>
      </div>
      {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleAuth} className="space-y-4">
        <input type="email" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vidu.com" />
        <input type="password" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">
          {loading ? 'Đang xử lý...' : (isRegistering ? 'Đăng Ký' : 'Đăng Nhập')}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-400 hover:text-blue-300">
          {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
        </button>
      </div>
    </div>
  </div>
);

// --- Component Dashboard ---
const Dashboard = ({ loading, handleCreateMailbox, error, successMsg, currentMailbox }) => (
  <div className="p-4 max-w-4xl mx-auto space-y-6">
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Globe className="text-blue-400" /> Hệ thống Mail {DOMAIN_NAME}</h2>
      <div className="mb-4">
          <button onClick={handleCreateMailbox} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-[0.99]">
            {loading ? <RefreshCw className="animate-spin" /> : <Mail size={24} />} <span className="text-lg">Tạo Email Mới</span>
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">Hệ thống tự động nhận diện Facebook, TikTok...</p>
      </div>
      {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      {successMsg && <p className="text-green-400 text-sm mt-2 text-center">{successMsg}</p>}
    </div>
    {currentMailbox && (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl animate-fade-in">
         <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-bold text-white flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Hòm thư đang hoạt động</h3>
           <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 flex items-center gap-1"><Globe size={10} /> {DOMAIN_NAME}</span>
         </div>
         <div className="space-y-4">
           <div className="group relative">
             <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email</label>
             <div className="flex items-center gap-2 mt-1">
               <code className="flex-1 bg-gray-950 p-3 rounded-lg text-green-400 font-mono text-lg border border-gray-700 select-all">{currentMailbox.email}</code>
               <button onClick={() => { navigator.clipboard.writeText(currentMailbox.email); alert("Đã copy Email"); }} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"><Copy size={20} /></button>
             </div>
           </div>
           <div className="group relative">
             <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">API Key</label>
             <div className="flex items-center gap-2 mt-1">
               <code className="flex-1 bg-gray-950 p-2 rounded-lg text-yellow-400 font-mono text-sm border border-gray-700 truncate">{currentMailbox.apiKey}</code>
               <button onClick={() => { navigator.clipboard.writeText(currentMailbox.apiKey); alert("Đã copy Key"); }} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"><Copy size={16} /></button>
             </div>
           </div>
         </div>
      </div>
    )}
  </div>
);

// --- Component History ---
const HistoryView = ({ mailHistory }) => (
  <div className="p-4 max-w-5xl mx-auto">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><History className="text-purple-400" /> Lịch sử</h2>
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-900 text-gray-200 uppercase font-bold text-xs">
            <tr><th className="px-6 py-4">Nguồn</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">API Key</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {mailHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 text-white"><span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs">{item.service || 'Pending...'}</span></td>
                <td className="px-6 py-4"><span className="text-gray-300 font-mono">{item.email}</span></td>
                <td className="px-6 py-4"><span className="truncate max-w-[80px] font-mono block">{item.apiKey}</span></td>
              </tr>
            ))}
            {mailHistory.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">Trống.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- Component Profile ---
const ProfileView = ({ userData, newPassword, setNewPassword, handleUpdatePassword, successMsg }) => (
  <div className="p-4 max-w-2xl mx-auto space-y-6">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><User className="text-blue-400" /> Tài khoản</h2>
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <div className="flex items-center gap-4 mb-6">
         <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">{userData?.email?.[0].toUpperCase()}</div>
         <div>
           <h3 className="text-xl font-bold text-white">{userData?.email}</h3>
           <p className="text-sm text-gray-400">{userData?.role === 'admin' ? '🛡️ Admin VIP' : '👤 Thành viên'}</p>
         </div>
      </div>
      <div className="bg-gray-900/50 p-4 rounded-lg">
         <p className="text-gray-500 text-xs uppercase font-bold">Giới hạn hôm nay</p>
         <p className={`font-mono text-lg ${userData?.dailyCount >= 10 ? 'text-red-500' : 'text-green-500'}`}>{userData?.dailyCount || 0} / {userData?.role === 'admin' ? '∞' : '10'}</p>
      </div>
    </div>
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
       <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Lock size={18}/> Đổi mật khẩu</h3>
       <div className="flex gap-2">
         <input type="password" placeholder="Mật khẩu mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white outline-none" />
         <button onClick={handleUpdatePassword} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">Lưu</button>
       </div>
       {successMsg && <p className="text-green-400 text-sm mt-2">{successMsg}</p>}
    </div>
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [currentMailbox, setCurrentMailbox] = useState(null);
  const [mailHistory, setMailHistory] = useState([]);

  // --- AUTO INJECT TAILWIND (QUAN TRỌNG: Tự động cài giao diện) ---
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'profile', 'info');
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, { role: 'user', dailyCount: 0, email: currentUser.email });
          }
          onSnapshot(userRef, (doc) => setUserData(doc.data()));

          const historyRef = collection(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'history');
          const q = query(historyRef, orderBy('createdAt', 'desc'));
          onSnapshot(q, (snapshot) => {
            setMailHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
          setView('dashboard');
        } catch (e) { console.error(e); }
      } else {
        setView('auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const handleLogout = () => { signOut(auth); setIsSidebarOpen(false); };

  const handleUpdatePassword = async () => {
    try { await updatePassword(user, newPassword); setSuccessMsg("Đổi mật khẩu OK!"); setNewPassword(''); }
    catch (err) { setError(err.message); }
  };

  const handleCreateMailbox = async () => {
    if (!user || !userData) return;
    const today = new Date().toISOString().split('T')[0];
    if (userData.role !== 'admin' && userData.dailyCount >= 10) { setError("Đã hết lượt tạo hôm nay!"); return; }
    
    setLoading(true);
    try {
      const prefix = Math.random().toString(36).substring(7);
      const newMailData = {
        email: `${prefix}@${DOMAIN_NAME}`,
        apiKey: 'key_' + Math.random().toString(36).substring(2),
        createdAt: serverTimestamp()
      };
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'artifacts', APP_ID_DB, 'users', user.uid, 'profile', 'info');
        transaction.update(userRef, { dailyCount: increment(1) });
        const historyRef = doc(collection(db, 'artifacts', APP_ID_DB, 'users', user.uid, 'history'));
        transaction.set(historyRef, newMailData);
      });
      
      setCurrentMailbox(newMailData);
      setSuccessMsg("Tạo thành công!");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const navigateToHome = () => { setView('dashboard'); setIsSidebarOpen(false); };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin mr-2" /> Đang khởi động...</div>;

  if (!user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} loading={loading} isRegistering={isRegistering} setIsRegistering={setIsRegistering} handleAuth={handleAuth} error={error} />;

  return (
    <div className="flex min-h-screen bg-gray-900 font-sans text-gray-100">
      <div className="md:hidden fixed top-0 w-full bg-gray-900 border-b border-gray-800 z-40 flex items-center justify-between p-4 shadow-lg">
        <h1 onClick={navigateToHome} className="text-lg font-bold text-blue-400 cursor-pointer">CloudMail Pro</h1>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white"><Menu /></button>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userData={userData} view={view} setView={setView} handleLogout={handleLogout} navigateToHome={navigateToHome} />

      <main className="flex-1 md:ml-0 pt-16 md:pt-0 overflow-y-auto h-screen bg-gray-900">
        <div className="p-4 md:p-8">
           {view === 'dashboard' && <Dashboard loading={loading} handleCreateMailbox={handleCreateMailbox} error={error} successMsg={successMsg} currentMailbox={currentMailbox} />}
           {view === 'history' && <HistoryView mailHistory={mailHistory} />}
           {view === 'profile' && <ProfileView userData={userData} newPassword={newPassword} setNewPassword={setNewPassword} handleUpdatePassword={handleUpdatePassword} successMsg={successMsg} />}
        </div>
      </main>
    </div>
  );
}


