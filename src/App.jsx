import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCMHTdqRyrEeu1qV9c1ycb8bBLsZwggh60",
  authDomain: "my-temp-mail-de60c.firebaseapp.com",
  projectId: "my-temp-mail-de60c",
  storageBucket: "my-temp-mail-de60c.firebasestorage.app",
  messagingSenderId: "466454763740",
  appId: "1:466454763740:web:b7a9563589be2f732bbc19"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const DOMAIN = "adbv.io.vn"; 

// --- CÁC COMPONENT CON ---

// 1. Màn hình Đăng nhập / Đăng ký
function AuthScreen({ onLoginSuccess, onSkip }) {
  const [isLogin, setIsLogin] = useState(true);
  const [inputLogin, setInputLogin] = useState(''); // Username hoặc Email
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewForgot, setViewForgot] = useState(false);

  // Xử lý đăng nhập (Username hoặc Email)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loginEmail = inputLogin;
      // Nếu không phải email (không có @), tìm email từ username
      if (!inputLogin.includes('@')) {
        const q = query(collection(db, "users"), where("username", "==", inputLogin));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw new Error("Tên tài khoản không tồn tại!");
        }
        loginEmail = querySnapshot.docs[0].data().email;
      }
      await signInWithEmailAndPassword(auth, loginEmail, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message.replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (password !== confirmPass) throw new Error("Mật khẩu xác nhận không khớp!");
      
      // Check username tồn tại
      const q = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) throw new Error("Tên tài khoản đã được sử dụng!");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Lưu thông tin user
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        username: username,
        role: 'user',
        createdAt: serverTimestamp()
      });

      await updateProfile(userCredential.user, {
          displayName: username,
          photoURL: `https://ui-avatars.com/api/?name=${username}&background=random`
      });
      
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message.replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleResetPass = async (e) => {
    e.preventDefault();
    if (!email) return setError("Vui lòng nhập Email!");
    try {
        await sendPasswordResetEmail(auth, email);
        setMsg(`Đã gửi link đổi mật khẩu tới ${email}. Vui lòng kiểm tra hộp thư.`);
    } catch (e) { setError(e.message); }
  };

  if (viewForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Quên mật khẩu</h2>
          {msg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleResetPass} className="space-y-4">
            <input type="email" placeholder="Nhập email đã đăng ký" className="w-full p-3 border rounded" value={email} onChange={e=>setEmail(e.target.value)} required />
            <button className="w-full bg-blue-600 text-white p-3 rounded font-bold">Gửi mã xác nhận</button>
            <button type="button" onClick={() => setViewForgot(false)} className="w-full text-gray-500 text-sm">Quay lại đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md fade-in">
        <div className="text-center mb-6">
          <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl mx-auto mb-3">A</div>
          <h1 className="text-2xl font-bold text-gray-800">ADBV Mail</h1>
          <p className="text-gray-500 text-sm">{isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-100">{error}</div>}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tên tài khoản hoặc Email"
              value={inputLogin} onChange={e => setInputLogin(e.target.value)}
            />
            <input 
              type="password" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Mật khẩu"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-200">
              {loading ? "Đang xử lý..." : "Đăng Nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input 
              type="text" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tên tài khoản"
              value={username} onChange={e => setUsername(e.target.value)}
            />
            <input 
              type="email" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input 
              type="password" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Mật khẩu"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <input 
              type="password" required 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Xác nhận mật khẩu"
              value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-200">
              {loading ? "Đang xử lý..." : "Đăng Ký"}
            </button>
          </form>
        )}

        <div className="mt-4 flex justify-between text-sm items-center">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-600 hover:underline font-medium">
            {isLogin ? "Đăng ký tài khoản" : "Đã có tài khoản?"}
          </button>
          {isLogin && <button type="button" onClick={() => setViewForgot(true)} className="text-gray-400 hover:text-gray-600">Quên mật khẩu?</button>}
        </div>

        <div className="mt-6 border-t pt-4 text-center">
          <button onClick={onSkip} className="text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center gap-1 mx-auto transition group">
            Sử dụng không cần đăng nhập <i className="ph ph-arrow-right ml-1 group-hover:translate-x-1 transition"></i>
          </button>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Giới hạn 10 mail/ngày • Xóa sau 24h</p>
        </div>
      </div>
    </div>
  );
}

