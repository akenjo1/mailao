import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
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
// BẠN HÃY THAY THÔNG TIN NÀY BẰNG CỦA BẠN LẤY TỪ FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCMHTdqRyrEeu1qV9c1ycb8bBLsZwggh60",
  authDomain: " my-temp-mail-de60c.firebaseapp.com",
  projectId: "my-temp-mail-de60c",
  storageBucket: "my-temp-mail-de60c.firebasestorage.app",
  messagingSenderId: " 466454763740",
  appId: "1:466454763740:web:b7a9563589be2f732bbc19"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const DOMAIN = "adbv.io.vn"; // Tên miền của bạn

// --- CÁC COMPONENT CON ---

// 1. Màn hình Đăng nhập / Đăng ký
function AuthScreen({ onLoginSuccess, onSkip }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Xử lý đăng nhập
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Xử lý đăng ký
        if (password !== confirmPass) throw new Error("Mật khẩu xác nhận không khớp!");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Tạo avatar mặc định theo tên
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
    if (!email) return setError("Vui lòng nhập Email trước để khôi phục!");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Đã gửi link đổi mật khẩu vào email của bạn!");
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md fade-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">ADBV Mail</h1>
          <p className="text-gray-500">{isLogin ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}</p>
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm font-medium">{error}</div>}

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
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:underline font-medium">
            {isLogin ? "Tạo tài khoản mới" : "Quay lại đăng nhập"}
          </button>
          {isLogin && <button onClick={handleResetPass} className="text-gray-500 hover:text-gray-700">Quên mật khẩu?</button>}
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
            // Lấy từ LocalStorage cho Guest
            const localHist = JSON.parse(localStorage.getItem('guestHistory') || '[]');
            setHistory(localHist);
            return;
        }

        // Lấy từ Firestore cho User
        const q = query(collection(db, "history"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => d.data()));
        }, (error) => {
            console.error("Lỗi đọc lịch sử:", error);
        });
        return () => unsub();
    }, [user, db]);

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
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

