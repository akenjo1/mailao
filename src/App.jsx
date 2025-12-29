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
  updatePassword
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
  serverTimestamp 
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPass) throw new Error("Mật khẩu xác nhận không khớp!");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
            displayName: email.split('@')[0],
            photoURL: `https://ui-avatars.com/api/?name=${email}&background=random`
        });
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message.replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleResetPass = async () => {
    if (!email) return setError("Vui lòng nhập Email vào ô bên trên để nhận mã/link đổi mật khẩu!");
    try {
        await sendPasswordResetEmail(auth, email);
        setMsg(`Đã gửi hướng dẫn đổi mật khẩu tới ${email}. Vui lòng kiểm tra hộp thư (cả mục Spam).`);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md fade-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">ADBV Mail</h1>
          <p className="text-gray-500">{isLogin ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}</p>
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm font-medium">{error}</div>}
        {msg && <div className="bg-green-100 text-green-600 p-3 rounded mb-4 text-sm font-medium">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="name@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <input 
                type="password" required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              />
            </div>
          )}

          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-[1.02]">
            {loading ? "Đang xử lý..." : (isLogin ? "Đăng Nhập" : "Đăng Ký")}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setMsg(''); }} className="text-blue-600 hover:underline font-medium">
            {isLogin ? "Tạo tài khoản mới" : "Quay lại đăng nhập"}
          </button>
          {isLogin && <button type="button" onClick={handleResetPass} className="text-gray-500 hover:text-gray-700">Quên mật khẩu?</button>}
        </div>

        <div className="mt-6 border-t pt-4 text-center">
          <button onClick={onSkip} className="text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center gap-1 mx-auto">
            Dùng thử không cần đăng nhập <i className="ph ph-arrow-right"></i>
          </button>
          <p className="text-xs text-gray-400 mt-1">(Giới hạn 10 mail/ngày, xóa sau 24h)</p>
        </div>
      </div>
    </div>
  );
}

