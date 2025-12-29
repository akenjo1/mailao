import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import {
  Menu,
  X,
  User,
  History,
  LogOut,
  Mail,
  Copy,
  Key,
  Shield,
  Zap,
  RefreshCw,
  ExternalLink,
  Lock,
  Inbox,
  Trash2,
} from "lucide-react";

/**
 * ==========================================
 * CẤU HÌNH FIREBASE CỦA BẠN (Thay vào đây)
 * ==========================================
 */
const firebaseConfig = {
  apiKey: "AIzaSyC6MyEVJ7SH7MB6jgx7TW0yx36uy1_JrLc",
  authDomain: "mailao-9cffb.firebaseapp.com",
  projectId: "mailao-9cffb",
  storageBucket: "mailao-9cffb.firebasestorage.app",
  messagingSenderId: "904960606200",
  appId: "1:904960606200:web:96d6aac107d94c1257200d",
};

// Domain của bạn
const MY_DOMAIN = "sogmail.online";

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------
const generateRandomString = (length) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("vi-VN");
};

const getTodayStr = () => new Date().toISOString().split("T")[0];

// -----------------------------------------------------------------------------
// COMPONENT: MÀN HÌNH AUTH (Đăng nhập / Đăng ký)
// -----------------------------------------------------------------------------
const AuthScreen = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(""); // Dùng cho cả Username/Email login
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [regUsername, setRegUsername] = useState(""); // Chỉ dùng khi đăng ký
  const [regEmail, setRegEmail] = useState(""); // Email khôi phục
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (password !== confirmPass) throw new Error("Mật khẩu xác nhận không khớp");
        // Firebase Auth yêu cầu email, ta dùng regEmail để đăng ký
        const cred = await createUserWithEmailAndPassword(auth, regEmail, password);
        // Lưu username vào profile
        await updateProfile(cred.user, { displayName: regUsername });
        // Tạo doc user trong Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          username: regUsername,
          email: regEmail,
          role: "user", // Mặc định là user
          dailyCount: 0,
          lastReset: getTodayStr(),
          createdAt: serverTimestamp(),
        });
      } else {
        // Đăng nhập: Firebase yêu cầu Email, nếu user nhập username cần xử lý mapping (ở đây giả sử nhập email)
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Vui lòng nhập Email vào ô tài khoản để nhận link đổi mật khẩu.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch (err) {
      setError("Lỗi gửi mail: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">CloudMail Simple</h1>
          <p className="text-gray-400 text-sm">Hệ thống mail ảo siêu tốc</p>
        </div>

        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}
        {resetSent && <div className="bg-green-900/50 text-green-200 p-3 rounded mb-4 text-sm">Đã gửi link đổi mật khẩu vào email!</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isRegister ? (
            <>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Email đăng nhập"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Tên tài khoản (Username)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
              <input
                type="email"
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Email (để khôi phục mật khẩu)"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                placeholder="Xác nhận mật khẩu"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all"
          >
            {loading ? "Đang xử lý..." : isRegister ? "Đăng Ký" : "Đăng Nhập"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-400 font-bold hover:underline">
              {isRegister ? "Đăng nhập ngay" : "Đăng ký ngay"}
            </button>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-500">Hoặc</span></div>
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="text-yellow-400" size={20} /> Sử dụng ngay (Guest)
          </button>
          <p className="text-[10px] text-gray-500 mt-2">Guest giới hạn 10 mail/ngày. Dữ liệu xóa sau 24h.</p>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// MAIN APP COMPONENT
// -----------------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(null); // Firebase Auth User
  const [userProfile, setUserProfile] = useState(null); // Firestore User Data
  const [view, setView] = useState("home"); // home, profile, history
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Mailbox State
  const [mailName, setMailName] = useState("");
  const [currentMail, setCurrentMail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [historyList, setHistoryList] = useState([]);

  // Load User & Profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        // Realtime listener cho profile để check quyền admin/quota ngay lập tức
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            // Guest hoặc user mới chưa có doc
            const defaultProfile = {
              username: u.isAnonymous ? "Guest" : u.displayName,
              role: "user",
              dailyCount: 0,
              lastReset: getTodayStr(),
            };
            setDoc(userRef, defaultProfile, { merge: true });
            setUserProfile(defaultProfile);
          }
        });
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Kiểm tra Magic Link khi load trang
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (key) {
      restoreMailbox(key);
      // Xóa param khỏi URL cho đẹp
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Load Inbox Realtime (QUAN TRỌNG: Đây là chỗ giúp Web tự đọc mail)
  useEffect(() => {
    if (!currentMail) {
      setMessages([]);
      return;
    }

    // Lắng nghe collection 'messages' có API Key tương ứng
    const q = query(
      collection(db, "messages"),
      where("apiKey", "==", currentMail.apiKey),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentMail]);

  // Load History
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "mailboxes"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data());
      setHistoryList(list);
    });
    return () => unsub();
  }, [user]);

  // --- LOGIC CHỨC NĂNG ---

  const handleCreateMail = async (customName = null) => {
    if (!user || !userProfile) return;

    // 1. Check Quota (Nếu không phải Admin)
    if (userProfile.role !== "admin") {
      const today = getTodayStr();
      if (userProfile.lastReset !== today) {
        // Reset ngày mới
        await setDoc(doc(db, "users", user.uid), { dailyCount: 0, lastReset: today }, { merge: true });
      } else if (userProfile.dailyCount >= 10) {
        alert("Bạn đã hết lượt tạo mail hôm nay (10/10). Hãy nâng cấp hoặc đợi ngày mai.");
        return;
      }
    }

    // 2. Tạo tên mail
    let emailPrefix = customName ? customName.trim().replace(/[^a-z0-9._-]/g, "") : generateRandomString(8);
    if (customName && emailPrefix.length < 3) {
      alert("Tên mail quá ngắn hoặc chứa ký tự đặc biệt.");
      return;
    }
    // Nếu random để tránh trùng lặp
    if (!customName) emailPrefix += generateRandomString(2);
    
    const email = `${emailPrefix}@${MY_DOMAIN}`;
    const apiKey = generateRandomString(20); // API Key này dùng để định danh mailbox
    const magicLink = `${window.location.origin}?key=${apiKey}`;

    const newMailbox = {
      email,
      apiKey,
      magicLink,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      serviceDetected: "Chưa có", // Placeholder
    };

    try {
      // Lưu vào Firestore
      // Dùng apiKey làm Document ID để dễ tìm
      await setDoc(doc(db, "mailboxes", apiKey), newMailbox);

      // Tăng count (nếu không phải admin)
      if (userProfile.role !== "admin") {
        await setDoc(doc(db, "users", user.uid), { dailyCount: userProfile.dailyCount + 1 }, { merge: true });
      }

      setCurrentMail(newMailbox);
      setMailName(""); // Reset input
      setView("home");
    } catch (e) {
      console.error(e);
      alert("Lỗi tạo mail: " + e.message);
    }
  };

  const restoreMailbox = async (key) => {
    if (!key) return;
    try {
      const docRef = doc(db, "mailboxes", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCurrentMail(docSnap.data());
        setView("home");
      } else {
        alert("Không tìm thấy Mailbox với Key này.");
      }
    } catch (e) {
      alert("Lỗi khôi phục: " + e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // --- RENDER ---

  if (!user) return <AuthScreen onLoginSuccess={() => {}} />;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Mail size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {MY_DOMAIN}
          </h1>
        </div>
        
        <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-gray-700 rounded">
          <Menu size={24} />
        </button>
      </header>

      {/* SIDEBAR MENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div className="w-72 bg-gray-800 h-full shadow-2xl p-5 border-l border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)}><X size={24} className="text-gray-400 hover:text-white" /></button>
            </div>

            <nav className="flex-1 space-y-2">
              <button onClick={() => { setView("home"); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded ${view === 'home' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                <Inbox size={18} /> Trang chủ
              </button>
              <button onClick={() => { setView("profile"); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded ${view === 'profile' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                <User size={18} /> Thông tin cá nhân
              </button>
              <button onClick={() => { setView("history"); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded ${view === 'history' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                <History size={18} /> Lịch sử tạo mail
              </button>
            </nav>

            <div className="border-t border-gray-700 pt-4">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-gray-700 rounded">
                <LogOut size={18} /> Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">

        {/* --- VIEW: HOME --- */}
        {view === "home" && (
          <>
            {/* Control Panel */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
              <div className="flex flex-col md:flex-row gap-3 mb-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập tên mail..."
                    value={mailName}
                    onChange={(e) => setMailName(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 text-white focus:border-blue-500 outline-none"
                  />
                  <button onClick={() => handleCreateMail(mailName)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded font-medium whitespace-nowrap">
                    Tạo Tên
                  </button>
                </div>
                <button onClick={() => handleCreateMail(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 md:py-0 rounded font-medium flex items-center justify-center gap-2">
                   <RefreshCw size={16} /> Tạo Ngẫu Nhiên
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1 font-bold">KHÔI PHỤC MAIL CŨ (API KEY):</p>
                <div className="flex gap-2">
                  <input 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Dán API Key vào đây..."
                    className="flex-1 bg-gray-900 text-xs p-2 rounded border border-gray-600"
                  />
                  <button onClick={() => restoreMailbox(apiKeyInput)} className="bg-green-600 text-white px-3 rounded text-xs font-bold">
                    Khôi phục
                  </button>
                </div>
              </div>
            </div>

            {/* Current Mail Info */}
            {currentMail && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-800 border border-blue-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 bg-blue-600 text-xs font-bold rounded-bl-lg">Active</div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold">EMAIL ĐANG DÙNG</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-green-400 tracking-wide break-all">{currentMail.email}</span>
                      <button onClick={() => { navigator.clipboard.writeText(currentMail.email); alert("Đã copy Email"); }} className="text-gray-400 hover:text-white"><Copy size={18}/></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase">API Key (Lưu lại để khôi phục)</label>
                      <div className="flex items-center gap-2">
                        <code className="text-yellow-500 text-xs truncate flex-1">{currentMail.apiKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(currentMail.apiKey); alert("Đã copy API Key"); }}><Copy size={14} className="text-gray-500 hover:text-white"/></button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Magic Link (Truy cập nhanh)</label>
                      <div className="flex items-center gap-2">
                        <code className="text-blue-400 text-xs truncate flex-1">{currentMail.magicLink}</code>
                        <a href={currentMail.magicLink} target="_blank" rel="noreferrer"><ExternalLink size={14} className="text-gray-500 hover:text-white"/></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inbox */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-300">
                <Inbox size={20} /> Hộp thư đến {messages.length > 0 && <span className="text-xs bg-red-500 px-2 py-0.5 rounded-full text-white">{messages.length}</span>}
              </h3>

              {!currentMail ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700 text-gray-500">
                  Hãy tạo hoặc khôi phục một mail để xem hộp thư.
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700 text-gray-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin-slow" size={24} />
                  Chưa có thư mới... (Tự động cập nhật)
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all shadow-sm group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-blue-300">{msg.from}</div>
                        <div className="text-xs text-gray-500">{formatDate(msg.createdAt)}</div>
                      </div>
                      <div className="font-semibold text-white mb-2">{msg.subject}</div>
                      <div className="bg-gray-900 p-3 rounded text-gray-300 text-sm whitespace-pre-wrap break-words font-mono">
                        {msg.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- VIEW: PROFILE --- */}
        {view === "profile" && userProfile && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><User /> Thông tin cá nhân</h2>
            
            <div className="flex items-center gap-4 border-b border-gray-700 pb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {userProfile.username ? userProfile.username[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="text-xl font-bold">{userProfile.username}</div>
                <div className="text-gray-400 text-sm">{userProfile.email}</div>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${userProfile.role === 'admin' ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'}`}>
                    {userProfile.role === 'admin' ? 'Admin (Unlimited)' : 'Thành viên'}
                  </span>
                  {userProfile.role !== 'admin' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 border border-gray-600">
                      Hôm nay: {userProfile.dailyCount}/10
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Lock size={18} /> Đổi mật khẩu</h3>
              <p className="text-sm text-gray-400">Hệ thống sử dụng cơ chế gửi mail xác nhận để đảm bảo an toàn.</p>
              
              <button 
                onClick={async () => {
                   if(user.isAnonymous) { alert("Tài khoản Guest không thể đổi mật khẩu."); return; }
                   if(!user.email) { alert("Không tìm thấy email."); return; }
                   try {
                     await sendPasswordResetEmail(auth, user.email);
                     alert(`Đã gửi mail đổi mật khẩu vào ${user.email}. Vui lòng kiểm tra hộp thư.`);
                   } catch(e) { alert("Lỗi: " + e.message); }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold"
              >
                Gửi link đổi mật khẩu qua Email
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {view === "history" && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6"><History /> Lịch sử tạo mail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-700">
                    <th className="p-3">EMAIL</th>
                    <th className="p-3">API KEY / LINK</th>
                    <th className="p-3">NGÀY TẠO</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {historyList.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                      <td className="p-3 font-mono text-green-400">{item.email}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <code className="text-xs text-yellow-500 bg-gray-900 px-1 rounded w-max max-w-[150px] truncate">{item.apiKey}</code>
                          <a href={item.magicLink} target="_blank" className="text-xs text-blue-400 hover:underline truncate w-max max-w-[150px]">{item.magicLink}</a>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                  {historyList.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-gray-500">Chưa có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}


