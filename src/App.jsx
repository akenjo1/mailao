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
  Shield, Key, Link as LinkIcon, Lock, Globe, ExternalLink, Zap, ArrowRight, Inbox
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
} catch (e) { console.error("Lỗi Firebase:", e); }

// --- Helper Functions ---
const generateRandomString = (length) => {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = ''; for (let i = 0; i < length; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r;
};
const formatDate = (date) => {
  if (!date) return ''; try { const d = date.toDate ? date.toDate() : new Date(date); return d.toLocaleString('vi-VN'); } catch (e) { return '...'; }
};
const getTodayString = () => new Date().toISOString().split('T')[0];

// --- SIDEBAR ---
const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, userData, view, setView, handleLogout, navigateToHome, handleRestoreSidebar }) => {
  const [sidebarKey, setSidebarKey] = useState('');
  const onRestoreSubmit = () => { if (sidebarKey.trim()) { handleRestoreSidebar(sidebarKey); setSidebarKey(''); setIsSidebarOpen(false); } };
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto md:flex md:flex-col shadow-xl border-r border-gray-800`}>
      <div className="p-6 flex justify-between items-center border-b border-gray-800">
        <h1 onClick={navigateToHome} className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">CloudMail Pro</h1>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
      </div>
      <div className="p-4 border-b border-gray-800 bg-gray-800/50">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">{userData?.email ? userData.email[0].toUpperCase() : 'K'}</div>
          <div className="overflow-hidden">
            <p className="font-medium truncate text-sm">{userData?.email || 'Khách vãng lai'}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">{userData?.role === 'admin' ? <Shield size={10} className="text-yellow-400"/> : <User size={10}/>} {userData?.role === 'admin' ? 'Admin VIP' : 'Thành viên'}</p>
          </div>
        </div>
        {userData?.role !== 'admin' && <div className="text-xs text-gray-400 mt-2 mb-2">Hôm nay: <span className={userData?.dailyCount >= 10 ? 'text-red-400' : 'text-green-400'}>{userData?.dailyCount || 0}/10</span></div>}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <label className="text-[10px] uppercase font-bold text-yellow-500 mb-1 block">Nhập Key Khôi Phục</label>
          <div className="flex gap-1">
            <input type="text" placeholder="Dán mã key..." className="w-full bg-gray-950 text-xs px-2 py-1.5 rounded border border-gray-600 focus:border-yellow-500 outline-none text-white" value={sidebarKey} onChange={(e) => setSidebarKey(e.target.value)} />
            <button onClick={onRestoreSubmit} className="bg-yellow-600 hover:bg-yellow-500 text-white px-2 rounded"><ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Mail size={20} /> <span>Hòm thư</span></button>
        <button onClick={() => { setView('history'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'history' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><History size={20} /> <span>Lịch sử</span></button>
        {userData?.email && <button onClick={() => { setView('profile'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'profile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><User size={20} /> <span>Tài khoản</span></button>}
      </nav>
      <div className="p-4 border-t border-gray-800"><button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><LogOut size={20} /> <span>Thoát</span></button></div>
    </div>
  );
};

// --- AUTH SCREEN ---
const AuthScreen = ({ email, setEmail, password, setPassword, loading, isRegistering, setIsRegistering, handleAuth, handleAnonymous, handleRestoreByKey, restoreKeyInput, setRestoreKeyInput, error }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
      <div className="text-center mb-6"><h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">CloudMail Pro</h1><p className="text-gray-400 text-sm">Dịch vụ Email ẩn danh tốt nhất</p></div>
      {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">{error}</div>}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <label className="block text-xs font-bold text-yellow-500 uppercase mb-2">Truy cập nhanh bằng API Key</label>
        <div className="flex gap-2">
          <input type="text" className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Nhập Key..." value={restoreKeyInput} onChange={(e) => setRestoreKeyInput(e.target.value)} />
          <button onClick={handleRestoreByKey} disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50">Vào</button>
        </div>
      </div>
      <form onSubmit={handleAuth} className="space-y-4">
        <input type="email" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vidu.com" />
        <input type="password" required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">{loading ? '...' : (isRegistering ? 'Đăng Ký' : 'Đăng Nhập')}</button>
      </form>
      <div className="mt-4 flex flex-col gap-3 text-center">
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-400 hover:text-blue-300">{isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Đăng ký mới'}</button>
        <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-700"></div><span className="flex-shrink-0 mx-4 text-gray-500 text-xs">HOẶC</span><div className="flex-grow border-t border-gray-700"></div></div>
        <button onClick={handleAnonymous} disabled={loading} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"><Zap size={18} className="text-yellow-400" /> Dùng ngay không cần đăng ký</button>
      </div>
    </div>
  </div>
);

// --- DASHBOARD (CẬP NHẬT: HIỂN THỊ LIST MAIL) ---
const Dashboard = ({ loading, handleCreateMailbox, handleRestoreByKey, error, successMsg, currentMailbox, messages }) => {
  const [keyInput, setKeyInput] = useState('');
  const onRestore = () => { if(keyInput.trim()) { handleRestoreByKey(keyInput); setKeyInput(''); } };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Globe className="text-blue-400" /> Hệ thống Mail {DOMAIN_NAME}</h2>
        <div className="mb-6">
            <button onClick={handleCreateMailbox} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transform active:scale-[0.99] transition-all">
              {loading ? <RefreshCw className="animate-spin" /> : <Mail size={24} />} <span className="text-lg">Tạo Email Ngẫu Nhiên Mới</span>
            </button>
        </div>
        <div className="pt-6 border-t border-gray-700">
            <label className="block text-sm font-bold text-yellow-500 mb-2 flex items-center gap-2"><Key size={16} /> TRUY CẬP LẠI MAIL CŨ</label>
            <div className="flex gap-2">
                <input type="text" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Dán mã API Key..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-yellow-500 outline-none" />
                <button onClick={onRestore} disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"><ArrowRight size={20} /> <span className="hidden sm:inline">Truy cập</span></button>
            </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-4 text-center bg-red-900/20 p-2 rounded">{error}</p>}
        {successMsg && <p className="text-green-400 text-sm mt-4 text-center bg-green-900/20 p-2 rounded">{successMsg}</p>}
      </div>

      {currentMailbox ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl animate-fade-in">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Hòm thư đang hoạt động</h3>
             <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 flex items-center gap-1"><Globe size={10} /> {DOMAIN_NAME}</span>
           </div>
           
           <div className="grid md:grid-cols-2 gap-4 mb-6">
             <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
               <label className="text-[10px] text-gray-500 font-bold uppercase">Email</label>
               <div className="flex items-center justify-between">
                 <code className="text-green-400 font-mono text-sm truncate mr-2">{currentMailbox.email}</code>
                 <button onClick={() => navigator.clipboard.writeText(currentMailbox.email)}><Copy size={14} className="text-gray-400 hover:text-white"/></button>
               </div>
             </div>
             <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
               <label className="text-[10px] text-gray-500 font-bold uppercase">API Key (Lưu lại để dùng sau)</label>
               <div className="flex items-center justify-between">
                 <code className="text-yellow-400 font-mono text-sm truncate mr-2">{currentMailbox.apiKey}</code>
                 <button onClick={() => navigator.clipboard.writeText(currentMailbox.apiKey)}><Copy size={14} className="text-gray-400 hover:text-white"/></button>
               </div>
             </div>
           </div>

           <div className="border-t border-gray-700 pt-6">
             <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Inbox size={18} /> Hộp thư đến</h4>
             {messages.length === 0 ? (
               <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-gray-700 border-dashed">
                 <div className="animate-pulse text-gray-600 mb-2"><Mail size={32} className="mx-auto" /></div>
                 <p className="text-gray-500 text-sm">Chưa có tin nhắn mới...</p>
                 <p className="text-gray-600 text-xs">Đang lắng nghe Cloudflare...</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {messages.map((msg, idx) => (
                   <div key={idx} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <span className="font-bold text-blue-300 text-sm">{msg.from}</span>
                       <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                     </div>
                     <h5 className="text-white font-bold text-sm mb-1">{msg.subject}</h5>
                     <p className="text-gray-300 text-xs line-clamp-2">{msg.body}</p>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-10"><p>Chưa có mail nào được chọn.</p></div>
      )}
    </div>
  );
};

// --- HISTORY & PROFILE (Giữ nguyên) ---
const HistoryView = ({ mailHistory, onSelectMail }) => (
  <div className="p-4 max-w-5xl mx-auto">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><History className="text-purple-400" /> Lịch sử</h2>
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-900 text-gray-200 uppercase font-bold text-xs"><tr><th className="px-6 py-4">Hành động</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">API Key</th></tr></thead>
          <tbody className="divide-y divide-gray-700">
            {mailHistory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4"><button onClick={() => onSelectMail(item)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold"><ExternalLink size={12} /> Mở</button></td>
                <td className="px-6 py-4 font-mono">{item.email}</td><td className="px-6 py-4 font-mono">{item.apiKey.substring(0,8)}...</td>
              </tr>
            ))}
            {mailHistory.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center">Trống.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ProfileView = ({ userData, newPassword, setNewPassword, handleUpdatePassword, successMsg }) => (
  <div className="p-4 max-w-2xl mx-auto space-y-6">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><User className="text-blue-400" /> Tài khoản</h2>
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="text-xl font-bold text-white mb-2">{userData?.email || 'Khách'}</div>
      <div className="text-sm text-gray-400">{userData?.role === 'admin' ? '🛡️ Admin VIP' : '👤 Thành viên'}</div>
      <div className="mt-4 p-4 bg-gray-900 rounded">Hôm nay: {userData?.dailyCount || 0}/10</div>
    </div>
    {userData?.email && <div className="bg-gray-800 rounded-xl p-6 border border-gray-700"><h3 className="font-bold text-white mb-4">Đổi mật khẩu</h3><div className="flex gap-2"><input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white"/><button onClick={handleUpdatePassword} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Lưu</button></div>{successMsg && <p className="text-green-400 mt-2 text-sm">{successMsg}</p>}</div>}
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
  const [restoreKeyInput, setRestoreKeyInput] = useState('');
  const [currentMailbox, setCurrentMailbox] = useState(null);
  const [mailHistory, setMailHistory] = useState([]);
  
  // State mới cho danh sách tin nhắn
  const [messages, setMessages] = useState([]);

  // Auto Tailwind
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // Auth & User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'profile', 'info');
          const snap = await getDoc(userRef);
          if (!snap.exists()) await setDoc(userRef, { role: 'user', dailyCount: 0, lastResetDate: getTodayString(), email: currentUser.email || null });
          onSnapshot(userRef, (doc) => setUserData(doc.data()));
          const historyRef = collection(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'history');
          const q = query(historyRef, orderBy('createdAt', 'desc'));
          onSnapshot(q, (snapshot) => setMailHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
          setView('dashboard');
        } catch (e) { console.error(e); }
      } else {
        setUserData(null); setMailHistory([]); setView('auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe Tin nhắn mới khi có Hòm thư
  useEffect(() => {
    if (!currentMailbox) {
      setMessages([]);
      return;
    }
    // Query vào collection messages public dựa trên email
    // Path: artifacts/cloudmail-pro-production/public/data/emails/{email}/messages
    const messagesRef = collection(db, 'artifacts', APP_ID_DB, 'public', 'data', 'emails', currentMailbox.email, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMsgs);
    });
    return () => unsubscribe();
  }, [currentMailbox]);

  const handleAuth = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { if (isRegistering) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError(err.message); setLoading(false); } };
  const handleAnonymous = async () => { setError(''); setLoading(true); try { await signInAnonymously(auth); } catch (err) { setError(err.message); setLoading(false); } };
  
  const handleRestoreByKey = async (keyInput) => {
    const key = keyInput || restoreKeyInput;
    if (!key.trim()) { alert("Nhập Key!"); return; }
    setLoading(true);
    try {
      if (!user) await signInAnonymously(auth);
      // Tìm trong history của user hiện tại xem có key này không (hoặc giả lập nếu demo)
      // Ở đây ta giả lập khôi phục lại object mailbox từ key
      // Cần lưu ý: Nếu muốn khôi phục thật, phải lưu email vào DB mapping với Key.
      // Demo logic:
      const recoveredMail = {
        email: `recovered_${key.substring(0,5)}@${DOMAIN_NAME}`, // Trong thực tế phải fetch từ DB
        apiKey: key,
        magicLink: `${window.location.origin}?restore=old`,
        createdAt: new Date()
      };
      setCurrentMailbox(recoveredMail);
      setView('dashboard');
      setSuccessMsg("Khôi phục mail thành công!");
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleLogout = async () => { await signOut(auth); setIsSidebarOpen(false); setCurrentMailbox(null); };
  const handleUpdatePassword = async () => { if (!newPassword) return; try { await updatePassword(user, newPassword); setSuccessMsg("OK!"); } catch (err) { setError(err.message); } };

  const handleCreateMailbox = async () => {
    if (!user || !userData) return;
    if (userData.role !== 'admin' && userData.dailyCount >= 10) { setError("Hết lượt!"); return; }
    setLoading(true);
    try {
      const prefix = generateRandomString(10);
      const newMailData = {
        email: `${prefix}@${DOMAIN_NAME}`,
        apiKey: 'key_' + generateRandomString(20),
        createdAt: serverTimestamp(),
        magicLink: `${window.location.origin}?restore=${generateRandomString(10)}`
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

  const handleSelectMailFromHistory = (mailItem) => { setCurrentMailbox(mailItem); setView('dashboard'); };
  const navigateToHome = () => { setView('dashboard'); setIsSidebarOpen(false); };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin mr-2" /> Loading...</div>;

  if (!user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} loading={loading} isRegistering={isRegistering} setIsRegistering={setIsRegistering} handleAuth={handleAuth} handleAnonymous={handleAnonymous} handleRestoreByKey={() => handleRestoreByKey()} restoreKeyInput={restoreKeyInput} setRestoreKeyInput={setRestoreKeyInput} error={error} />;

  return (
    <div className="flex min-h-screen bg-gray-900 font-sans text-gray-100">
      <div className="md:hidden fixed top-0 w-full bg-gray-900 border-b border-gray-800 z-40 flex items-center justify-between p-4 shadow-lg"><h1 onClick={navigateToHome} className="text-lg font-bold text-blue-400">CloudMail Pro</h1><button onClick={() => setIsSidebarOpen(true)} className="text-white"><Menu /></button></div>
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userData={userData} view={view} setView={setView} handleLogout={handleLogout} navigateToHome={navigateToHome} handleRestoreSidebar={handleRestoreByKey} />
      <main className="flex-1 md:ml-0 pt-16 md:pt-0 overflow-y-auto h-screen bg-gray-900"><div className="p-4 md:p-8">
         {view === 'dashboard' && <Dashboard loading={loading} handleCreateMailbox={handleCreateMailbox} handleRestoreByKey={handleRestoreByKey} error={error} successMsg={successMsg} currentMailbox={currentMailbox} messages={messages} />}
         {view === 'history' && <HistoryView mailHistory={mailHistory} onSelectMail={handleSelectMailFromHistory} />}
         {view === 'profile' && <ProfileView userData={userData} newPassword={newPassword} setNewPassword={setNewPassword} handleUpdatePassword={handleUpdatePassword} successMsg={successMsg} />}
      </div></main>
    </div>
  );
}