// 2. Component xem lịch sử
function HistoryView({ db, user }) {
    const [history, setHistory] = useState([]);
    
    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
             // Query lịch sử
             let data = [];
             if (!user) {
                 data = JSON.parse(localStorage.getItem('guestHistory') || '[]');
             } else {
                 const q = query(collection(db, "history"), where("uid", "==", user.uid));
                 const snap = await getDocs(q);
                 data = snap.docs.map(d => d.data());
             }

             // Lấy thêm thông tin "Dịch vụ đã sử dụng" từ inbox
             const enrichedData = await Promise.all(data.map(async (h) => {
                 let services = "Chưa có thư";
                 if (user) {
                     // Query mail để xem ai gửi
                     const mailQ = query(collection(db, "emails"), where("to", "==", h.address));
                     const mailSnap = await getDocs(mailQ);
                     if (!mailSnap.empty) {
                        const senders = new Set(mailSnap.docs.map(m => m.data().from.split('<')[0].trim()));
                        services = Array.from(senders).join(", ") || "Không xác định";
                     }
                 }
                 return { ...h, services };
             }));

             // Sort
             enrichedData.sort((a, b) => {
                 const tA = a.createdAt?.seconds || (new Date(a.createdAt).getTime()/1000) || 0;
                 const tB = b.createdAt?.seconds || (new Date(b.createdAt).getTime()/1000) || 0;
                 return tB - tA;
             });

             if(isMounted) setHistory(enrichedData);
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, [user, db]);

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 fade-in animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <i className="ph ph-clock-counter-clockwise text-blue-600"></i> Lịch sử tạo mail
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-3 rounded-tl-lg">Email</th>
                            <th className="p-3">API Key / Link</th>
                            <th className="p-3">Dịch vụ đã nhận</th>
                            <th className="p-3 rounded-tr-lg">Ngày tạo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">Chưa có lịch sử nào</td></tr>
                        ) : history.map((h, i) => (
                            <tr key={i} className="hover:bg-blue-50/50 transition">
                                <td className="p-3 font-medium text-blue-600">{h.address}</td>
                                <td className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded w-fit">
                                            <span className="font-mono text-[10px] text-gray-600">{h.apiKey}</span>
                                        </div>
                                        <a href={h.link} target="_blank" className="text-xs text-blue-500 hover:underline truncate max-w-[150px] flex items-center gap-1">
                                            <i className="ph ph-link"></i> Link truy cập
                                        </a>
                                    </div>
                                </td>
                                <td className="p-3 text-gray-600 max-w-[200px] truncate" title={h.services}>{h.services}</td>
                                <td className="p-3 text-gray-500 text-xs">
                                    {h.createdAt?.seconds ? new Date(h.createdAt.seconds * 1000).toLocaleString() : (h.createdAt || 'N/A')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 3. Component Profile & Đổi mật khẩu
function ProfileView({ user, userData, toggleAdmin, db, auth }) {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmNewPass, setConfirmNewPass] = useState('');
    const [passMsg, setPassMsg] = useState('');

    const handleChangePassword = async () => {
        if (newPass !== confirmNewPass) return setPassMsg("Mật khẩu xác nhận không khớp!");
        if (newPass.length < 6) return setPassMsg("Mật khẩu phải từ 6 ký tự!");
        
        try {
            // Re-auth logic simplified (User should assume fresh login)
            // Trong thực tế cần hỏi lại current password và dùng reauthenticateWithCredential
            // Ở đây ta gọi update trực tiếp, nếu lỗi sẽ báo.
            await updatePassword(user, newPass);
            setPassMsg("Đổi mật khẩu thành công!");
            setNewPass(''); setConfirmNewPass(''); setCurrentPass('');
        } catch (e) {
            setPassMsg("Lỗi (Cần đăng nhập lại mới đổi được): " + e.message);
        }
    }

    const handleForgotPass = async () => {
        try {
            await sendPasswordResetEmail(auth, user.email);
            alert(`Đã gửi mã/link đổi mật khẩu tới ${user.email}`);
        } catch (e) { alert(e.message); }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 fade-in max-w-2xl mx-auto animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Thông tin tài khoản</h2>
            
            <div className="flex items-start gap-6 mb-8">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} className="w-24 h-24 rounded-full border-4 border-blue-50 shadow-sm" alt="Avatar"/>
                <div className="flex-1 space-y-2">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Tên tài khoản</label>
                        <p className="font-bold text-lg text-gray-800">{userData?.username || "Không xác định"}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Email</label>
                        <p className="text-gray-600">{user.email}</p>
                    </div>
                    <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${userData?.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {userData?.role?.toUpperCase() || "USER"}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Change Password */}
            <div className="mb-8 border-t pt-6">
                <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2"><i className="ph ph-lock-key"></i> Đổi mật khẩu</h3>
                <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                    {passMsg && <div className={`text-sm p-3 rounded font-medium ${passMsg.includes("thành công") ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{passMsg}</div>}
                    
                    <input type="password" placeholder="Mật khẩu hiện tại" className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="password" placeholder="Mật khẩu mới" className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500" value={newPass} onChange={e=>setNewPass(e.target.value)} />
                        <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500" value={confirmNewPass} onChange={e=>setConfirmNewPass(e.target.value)} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <button onClick={handleForgotPass} className="text-sm text-blue-600 hover:underline">Quên mật khẩu? (Gửi mã qua Email)</button>
                        <button onClick={handleChangePassword} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition">
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Zone Demo */}
            <div className="border rounded-xl p-5 bg-yellow-50 border-yellow-100">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><i className="ph ph-crown-simple"></i> Khu vực Admin (Demo)</h3>
                <p className="text-sm text-yellow-700 mb-4">
                    Bạn có thể tự nâng cấp lên Admin để loại bỏ giới hạn tạo mail (10 mail/ngày).
                </p>
                <button 
                    onClick={toggleAdmin}
                    className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition ${userData?.role === 'admin' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                >
                    {userData?.role === 'admin' ? 'Hạ cấp xuống User' : 'Nâng cấp lên Admin Ngay'}
                </button>
            </div>
        </div>
    );
}

// --- COMPONENT CHÍNH ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null);
  
  // States
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  const [view, setView] = useState('HOME'); // HOME, PROFILE, HISTORY
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Mail States
  const [currentAddress, setCurrentAddress] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [restoreKey, setRestoreKey] = useState('');
  
  // Guest System
  const [guestCount, setGuestCount] = useState(0);

  // 1. Kiểm tra trạng thái đăng nhập & Khôi phục phiên làm việc
  useEffect(() => {
    // Load session mail
    const savedMail = JSON.parse(localStorage.getItem('currentSession'));
    if (savedMail) {
        setCurrentAddress(savedMail.address);
        setApiKey(savedMail.apiKey);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthScreen(false);
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
            // Fallback nếu user chưa có data
            setUserData({ username: currentUser.email.split('@')[0], role: 'user' });
        }
      } else {
        setUser(null);
        setUserData(null);
        // Load Guest Count
        const today = new Date().toISOString().split('T')[0];
        const local = JSON.parse(localStorage.getItem('guestLimit') || '{}');
        if (local.date === today) {
            setGuestCount(local.count);
        } else {
            localStorage.setItem('guestLimit', JSON.stringify({ date: today, count: 0 }));
            setGuestCount(0);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Lắng nghe Hộp thư đến
  useEffect(() => {
    if (!currentAddress) return;
    const q = query(collection(db, "emails"), where("to", "==", currentAddress));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const mails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        mails.sort((a, b) => {
            const tA = a.timestamp?.seconds || (new Date(a.timestamp?.timestampValue || 0).getTime()/1000) || 0;
            const tB = b.timestamp?.seconds || (new Date(b.timestamp?.timestampValue || 0).getTime()/1000) || 0;
            return tB - tA; 
        });
        setInbox(mails);
    });
    return () => unsubscribe();
  }, [currentAddress]);

  // --- HÀM XỬ LÝ ---

  const checkLimit = () => {
      // Admin: No limit
      if (user && userData?.role === 'admin') return true;
      // User & Guest: Limit 10
      if (guestCount >= 10) {
          alert("Bạn đã hết giới hạn 10 mail/ngày. Hãy nâng cấp lên Admin!");
          if(!user) setIsAuthScreen(true);
          return false;
      }
      // Increment
      const newCount = guestCount + 1;
      setGuestCount(newCount);
      localStorage.setItem('guestLimit', JSON.stringify({ 
          date: new Date().toISOString().split('T')[0], 
          count: newCount 
      }));
      return true;
  }

  const handleCreateMail = async (customName = null) => {
    if (!checkLimit()) return;

    const name = customName || Math.random().toString(36).substring(7);
    const address = `${name}@${DOMAIN}`;
    const key = 'API-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Save session
    const session = { address, apiKey: key };
    localStorage.setItem('currentSession', JSON.stringify(session));
    
    setCurrentAddress(address);
    setApiKey(key);
    setInbox([]); 

    const historyData = {
        address: address,
        apiKey: key,
        link: `https://${DOMAIN}/?inbox=${key}`,
        createdAt: user ? serverTimestamp() : new Date().toLocaleString(),
        uid: user ? user.uid : 'guest'
    };

    if (user) {
        await addDoc(collection(db, "history"), historyData);
    } else {
        const localHist = JSON.parse(localStorage.getItem('guestHistory') || '[]');
        localHist.unshift(historyData);
        localStorage.setItem('guestHistory', JSON.stringify(localHist));
    }
  };

  const handleRestore = async () => {
      if (!restoreKey) return alert("Vui lòng nhập API Key!");
      
      // Tìm trong history của user hoặc guest
      let found = null;
      
      if (user) {
         // Query firestore (Cần index nếu query where apiKey, ở đây ta query hết history user rồi filter client cho nhanh đỡ lỗi index)
         const q = query(collection(db, "history"), where("uid", "==", user.uid));
         const snap = await getDocs(q);
         const list = snap.docs.map(d => d.data());
         found = list.find(h => h.apiKey === restoreKey);
      } else {
         const localHist = JSON.parse(localStorage.getItem('guestHistory') || '[]');
         found = localHist.find(h => h.apiKey === restoreKey);
      }

      if (found) {
          setCurrentAddress(found.address);
          setApiKey(found.apiKey);
          localStorage.setItem('currentSession', JSON.stringify({ address: found.address, apiKey: found.apiKey }));
          alert(`Đã khôi phục mail: ${found.address}`);
      } else {
          alert("Không tìm thấy API Key này trong lịch sử của bạn!");
      }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('currentSession'); 
    setCurrentAddress(null);
    setApiKey(null);
    setIsAuthScreen(true);
    setView('HOME');
    setMenuOpen(false);
  };

  const toggleAdmin = async () => {
      if (!user || !userData) return;
      const newRole = userData.role === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      setUserData({ ...userData, role: newRole });
      alert(`Đã chuyển quyền thành: ${newRole.toUpperCase()}`);
  };

  // --- RENDER GIAO DIỆN ---
  
  if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div></div>;

  if (isAuthScreen && !user) {
    return <AuthScreen onSkip={() => setIsAuthScreen(false)} onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50">
      
      {/* HEADER */}
      <header className="bg-white shadow-sm h-16 fixed w-full top-0 z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('HOME'); setMenuOpen(false); }}>
            <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">A</div>
            <span className="font-bold text-xl tracking-tight">ADBV<span className="text-blue-600">Mail</span></span>
        </div>

        <div className="flex items-center gap-4">
             {/* Limit Info */}
             <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full border">
                {user && userData?.role === 'admin' ? (
                    <><i className="ph ph-crown-simple text-yellow-600"></i> Admin (Không giới hạn)</>
                ) : (
                    <>Khách/User: {guestCount}/10 hôm nay</>
                )}
             </span>
            
            {/* Hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition relative z-50">
                <i className={`ph ${menuOpen ? 'ph-x' : 'ph-list'} text-2xl text-gray-700`}></i>
            </button>

            {/* Menu */}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 bg-black/10 z-40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)}></div>
                    <div className="absolute top-16 right-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                        {user ? (
                            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex items-center gap-3">
                                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${userData?.username || "User"}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="ava" />
                                <div className="overflow-hidden">
                                    <p className="font-bold text-gray-800 truncate">{userData?.username || "User"}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        ) : (
                             <div className="p-5 bg-gray-50 border-b text-center">
                                 <p className="text-gray-500 text-sm">Bạn đang dùng chế độ Khách</p>
                             </div>
                        )}
                        <nav className="p-2 space-y-1">
                            <button onClick={() => { setView('HOME'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition">
                                <i className="ph ph-house text-lg text-blue-600"></i> Trang chủ
                            </button>
                            {user && (
                                <button onClick={() => { setView('PROFILE'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition">
                                    <i className="ph ph-user-circle text-lg text-purple-600"></i> Thông tin cá nhân
                                </button>
                            )}
                            <button onClick={() => { setView('HISTORY'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition">
                                <i className="ph ph-clock-counter-clockwise text-lg text-orange-600"></i> Lịch sử tạo mail
                            </button>
                            <div className="border-t my-2 border-gray-100"></div>
                            {user ? (
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-medium flex items-center gap-3 transition">
                                    <i className="ph ph-sign-out text-lg"></i> Đăng xuất
                                </button>
                            ) : (
                                <button onClick={() => { handleLogout(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-blue-600 font-medium flex items-center gap-3 transition">
                                    <i className="ph ph-sign-in text-lg"></i> Đăng nhập ngay
                                </button>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mt-20 p-4 max-w-4xl mx-auto w-full pb-20">
        
        {/* VIEW: HOME */}
        {view === 'HOME' && (
            <div className="space-y-6 fade-in">
                
                {/* 1. KHU VỰC TẠO MAIL */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h1 className="text-xl font-bold text-gray-800 mb-4">Tạo Hộp Thư Mới</h1>
                    
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <div className="flex-1 flex shadow-sm rounded-lg group focus-within:ring-2 ring-blue-100 transition">
                            <input 
                                id="customNameInput"
                                type="text" 
                                placeholder="Nhập tên mail..." 
                                className="flex-1 p-3 border border-r-0 border-gray-200 rounded-l-lg outline-none text-gray-700"
                            />
                            <div className="bg-gray-50 border border-l-0 border-gray-200 px-4 flex items-center text-gray-500 font-medium rounded-r-lg">@{DOMAIN}</div>
                        </div>
                        <button 
                            onClick={() => {
                                const val = document.getElementById('customNameInput').value;
                                if(val) handleCreateMail(val);
                                else alert("Vui lòng nhập tên!");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 transition active:scale-95"
                        >
                            Tạo Ngay
                        </button>
                    </div>

                    <button onClick={() => handleCreateMail()} className="w-full bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-medium transition flex items-center justify-center gap-2 active:scale-95">
                        <i className="ph ph-shuffle"></i> Tạo Ngẫu Nhiên
                    </button>
                </div>

                {/* 2. KHU VỰC KHÔI PHỤC (Hiển thị khi chưa có mail) */}
                {!currentAddress && (
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 fade-in">
                        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><i className="ph ph-arrow-u-up-left text-orange-500"></i> Khôi phục hộp thư</h3>
                        <p className="text-sm text-gray-500 mb-3">Nhập API Key để truy cập lại hộp thư cũ của bạn.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Dán mã API Key vào đây..." 
                                className="flex-1 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 ring-orange-100 outline-none transition"
                                value={restoreKey}
                                onChange={e=>setRestoreKey(e.target.value)}
                            />
                            <button onClick={handleRestore} className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-lg font-medium shadow-lg shadow-orange-200">
                                Khôi phục
                            </button>
                        </div>
                     </div>
                )}

                {/* 3. KHU VỰC INFO MAIL & INBOX */}
                {currentAddress && (
                    <div className="fade-in space-y-6">
                        {/* Info Card */}
                        <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition"><i className="ph ph-envelope-open text-9xl text-blue-600"></i></div>
                            <p className="text-blue-600 font-medium mb-1 text-sm uppercase tracking-wider">Địa chỉ Email của bạn</p>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-3xl font-bold text-gray-800 break-all">{currentAddress}</h2>
                                <button onClick={() => { navigator.clipboard.writeText(currentAddress); alert("Đã copy!"); }} className="p-2 bg-white rounded-lg shadow-sm hover:scale-110 transition text-blue-600"><i className="ph ph-copy text-xl"></i></button>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white/80 p-3 rounded-lg border border-blue-100 backdrop-blur-sm">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">API Key (Dùng để khôi phục)</p>
                                    <div className="flex items-center justify-between">
                                        <code className="text-sm font-mono text-gray-700 truncate mr-2">{apiKey}</code>
                                        <button onClick={() => { navigator.clipboard.writeText(apiKey); alert("Đã copy API Key!"); }} className="text-blue-500 hover:text-blue-700"><i className="ph ph-copy"></i></button>
                                    </div>
                                </div>
                                <div className="bg-white/80 p-3 rounded-lg border border-blue-100 backdrop-blur-sm">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Link truy cập trực tiếp</p>
                                    <div className="flex items-center justify-between">
                                        <a href={`https://${DOMAIN}/?inbox=${apiKey}`} target="_blank" className="text-sm text-blue-500 underline truncate mr-2">Mở Link</a>
                                        <button onClick={() => { navigator.clipboard.writeText(`https://${DOMAIN}/?inbox=${apiKey}`); alert("Đã copy Link!"); }} className="text-blue-500 hover:text-blue-700"><i className="ph ph-copy"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inbox */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><i className="ph ph-tray text-lg text-blue-600"></i> Hộp thư đến</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Real-time
                                    </div>
                                    <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition" title="Làm mới"><i className="ph ph-arrows-clockwise text-lg"></i></button>
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                {inbox.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                        <i className="ph ph-envelope-simple-open text-6xl mb-4"></i>
                                        <p className="font-medium">Chưa có thư nào</p>
                                        <p className="text-sm mt-1">Vui lòng đợi...</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-50">
                                        {inbox.map(mail => (
                                            <li key={mail.id} className="p-5 hover:bg-blue-50/50 cursor-pointer transition group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                            {mail.from.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-gray-800">{mail.from}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 group-hover:text-blue-500 whitespace-nowrap ml-2">
                                                        {mail.timestamp?.seconds ? new Date(mail.timestamp.seconds * 1000).toLocaleString() : 'Vừa xong'}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-sm text-gray-700 mb-1 pl-10">{mail.subject}</p>
                                                <p className="text-sm text-gray-500 line-clamp-2 pl-10">{mail.body}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* VIEW: PROFILE */}
        {view === 'PROFILE' && user && userData && (
            <ProfileView user={user} userData={userData} toggleAdmin={toggleAdmin} db={db} auth={auth} />
        )}

        {/* VIEW: HISTORY */}
        {view === 'HISTORY' && (
            <HistoryView db={db} user={user} />
        )}

      </main>
    </div>
  );
}
