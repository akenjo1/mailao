import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, signInAnonymously 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, query, 
  orderBy, onSnapshot, serverTimestamp, increment, runTransaction, addDoc
} from 'firebase/firestore';
import { 
  Mail, History, User, LogOut, Menu, X, Copy, RefreshCw, 
  Shield, Key, Link as LinkIcon, Lock, Globe, ExternalLink, Zap, ArrowRight, Inbox, AlertTriangle, Trash2
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

const DOMAIN_NAME = "sogmail.online"; // Đã sửa theo yêu cầu
const APP_ID_DB = 'cloudmail-pro-production';

// Khởi tạo Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) { console.error("Lỗi Firebase:", e); }

// Helper
const generateRandomString = (length) => {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = ''; for (let i = 0; i < length; i++) r += c.charAt(Math.floor(Math.random() * c.length)); return r;
};
const formatDate = (date) => {
  if (!date) return '';
  try { 
    // Xử lý cả Timestamp của Firebase và Date thường
    const d = date.toDate ? date.toDate() : new Date(date); 
    return d.toLocaleString('vi-VN'); 
  } catch (e) { return '...'; }
};
const getTodayString = () => new Date().toISOString().split('T')[0];

// --- COMPONENTS ---
const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, userData, view, setView, handleLogout, navigateToHome, handleRestoreSidebar }) => {
  const [sidebarKey, setSidebarKey] = useState('');
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto md:flex md:flex-col shadow-xl border-r border-gray-800`}>
      <div className="p-6 flex justify-between items-center border-b border-gray-800">
        <h1 onClick={navigateToHome} className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">CloudMail Pro</h1>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
      </div>
      <div className="p-4 border-b border-gray-800 bg-gray-800/50">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">{userData?.email ? userData.email[0].toUpperCase() : 'K'}</div>
          <div><p className="font-medium truncate text-sm w-32">{userData?.email || 'Khách'}</p><p className="text-xs text-gray-400">{userData?.role === 'admin' ? 'Admin VIP' : 'Thành viên'}</p></div>
        </div>
        {userData?.role !== 'admin' && <div className="text-xs text-gray-400 mt-2 mb-2">Hôm nay: <span className={userData?.dailyCount >= 10 ? 'text-red-400' : 'text-green-400'}>{userData?.dailyCount || 0}/10</span></div>}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex gap-1">
            <input type="text" placeholder="Nhập Key khôi phục..." className="w-full bg-gray-950 text-xs px-2 py-1.5 rounded border border-gray-600 text-white" value={sidebarKey} onChange={(e) => setSidebarKey(e.target.value)} />
            <button onClick={() => {handleRestoreSidebar(sidebarKey); setSidebarKey('');}} className="bg-yellow-600 text-white px-2 rounded"><ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><Mail size={18} /> Hòm thư</button>
        <button onClick={() => { setView('history'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${view === 'history' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}><History size={18} /> Lịch sử</button>
      </nav>
      <div className="p-4 border-t border-gray-800"><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded"><LogOut size={18} /> Thoát</button></div>
    </div>
  );
};

const AuthScreen = ({ email, setEmail, password, setPassword, loading, isRegistering, setIsRegistering, handleAuth, handleAnonymous, error }) => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700">
      <h1 className="text-3xl font-bold text-center text-blue-400 mb-2">CloudMail Pro</h1>
      <p className="text-gray-400 text-center text-sm mb-6">Mail tạm thời domain {DOMAIN_NAME}</p>
      {error && <div className="mb-4 p-3 bg-red-900/50 text-red-200 text-sm rounded">{error}</div>}
      <form onSubmit={handleAuth} className="space-y-4">
        <input type="email" required className="w-full bg-gray-900 p-3 rounded border border-gray-600 text-white" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" required className="w-full bg-gray-900 p-3 rounded border border-gray-600 text-white" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 p-3 rounded font-bold text-white hover:bg-blue-500">{loading ? '...' : (isRegistering ? 'Đăng Ký' : 'Đăng Nhập')}</button>
      </form>
      <div className="mt-4 text-center space-y-3">
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-400 text-sm">{isRegistering ? 'Đã có tài khoản?' : 'Tạo tài khoản mới'}</button>
        <div className="border-t border-gray-700 pt-3">
          <button onClick={handleAnonymous} disabled={loading} className="w-full bg-gray-700 p-3 rounded font-bold text-white flex justify-center gap-2"><Zap size={18} className="text-yellow-400"/> Dùng ngay (Không cần ĐK)</button>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = ({ loading, handleCreateMailbox, error, successMsg, currentMailbox, messages, handleTestConnection }) => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Globe className="text-blue-400"/> {DOMAIN_NAME}</h2>
      <button onClick={() => handleCreateMailbox()} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center gap-2 transform active:scale-95 transition-all">
        {loading ? <RefreshCw className="animate-spin"/> : <Mail />} LẤY EMAIL NGẪU NHIÊN
      </button>
      {error && <p className="text-red-400 text-center mt-3 text-sm">{error}</p>}
      {successMsg && <p className="text-green-400 text-center mt-3 text-sm">{successMsg}</p>}
    </div>

    {currentMailbox && (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> Mail Đang Hoạt Động</h3>
        <div className="space-y-3">
          <div className="bg-gray-900 p-3 rounded border border-gray-700 flex justify-between">
            <div><p className="text-[10px] text-gray-500 font-bold">EMAIL</p><p className="text-green-400 font-mono text-sm break-all">{currentMailbox.email}</p></div>
            <button onClick={() => navigator.clipboard.writeText(currentMailbox.email)}><Copy size={16} className="text-gray-400"/></button>
          </div>
          <div className="bg-gray-900 p-3 rounded border border-gray-700 flex justify-between">
            <div><p className="text-[10px] text-gray-500 font-bold">KEY KHÔI PHỤC</p><p className="text-yellow-400 font-mono text-sm break-all">{currentMailbox.apiKey}</p></div>
            <button onClick={() => navigator.clipboard.writeText(currentMailbox.apiKey)}><Copy size={16} className="text-gray-400"/></button>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-bold flex gap-2"><Inbox size={18}/> Hộp thư đến</h4>
            <button onClick={handleTestConnection} className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded border border-blue-800 flex gap-1"><Zap size={12}/> Test Cloudflare</button>
          </div>
          
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg text-gray-500">
                <RefreshCw className="mx-auto mb-2 animate-spin" size={24}/>
                <p>Đang chờ thư đến...</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="bg-gray-700 p-4 rounded border border-gray-600 animate-fade-in">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className="font-bold text-blue-300">{msg.from}</span>
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                  <div className="text-white font-bold text-sm mb-2">{msg.subject}</div>
                  <div className="text-gray-300 text-xs bg-gray-800 p-2 rounded whitespace-pre-wrap">{msg.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
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
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentMailbox, setCurrentMailbox] = useState(null);
  const [mailHistory, setMailHistory] = useState([]);
  const [messages, setMessages] = useState([]);

  // 1. Tự động load Tailwind (Fix lỗi giao diện)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // 2. Load Mailbox từ LocalStorage (Fix lỗi F5 mất mail)
  useEffect(() => {
    const savedMail = localStorage.getItem('currentMailbox');
    if (savedMail) {
      try {
        setCurrentMailbox(JSON.parse(savedMail));
      } catch (e) { localStorage.removeItem('currentMailbox'); }
    }
  }, []);

  // 3. Save Mailbox khi thay đổi
  useEffect(() => {
    if (currentMailbox) {
      localStorage.setItem('currentMailbox', JSON.stringify(currentMailbox));
    }
  }, [currentMailbox]);

  // 4. Auth & Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setView('dashboard'); // Vào thẳng Dashboard
        // Load User Info
        const uRef = doc(db, 'artifacts', APP_ID_DB, 'users', u.uid, 'profile', 'info');
        onSnapshot(uRef, (snap) => {
          if (snap.exists()) setUserData(snap.data());
          else setDoc(uRef, { role: 'user', dailyCount: 0, email: u.email || null }, { merge: true });
        });
        // Load History
        const hRef = collection(db, 'artifacts', APP_ID_DB, 'users', u.uid, 'history');
        const q = query(hRef, orderBy('createdAt', 'desc'));
        onSnapshot(q, (s) => setMailHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else {
        setUserData(null);
        setMailHistory([]);
        setView('auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 5. Lắng nghe Tin nhắn (Fix lỗi không nhận mail)
  useEffect(() => {
    if (!currentMailbox) { setMessages([]); return; }
    
    // Đường dẫn chính xác khớp với Worker
    const messagesRef = collection(db, 'artifacts', APP_ID_DB, 'public', 'data', 'emails', currentMailbox.email, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMsgs);
    }, (err) => console.log("Chờ tin nhắn..."));
    return () => unsubscribe();
  }, [currentMailbox]);

  // Actions
  const handleAuth = async (e) => { e.preventDefault(); setLoading(true); try { if (isRegistering) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (e) { setError(e.message); setLoading(false); } };
  const handleAnonymous = async () => { setLoading(true); try { await signInAnonymously(auth); } catch (e) { setError(e.message); setLoading(false); } };
  const handleLogout = async () => { await signOut(auth); localStorage.removeItem('currentMailbox'); setCurrentMailbox(null); setIsSidebarOpen(false); };

  const handleCreateMailbox = async (currentUser = user, currentData = userData) => {
    if (!currentUser) return;
    if (currentData && currentData.role !== 'admin' && currentData.dailyCount >= 10) { setError("Hết lượt hôm nay!"); return; }
    
    setLoading(true); setError('');
    try {
      const prefix = generateRandomString(8); // Random ngắn gọn
      const newKey = 'key_' + generateRandomString(12);
      const newMail = {
        email: `${prefix}@${DOMAIN_NAME}`,
        apiKey: newKey,
        createdAt: serverTimestamp(),
        magicLink: `${window.location.origin}?restore=${newKey}`
      };
      
      const uRef = doc(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'profile', 'info');
      await setDoc(uRef, { dailyCount: increment(1), lastResetDate: getTodayString() }, { merge: true });

      const hRef = doc(collection(db, 'artifacts', APP_ID_DB, 'users', currentUser.uid, 'history'));
      await addDoc(hRef, newMail);
      
      setCurrentMailbox(newMail);
      setSuccessMsg("Tạo thành công!");
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { 
      console.error(e);
      if(e.code === 'permission-denied') setError("Lỗi quyền! Hãy mở khóa Database.");
      else setError("Lỗi tạo: " + e.message); 
    } finally { setLoading(false); }
  };

  const handleRestoreSidebar = async (key) => {
    if(!key) return;
    // Giả lập khôi phục (vì không query ngược được key -> mail trong thiết kế này nếu không loop)
    // Tạm thời user nhập key sẽ coi như tạo 1 session view mới với key đó
    // Lưu ý: User phải nhớ email cũ, ở đây ta chỉ demo khôi phục session
    alert("Tính năng khôi phục đang được nâng cấp. Vui lòng chọn mail từ Lịch sử!");
  };

  const handleTestConnection = async () => {
    if (!currentMailbox) return;
    try {
        await addDoc(collection(db, 'artifacts', APP_ID_DB, 'public', 'data', 'emails', currentMailbox.email, 'messages'), {
            from: 'System Test',
            subject: 'Kiểm tra kết nối',
            body: 'Nếu bạn thấy tin này, Firebase đã nhận được dữ liệu!',
            createdAt: serverTimestamp(),
            isRead: false
        });
    } catch (e) { alert("Lỗi kết nối: " + e.message); }
  };

  if (loading && !user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin mr-2"/> Loading...</div>;

  if (!user) return <AuthScreen {...{handleAuth, handleAnonymous, loading, error, isRegistering, setIsRegistering, email, setEmail, password, setPassword, handleRestoreSidebar}} />;

  return (
    <div className="flex min-h-screen bg-gray-900 font-sans text-gray-100">
      <div className="md:hidden fixed top-0 w-full bg-gray-900 border-b border-gray-800 z-40 flex items-center justify-between p-4 shadow-lg">
        <h1 onClick={() => setView('dashboard')} className="text-lg font-bold text-blue-400">CloudMail Pro</h1>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white"><Menu/></button>
      </div>
      <Sidebar {...{isSidebarOpen, setIsSidebarOpen, userData, view, setView, handleLogout, navigateToHome: () => setView('dashboard'), handleRestoreSidebar}} />
      <main className="flex-1 md:ml-0 pt-16 md:pt-0 p-4 md:p-8 overflow-y-auto h-screen">
        {view === 'dashboard' && <Dashboard {...{loading, handleCreateMailbox: () => handleCreateMailbox(), error, successMsg, currentMailbox, messages, handleTestConnection}} />}
        {view === 'history' && <div className="max-w-4xl mx-auto"><h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><History/> Lịch sử</h2><div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">{mailHistory.map(m => (<div key={m.id} onClick={() => {setCurrentMailbox(m); setView('dashboard');}} className="p-4 border-b border-gray-700 hover:bg-gray-700 cursor-pointer flex justify-between items-center"><span className="text-blue-400 font-mono">{m.email}</span><span className="text-gray-500 text-xs">{formatDate(m.createdAt)}</span></div>))}</div></div>}
      </main>
    </div>
  );
}