// 2. Component xem lịch sử
function HistoryView({ db, user }) {
    const [history, setHistory] = useState([]);
    
    useEffect(() => {
        if (!user) {
            const localHist = JSON.parse(localStorage.getItem('guestHistory') || '[]');
            setHistory(localHist);
            return;
        }

        const q = query(collection(db, "history"), where("uid", "==", user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => d.data());
            data.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });
            setHistory(data);
        }, (error) => console.error("Lỗi đọc lịch sử:", error));
        return () => unsub();
    }, [user, db]);

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 fade-in animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <i className="ph ph-clock-counter-clockwise text-blue-600"></i> Lịch sử tạo mail
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-3">Email</th>
                            <th className="p-3">API Key / Link</th>
                            <th className="p-3">Thời gian</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {history.length === 0 ? (
                            <tr><td colSpan="3" className="p-4 text-center text-gray-400">Chưa có lịch sử nào</td></tr>
                        ) : history.map((h, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-blue-600">{h.address}</td>
                                <td className="p-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit text-gray-600">{h.apiKey}</span>
                                        <a href={h.link} target="_blank" className="text-xs text-blue-500 underline truncate max-w-[150px]">{h.link}</a>
                                    </div>
                                </td>
                                <td className="p-3 text-gray-500">
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
function ProfileView({ user, userData, toggleAdmin }) {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmNewPass, setConfirmNewPass] = useState('');
    const [passMsg, setPassMsg] = useState('');

    const handleChangePassword = async () => {
        if (newPass !== confirmNewPass) return setPassMsg("Mật khẩu xác nhận không khớp!");
        if (newPass.length < 6) return setPassMsg("Mật khẩu phải từ 6 ký tự!");
        
        try {
            // Firebase yêu cầu đăng nhập lại gần đây để đổi pass. 
            // Ở đây ta gọi updatePassword trực tiếp, nếu lỗi auth/requires-recent-login thì cần re-auth (phức tạp)
            // Ta làm đơn giản trước.
            await updatePassword(user, newPass);
            setPassMsg("Đổi mật khẩu thành công!");
            setNewPass(''); setConfirmNewPass('');
        } catch (e) {
            setPassMsg("Lỗi: " + e.message);
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 fade-in max-w-2xl mx-auto animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} className="w-20 h-20 rounded-full border-4 border-blue-50" alt="Avatar"/>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{userData?.username || user.email.split('@')[0]}</h2>
                    <p className="text-gray-500">{user.email}</p>
                    <div className="mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${userData?.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {userData?.role?.toUpperCase() || "USER"}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Change Password */}
            <div className="mb-8 border-t pt-6">
                <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2"><i className="ph ph-lock-key"></i> Đổi mật khẩu</h3>
                <div className="space-y-3 max-w-sm">
                    {passMsg && <div className={`text-sm p-2 rounded ${passMsg.includes("thành công") ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{passMsg}</div>}
                    <input type="password" placeholder="Mật khẩu mới" className="w-full border p-2 rounded outline-none focus:border-blue-500" value={newPass} onChange={e=>setNewPass(e.target.value)} />
                    <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full border p-2 rounded outline-none focus:border-blue-500" value={confirmNewPass} onChange={e=>setConfirmNewPass(e.target.value)} />
                    <button onClick={handleChangePassword} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Lưu mật khẩu mới</button>
                </div>
            </div>

            {/* Admin Zone Demo */}
            <div className="border rounded-xl p-5 bg-yellow-50 border-yellow-100">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><i className="ph ph-crown-simple"></i> Khu vực Admin (Demo)</h3>
                <p className="text-sm text-yellow-700 mb-4">
                    Tự nâng cấp lên Admin để bỏ giới hạn 10 mail/ngày.
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
  
  // States quan trọng
  const [authLoading, setAuthLoading] = useState(true); // Để fix lỗi F5
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  const [view, setView] = useState('HOME'); // HOME, PROFILE, HISTORY
  const [menuOpen, setMenuOpen] = useState(false); // Cho nút 3 gạch
  
  // Mail States
  const [currentAddress, setCurrentAddress] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [restoreKey, setRestoreKey] = useState('');
  
  // Guest System
  const [guestCount, setGuestCount] = useState(0);

  // 1. Kiểm tra trạng thái đăng nhập & Khôi phục phiên làm việc (Fix F5)
  useEffect(() => {
    // Khôi phục mail từ localStorage nếu có
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
          const newData = { 
            role: 'user', 
            email: currentUser.email, 
            username: currentUser.displayName || currentUser.email.split('@')[0],
            createdAt: serverTimestamp()
          };
          await setDoc(userRef, newData);
          setUserData(newData);
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
      setAuthLoading(false); // Tắt loading sau khi check xong
    });
    return () => unsubscribe();
  }, []);

  // 2. Lắng nghe Hộp thư đến (Real-time)
  useEffect(() => {
    if (!currentAddress) return;
    
    const q = query(
        collection(db, "emails"), 
        where("to", "==", currentAddress)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const mails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side
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

  const handleCreateMail = async (customName = null) => {
    // Check giới hạn
    if (!user) {
        if (guestCount >= 10) {
            alert("Bạn đã hết 10 lượt tạo mail miễn phí hôm nay. Vui lòng đăng nhập!");
            return setIsAuthScreen(true);
        }
        const newCount = guestCount + 1;
        setGuestCount(newCount);
        localStorage.setItem('guestLimit', JSON.stringify({ date: new Date().toISOString().split('T')[0], count: newCount }));
    }

    const name = customName || Math.random().toString(36).substring(7);
    const address = `${name}@${DOMAIN}`;
    const key = 'API-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Lưu phiên làm việc để F5 không mất
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

  const handleRestore = () => {
      if (!restoreKey) return alert("Vui lòng nhập API Key!");
      // Logic đơn giản: Giả sử API key đúng, ta set lại session. 
      // Trong thực tế nên query DB để check xem API key này thuộc về mail nào.
      // Ở đây ta tạm thời cho phép user nhập lại address thủ công hoặc ta phải lưu map key->address trong DB.
      // Để đơn giản cho demo này: Ta yêu cầu nhập cả address hoặc chỉ cần nhập Key nếu ta có cơ chế tìm.
      // Update: Vì cấu trúc hiện tại không lưu key->address mapping dễ tìm, ta sẽ alert hướng dẫn.
      alert("Tính năng khôi phục đang được nâng cấp. Hiện tại hãy dùng mail mới hoặc F5 trang web (Mail cũ sẽ tự load lại).");
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('currentSession'); // Xóa session khi logout
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
  
  // Loading Screen (Fix F5 nháy login)
  if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-100"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  // Login Screen
  if (isAuthScreen && !user) {
    return <AuthScreen onSkip={() => setIsAuthScreen(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50">
      
      {/* HEADER 3 GẠCH */}
      <header className="bg-white shadow-sm h-16 fixed w-full top-0 z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('HOME'); setMenuOpen(false); }}>
            <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">A</div>
            <span className="font-bold text-xl tracking-tight">ADBV<span className="text-blue-600">Mail</span></span>
        </div>

        <div className="flex items-center gap-4">
             {/* Guest Counter */}
            {!user && (
                <span className="hidden md:inline-block text-xs font-medium bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200">
                    Khách: {guestCount}/10
                </span>
            )}
            
            {/* Nút 3 gạch (Hamburger) */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition relative z-50">
                <i className={`ph ${menuOpen ? 'ph-x' : 'ph-list'} text-2xl text-gray-700`}></i>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setMenuOpen(false)}></div>
                    <div className="absolute top-16 right-4 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                        {user && (
                            <div className="p-4 bg-gray-50 border-b flex items-center gap-3">
                                <img src={user.photoURL} className="w-10 h-10 rounded-full" alt="ava" />
                                <div className="overflow-hidden">
                                    <p className="font-bold text-sm truncate">{userData?.username || "User"}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                        <nav className="p-2">
                            <button onClick={() => { setView('HOME'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-3 transition">
                                <i className="ph ph-house"></i> Trang chủ
                            </button>
                            {user && (
                                <button onClick={() => { setView('PROFILE'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-3 transition">
                                    <i className="ph ph-user-circle"></i> Thông tin tài khoản
                                </button>
                            )}
                            <button onClick={() => { setView('HISTORY'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 flex items-center gap-3 transition">
                                <i className="ph ph-clock-counter-clockwise"></i> Lịch sử tạo mail
                            </button>
                            <div className="border-t my-2"></div>
                            {user ? (
                                <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-3 transition">
                                    <i className="ph ph-sign-out"></i> Đăng xuất
                                </button>
                            ) : (
                                <button onClick={() => { handleLogout(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-blue-600 flex items-center gap-3 transition">
                                    <i className="ph ph-sign-in"></i> Đăng nhập ngay
                                </button>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mt-20 p-4 max-w-4xl mx-auto w-full">
        
        {/* VIEW: HOME */}
        {view === 'HOME' && (
            <div className="space-y-8 fade-in">
                {/* Box Tạo Mail */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Tạo Email Ảo Tức Thì</h1>
                    <p className="text-gray-500 mb-6">Nhận thư nhanh chóng, an toàn và miễn phí với tên miền @{DOMAIN}</p>
                    
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <div className="flex-1 flex shadow-sm rounded-lg">
                            <input 
                                id="customNameInput"
                                type="text" 
                                placeholder="Nhập tên mail tùy ý..." 
                                className="flex-1 p-3 border border-r-0 rounded-l-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                            />
                            <div className="bg-gray-50 border border-l-0 px-4 flex items-center text-gray-500 font-medium rounded-r-lg">@{DOMAIN}</div>
                        </div>
                        <button 
                            onClick={() => {
                                const val = document.getElementById('customNameInput').value;
                                if(val) handleCreateMail(val);
                                else alert("Vui lòng nhập tên!");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-200 transition"
                        >
                            Tạo Mail
                        </button>
                    </div>

                    <button onClick={() => handleCreateMail()} className="w-full bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-medium transition flex items-center justify-center gap-2">
                        <i className="ph ph-shuffle"></i> Tạo Ngẫu Nhiên
                    </button>

                    {/* API RESTORE - Đã thêm lại */}
                    {!currentAddress && (
                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm font-medium text-gray-600 mb-2">Khôi phục phiên làm việc cũ:</p>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Nhập API Key (Tính năng đang bảo trì)..." 
                                    className="flex-1 p-2 border rounded text-sm bg-gray-50"
                                    value={restoreKey}
                                    onChange={e=>setRestoreKey(e.target.value)}
                                    disabled
                                />
                                <button onClick={handleRestore} className="bg-gray-200 text-gray-500 px-4 py-2 rounded text-sm cursor-not-allowed" disabled>Khôi phục</button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">*Hiện tại mail sẽ tự động khôi phục khi bạn F5 trang. Tính năng nhập API Key thủ công đang được phát triển.</p>
                        </div>
                    )}
                </div>

                {/* Box Hiển thị Mail */}
                {currentAddress && (
                    <div className="fade-in">
                        {/* Mail Info Card */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 p-6 rounded-2xl text-center mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><i className="ph ph-envelope-open text-9xl text-green-600"></i></div>
                            <p className="text-green-700 font-medium mb-1">Địa chỉ email của bạn</p>
                            <h2 
                                className="text-3xl md:text-4xl font-bold text-gray-800 break-all cursor-pointer hover:text-green-600 transition"
                                onClick={() => { navigator.clipboard.writeText(currentAddress); alert("Đã copy!"); }}
                            >
                                {currentAddress} <i className="ph ph-copy text-xl ml-2 text-gray-400"></i>
                            </h2>
                            <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-4 text-xs font-mono text-gray-500">
                                <span className="bg-white/60 px-2 py-1 rounded select-all">API: {apiKey}</span>
                                <span className="bg-white/60 px-2 py-1 rounded select-all">Link: https://{DOMAIN}/?inbox={apiKey}</span>
                            </div>
                        </div>

                        {/* Inbox List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><i className="ph ph-tray text-lg"></i> Hộp thư đến</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-gray-500">Real-time</span>
                                    <button onClick={() => window.location.reload()} className="p-1 hover:bg-gray-100 rounded" title="Làm mới"><i className="ph ph-arrows-clockwise"></i></button>
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                {inbox.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                        <i className="ph ph-envelope-simple-open text-6xl mb-4"></i>
                                        <p>Đang chờ thư gửi đến...</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y">
                                        {inbox.map(mail => (
                                            <li key={mail.id} className="p-4 hover:bg-blue-50 cursor-pointer transition group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-gray-800">{mail.from}</span>
                                                    <span className="text-xs text-gray-500 group-hover:text-blue-500">
                                                        {mail.timestamp?.seconds ? new Date(mail.timestamp.seconds * 1000).toLocaleTimeString() : 'Vừa xong'}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-sm text-blue-600 mb-1">{mail.subject}</p>
                                                <p className="text-sm text-gray-600 line-clamp-2">{mail.body}</p>
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
            <ProfileView user={user} userData={userData} toggleAdmin={toggleAdmin} />
        )}

        {/* VIEW: HISTORY */}
        {view === 'HISTORY' && (
            <HistoryView db={db} user={user} />
        )}

      </main>
    </div>
  );
}
