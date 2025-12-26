import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updatePassword, signInWithCustomToken,
  signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, query, 
  orderBy, onSnapshot, updateDoc, serverTimestamp, increment, runTransaction
} from 'firebase/firestore';
import { 
  Mail, History, User, LogOut, Menu, X, Copy, RefreshCw, 
  Shield, Key, Link as LinkIcon, Lock, Globe, ExternalLink, Zap
} from 'lucide-react';

// --- CẤU HÌNH FIREBASE ---
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

// --- Helper Functions ---
const generateRandomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('vi-VN');
  } catch (e) { return '...'; }
};

const getTodayString = () => new Date().toISOString().split('T')[0];

// --- COMPONENT SIDEBAR ---
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
          {userData?.email ? userData.email[0].toUpperCase() : 'K'}
        </div>
        <div className="overflow-hidden">
          <p className="font-medium truncate text-sm">{userData?.email || 'Khách vãng lai'}</p>
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
      <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        <Mail size={20} /> <span>Hòm thư</span>
      </button>
      <button onClick={() => { setView('history'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'history' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        <History size={20} /> <span>Lịch sử</span>
      </button>
      {userData?.email && (
        <button onClick={() => { setView('profile'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'profile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <User size={20} /> <span>Tài khoản</span>
        </button>
      )}
    </nav>

    <div className="p-4 border-t border-gray-800">
      <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
        <LogOut size={20} /> <span>{userData?.email ? 'Đăng xuất' : 'Thoát chế độ khách'}</span>
      </button>
    </div>
  </div>
);

// --- COMPONENT AUTH SCREEN (Đã cập nhật) ---
const AuthScreen = ({ email, setEmail, password, setPassword, loading, isRegistering, setIsRegistering, handleAuth, handleAnonymous, handleRestoreByKey, restoreKeyInput, setRestoreKeyInput, error }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">CloudMail Pro</h1>
        <p className="text-gray-400 text-sm">Dịch vụ Email ẩn danh tốt nhất</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">{error}</div>}

      {/* Phần 1: Khôi phục bằng API Key */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <label className="block text-xs font-bold text-yellow-500 uppercase mb-2">Truy cập nhanh bằng API Key</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 outline-none"
            placeholder="Nhập Key (ví dụ: key_abc...)"
            value={restoreKeyInput}
            onChange={(e) => setRestoreKeyInput(e.target.value)}
          />
          <button 
            onClick={handleRestoreByKey}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            Vào
          </button>
        </div>
      </div>

      {/* Phần 2: Đăng nhập thường */}
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
          <input type="email" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vidu.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Mật khẩu</label>
          <input type="password" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">
          {loading ? 'Đang xử lý...' : (isRegistering ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập')}
        </button>
      </form>

      {/* Phần 3: Chuyển đổi và Dùng thử */}
      <div className="mt-4 flex flex-col gap-3 text-center">
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-400 hover:text-blue-300">
          {isRegistering ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký mới'}
        </button>
        
        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">HOẶC</span>
            <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <button 
          onClick={handleAnonymous}
          disabled={loading}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Zap size={18} className="text-yellow-400" /> Dùng ngay không cần đăng ký
        </button>
        <p className="text-xs text-gray-500">Vẫn giới hạn 10 mail/ngày theo thiết bị</p>
      </div>
    </div>
  </div>
);

const Dashboard = ({ loading, handleCreateMailbox, error, successMsg, currentMailbox }) => (
  <div className="p-4 max-w-4xl mx-auto space-y-6">
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Globe className="text-blue-400" /> Hệ thống Mail {DOMAIN_NAME}</h2>
      <div className="mb-4">
          <button onClick={handleCreateMailbox} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-[0.99]">
            {loading ? <RefreshCw className="animate-spin" /> : <Mail size={24} />} <span className="text-lg">Tạo Email Ngẫu Nhiên Mới</span>
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">Hệ thống tự động nhận diện Facebook, TikTok...</p>
      </div>
      {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      {successMsg && <p className="text-green-400 text-sm mt-2 text-center">{successMsg}</p>}
    </div>
    {currentMailbox ? (
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
             <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">API Key (Mã khôi phục)</label>
             <div className="flex items-center gap-2 mt-1">
               <code className="flex-1 bg-gray-950 p-2 rounded-lg text-yellow-400 font-mono text-sm border border-gray-700 truncate">{currentMailbox.apiKey}</code>
               <button onClick={() => { navigator.clipboard.writeText(currentMailbox.apiKey); alert("Đã copy Key"); }} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"><Copy size={16} /></button>
             </div>
           </div>
           <div className="group relative">
             <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Magic Link</label>
             <div className="flex items-center gap-2 mt-1">
               <code className="flex-1 bg-gray-950 p-2 rounded-lg text-blue-400 font-mono text-sm border border-gray-700 truncate">{currentMailbox.magicLink}</code>
               <button onClick={() => { navigator.clipboard.writeText(currentMailbox.magicLink); alert("Đã copy Link"); }} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"><Copy size={16} /></button>
             </div>
           </div>
         </div>
         <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
           <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="animate-spin text-blue-500 opacity-50"/>
              <p>Đang chờ tin nhắn đến...</p>
           </div>
         </div>
      </div>
    ) : (
      <div className="text-center text-gray-500 py-10">
        <p>Chưa có mail nào được chọn.</p>
        <p className="text-xs">Hãy tạo mới hoặc chọn từ lịch sử.</p>
      </div>
    )}
  </div>
);

const HistoryView = ({ mailHistory, onSelectMail }) => (
  <div className="p-4 max-w-5xl mx-auto">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><History className="text-purple-400" /> Lịch sử</h2>
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-900 text-gray-200 uppercase font-bold text-xs">
            <tr><th className="px-6 py-4">Hành động</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">API Key</th><th className="px-6 py-4">Ngày tạo</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {mailHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onSelectMail(item)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={12} /> Mở Mail
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-300 font-mono">{item.email}</td>
                <td className="px-6 py-4 font-mono">{item.apiKey.substring(0,8)}...</td>
                <td className="px-6 py-4 text-xs">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
            {mailHistory.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Chưa có lịch sử.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ProfileView = ({ userData, newPassword, setNewPassword, handleUpdatePassword, successMsg }) => (
  <div className="p-4 max-w-2xl mx-auto space-y-6">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><User className="text-blue-400" /> Tài khoản</h2>
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <div className="flex items-center gap-4 mb-6">
         <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
           {userData?.email ? userData.email[0].toUpperCase() : 'K'}
         </div>
         <div>
           <h3 className="text-xl font-bold text-white">{userData?.email || 'Khách vãng lai'}</h3>
           <p className="text-sm text-gray-400">{userData?.role === 'admin' ? '🛡️ Admin VIP' : '👤 Thành viên'}</p>
         </div>
      </div>
      <div className="bg-gray-900/50 p-4 rounded-lg">
         <p className="text-gray-500 text-xs uppercase font-bold">Giới hạn hôm nay</p>
         <p className={`font-mono text-lg ${userData?.dailyCount >= 10 ? 'text-red-500' : 'text-green-500'}`}>{userData?.dailyCount || 0} / {userData?.role === 'admin' ? '∞' : '10'}</p>
      </div>
    </div>
    
    {userData?.email && (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Lock size={18}/> Đổi mật khẩu</h3>
         <div className="flex gap-2">
           <input type="password" placeholder="Nhập mật khẩu mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white outline-none" />
           <button onClick={handleUpdatePassword} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">Lưu</button>
         </div>
         {successMsg && <p className="text-green-400 text-sm mt-2">{successMsg}</p>}
      </div>
    )}
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState('auth');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [restoreKeyInput, setRestoreKeyInput] = useState(''); // Ô nhập Key

  const [currentMailbox, setCurrentMailbox] = useState(null);
  const [mailHistory, setMailHistory] = useState([]);

  // TỰ ĐỘNG CÀI GIAO DIỆN
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
          // Logic cho cả user thường và user ẩn danh
          const userRef = doc(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'profile', 'info');
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, { 
              role: 'user', 
              dailyCount: 0, 
              lastResetDate: getTodayString(), 
              email: currentUser.email || null // Lưu email null nếu là ẩn danh
            });
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
        setUserData(null);
        setMailHistory([]);
        setView('auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Đăng nhập thường
  const handleAuth = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  // Đăng nhập ẩn danh (Khách)
  const handleAnonymous = async () => {
    setError(''); setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) { setError("Lỗi chế độ khách: " + err.message); setLoading(false); }
  };

  // Truy cập bằng API Key
  const handleRestoreByKey = async () => {
    if (!restoreKeyInput.trim()) {
      alert("Vui lòng nhập API Key!");
      return;
    }
    setLoading(true);
    // Logic: Nếu chưa đăng nhập thì đăng nhập ẩn danh trước để vào hệ thống
    // Sau đó giả lập hiển thị mail tương ứng với Key (Trong thực tế cần query DB)
    try {
      if (!user) {
        await signInAnonymously(auth);
      }
      // Giả lập tìm thấy mail
      const recoveredMail = {
        email: `recovered_${Math.floor(Math.random()*1000)}@${DOMAIN_NAME}`,
        apiKey: restoreKeyInput,
        magicLink: `${window.location.origin}?restore=old`,
        service: 'Khôi phục từ Key',
        createdAt: new Date()
      };
      setCurrentMailbox(recoveredMail);
      setView('dashboard');
      alert("Đã khôi phục giao diện mail!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsSidebarOpen(false);
    setCurrentMailbox(null);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    try { await updatePassword(user, newPassword); setSuccessMsg("Đổi mật khẩu OK!"); setNewPassword(''); }
    catch (err) { setError(err.message); }
  };

  const handleCreateMailbox = async () => {
    if (!user || !userData) return;
    const today = getTodayString();
    if (userData.role !== 'admin' && userData.dailyCount >= 10) { setError("Đã hết lượt tạo hôm nay!"); return; }
    
    setLoading(true);
    try {
      const prefix = Math.random().toString(36).substring(7);
      const newMailData = {
        email: `${prefix}@${DOMAIN_NAME}`,
        apiKey: 'key_' + Math.random().toString(36).substring(2),
        createdAt: serverTimestamp(),
        magicLink: `${window.location.origin}?restore=${Math.random().toString(36).substring(7)}`
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

  const handleSelectMailFromHistory = (mailItem) => {
    setCurrentMailbox(mailItem);
    setView('dashboard');
  };

  const navigateToHome = () => { setView('dashboard'); setIsSidebarOpen(false); };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin mr-2" /> Đang khởi động...</div>;

  if (!user) return (
    <AuthScreen 
      email={email} setEmail={setEmail} 
      password={password} setPassword={setPassword} 
      loading={loading} 
      isRegistering={isRegistering} setIsRegistering={setIsRegistering} 
      handleAuth={handleAuth} 
      handleAnonymous={handleAnonymous}
      handleRestoreByKey={handleRestoreByKey}
      restoreKeyInput={restoreKeyInput}
      setRestoreKeyInput={setRestoreKeyInput}
      error={error} 
    />
  );

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
           {view === 'history' && <HistoryView mailHistory={mailHistory} onSelectMail={handleSelectMailFromHistory} />}
           {view === 'profile' && <ProfileView userData={userData} newPassword={newPassword} setNewPassword={setNewPassword} handleUpdatePassword={handleUpdatePassword} successMsg={successMsg} />}
        </div>
      </main>
    </div>
  );
}