// --- COMPONENT CHÍNH ---
export default function App() {
  const [user, setUser] = useState(null); // Firebase Auth Object
  const [userData, setUserData] = useState(null); // Firestore User Data (Role...)
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  const [view, setView] = useState('HOME'); // HOME, PROFILE, HISTORY
  
  // Mail States
  const [currentAddress, setCurrentAddress] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [inbox, setInbox] = useState([]);
  
  // Guest System
  const [guestCount, setGuestCount] = useState(0);

  // 1. Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthScreen(false);
        
        // Lấy thông tin role từ Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          // Khởi tạo user mới trong DB
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
        // Load Guest Data
        const today = new Date().toISOString().split('T')[0];
        const local = JSON.parse(localStorage.getItem('guestLimit') || '{}');
        if (local.date === today) {
            setGuestCount(local.count);
        } else {
            localStorage.setItem('guestLimit', JSON.stringify({ date: today, count: 0 }));
            setGuestCount(0);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Lắng nghe Hộp thư đến (Real-time)
  useEffect(() => {
    if (!currentAddress) return;
    
    // Nếu là Guest, ta chỉ giả lập hoặc dùng API (đây là demo real-time với Firestore)
    // Lưu ý: Nếu có lỗi "The query requires an index", mở Console trình duyệt để lấy link tạo index
    const q = query(
        collection(db, "emails"), 
        where("to", "==", currentAddress), 
        orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const mails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInbox(mails);
    }, (error) => {
        console.error("Lỗi đọc Inbox (Có thể do thiếu Index hoặc Permission):", error);
        // Nếu lỗi do thiếu index, ta thử query đơn giản hơn để không bị trắng trang
        if (error.code === 'failed-precondition') {
            alert("Lỗi: Thiếu Index trong Firestore. Hãy mở Console (F12) để lấy link tạo Index.");
        }
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
        // Tăng đếm Guest
        const newCount = guestCount + 1;
        setGuestCount(newCount);
        localStorage.setItem('guestLimit', JSON.stringify({ 
            date: new Date().toISOString().split('T')[0], 
            count: newCount 
        }));
    } else {
        // Nếu là user thường, có thể check limit trong DB nếu muốn.
        // Ở đây Admin thì thoải mái.
    }

    const name = customName || Math.random().toString(36).substring(7);
    const address = `${name}@${DOMAIN}`;
    const key = 'API-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    setCurrentAddress(address);
    setApiKey(key);
    setInbox([]); // Xóa inbox cũ trên màn hình

    const historyData = {
        address: address,
        apiKey: key,
        link: `https://${DOMAIN}/?inbox=${key}`,
        createdAt: user ? serverTimestamp() : new Date().toLocaleString(),
        uid: user ? user.uid : 'guest'
    };

    // Lưu lịch sử
    if (user) {
        await addDoc(collection(db, "history"), historyData);
    } else {
        const localHist = JSON.parse(localStorage.getItem('guestHistory') || '[]');
        localHist.unshift(historyData);
        localStorage.setItem('guestHistory', JSON.stringify(localHist));
    }
  };

  // DEBUG: Hàm test ghi trực tiếp vào DB để kiểm tra permission
  const handleTestDBConnection = async () => {
      if (!currentAddress) return alert("Vui lòng tạo mail trước!");
      try {
          await addDoc(collection(db, "emails"), {
              to: currentAddress,
              from: "system-test@adbv.io.vn",
              subject: "Test Kết Nối Database Thành Công",
              body: "Nếu bạn thấy mail này, nghĩa là kết nối từ Web tới Firebase OK. Vấn đề nằm ở Cloudflare Worker!",
              timestamp: serverTimestamp()
          });
          alert("Đã gửi mail test giả lập! Kiểm tra hộp thư bên dưới.");
      } catch (e) {
          console.error(e);
          alert("Lỗi Ghi Database: " + e.message + "\n\nKiểm tra lại Firestore Rules hoặc API Key!");
      }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthScreen(true);
    setCurrentAddress(null);
    setView('HOME');
  };

  const toggleAdmin = async () => {
      if (!user || !userData) return;
      const newRole = userData.role === 'admin' ? 'user' : 'admin';
      
      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      
      // Update Local State UI
      setUserData({ ...userData, role: newRole });
      alert(`Đã chuyển quyền thành: ${newRole.toUpperCase()}`);
  };

  // --- RENDER GIAO DIỆN ---
  
  if (isAuthScreen && !user) {
    return <AuthScreen onSkip={() => setIsAuthScreen(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800">
      
      {/* HEADER */}
      <header className="bg-white shadow-sm h-16 fixed w-full top-0 z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
            <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">A</div>
            <span className="font-bold text-xl tracking-tight">ADBV<span className="text-blue-600">Mail</span></span>
        </div>

        <div className="flex items-center gap-4">
            {!user && (
                <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200">
                    Khách: {guestCount}/10
                </span>
            )}
            
            {/* Menu Desktop */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setView('HOME')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'HOME' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Trang chủ</button>
                <button onClick={() => setView('HISTORY')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'HISTORY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Lịch sử</button>
                {user && <button onClick={() => setView('PROFILE')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'PROFILE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Tài khoản</button>}
            </div>

            {user ? (
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition"><i className="ph ph-sign-out text-2xl"></i></button>
            ) : (
                <button onClick={() => setIsAuthScreen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Đăng nhập</button>
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
                                <span className="bg-white/60 px-2 py-1 rounded">API: {apiKey}</span>
                                <span className="bg-white/60 px-2 py-1 rounded">Link: https://{DOMAIN}/inbox/{apiKey}</span>
                            </div>
                        </div>

                        {/* Inbox List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2"><i className="ph ph-tray text-lg"></i> Hộp thư đến</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-gray-500">Real-time</span>
                                    
                                    {/* DEBUG BUTTON */}
                                    <button 
                                        onClick={handleTestDBConnection}
                                        className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded border"
                                    >
                                        Test Kết Nối Database
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                {inbox.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                        <i className="ph ph-envelope-simple-open text-6xl mb-4"></i>
                                        <p>Đang chờ thư gửi đến...</p>
                                        <p className="text-xs mt-2 text-gray-400 max-w-xs text-center">Nếu gửi mail vào địa chỉ trên mà không thấy hiện ở đây, hãy bấm nút "Test Kết Nối" phía trên để kiểm tra.</p>
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
            <div className="bg-white rounded-2xl shadow-sm p-6 fade-in max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <img src={user.photoURL} className="w-20 h-20 rounded-full border-4 border-blue-50" alt="Avatar"/>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{userData.username}</h2>
                        <p className="text-gray-500">{user.email}</p>
                        <div className="mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${userData.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {userData.role.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Admin Zone Demo */}
                <div className="border rounded-xl p-5 bg-yellow-50 border-yellow-100">
                    <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><i className="ph ph-crown-simple"></i> Khu vực Admin (Demo)</h3>
                    <p className="text-sm text-yellow-700 mb-4">
                        Tính năng này cho phép bạn tự nâng cấp tài khoản lên Admin để không bị giới hạn số lượng mail tạo trong ngày.
                    </p>
                    <button 
                        onClick={toggleAdmin}
                        className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition ${userData.role === 'admin' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                    >
                        {userData.role === 'admin' ? 'Hạ cấp xuống User' : 'Nâng cấp lên Admin Ngay'}
                    </button>
                </div>
                
                <div className="mt-8 pt-6 border-t">
                    <h3 className="font-bold mb-4">Bảo mật</h3>
                    <button onClick={() => alert("Tính năng đổi mật khẩu đã gửi vào mail!")} className="text-blue-600 text-sm hover:underline">Đổi mật khẩu</button>
                </div>
            </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'HISTORY' && (
            <HistoryView db={db} user={user} />
        )}

      </main>
    </div>
  );
}
