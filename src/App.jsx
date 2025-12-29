import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
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
  updateDoc 
} from "firebase/firestore";

// --- CẤU HÌNH FIREBASE (Lấy từ Firebase Console) ---
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

// --- COMPONENT CHÍNH ---
export default function App() {
  const [user, setUser] = useState(null); // Auth User
  const [userData, setUserData] = useState(null); // Firestore Data (Role)
  const [view, setView] = useState('HOME'); 
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  
  // Mail States
  const [currentAddress, setCurrentAddress] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [apiKey, setApiKey] = useState('');
  
  // Guest Limit
  const [guestCount, setGuestCount] = useState(0);

  // 1. Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthScreen(false);
        // Lấy thông tin Role từ Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        } else {
          // Tạo user data mặc định nếu chưa có
          const newData = { role: 'user', email: currentUser.email, username: currentUser.email.split('@')[0] };
          await setDoc(userRef, newData);
          setUserData(newData);
        }
      } else {
        setUser(null);
        setUserData(null);
        // Load guest count từ LocalStorage
        const today = new Date().toISOString().split('T')[0];
        const localGuest = JSON.parse(localStorage.getItem('guestLimit') || '{}');
        if (localGuest.date === today) {
          setGuestCount(localGuest.count);
        } else {
          setGuestCount(0);
          localStorage.setItem('guestLimit', JSON.stringify({ date: today, count: 0 }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Lắng nghe Hộp thư đến (Realtime Firestore)
  useEffect(() => {
    if (!currentAddress) return;
    
    // Query: Lấy mail gửi tới địa chỉ hiện tại
    const q = query(
      collection(db, "emails"), 
      where("to", "==", currentAddress),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInbox(mails);
    });

    return () => unsubscribe();
  }, [currentAddress]);

  // --- HÀM XỬ LÝ ---

  const handleCreateMail = async (customName = null) => {
    // Check giới hạn
    if (!user) {
      if (guestCount >= 10) return alert("Hết lượt tạo mail miễn phí hôm nay (10/10). Vui lòng đăng nhập!");
      const newCount = guestCount + 1;
      setGuestCount(newCount);
      localStorage.setItem('guestLimit', JSON.stringify({ 
        date: new Date().toISOString().split('T')[0], 
        count: newCount 
      }));
    } else {
       // Nếu là User thường (không phải admin), cũng có thể check limit trong Firestore nếu muốn
       // Ở đây admin thì thả ga
    }

    const name = customName || Math.random().toString(36).substring(7);
    const address = `${name}@${DOMAIN}`;
    const generatedKey = 'API-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    setCurrentAddress(address);
    setApiKey(generatedKey);
    setInbox([]); // Xóa inbox cũ trên UI

    // Lưu vào lịch sử (Firestore nếu login, Local nếu guest)
    if (user) {
      await addDoc(collection(db, "history"), {
        uid: user.uid,
        address: address,
        apiKey: generatedKey,
        createdAt: new Date(),
        link: `https://${DOMAIN}/inbox/${generatedKey}`
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthScreen(true);
    setCurrentAddress(null);
  };

  // --- GIAO DIỆN (Dùng lại UI cũ nhưng tích hợp logic thật) ---
  if (isAuthScreen && !user) return <AuthScreen setUser={setUser} setIsAuthScreen={setIsAuthScreen} />;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow p-4 flex justify-between items-center fixed w-full top-0 z-50">
        <div className="font-bold text-xl text-blue-600">ADBV Mail</div>
        <div className="flex gap-4">
          <button onClick={() => setView('HOME')} className="hover:text-blue-500">Trang chủ</button>
          {user && <button onClick={() => setView('PROFILE')} className="hover:text-blue-500">Thông tin</button>}
          <button onClick={() => setView('HISTORY')} className="hover:text-blue-500">Lịch sử</button>
          <button onClick={handleLogout} className="text-red-500">Đăng xuất</button>
        </div>
      </header>

      <main className="pt-20 p-4 max-w-4xl mx-auto">
        {view === 'HOME' && (
          <div className="space-y-6">
            {/* Box Tạo Mail */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">Tạo Email Mới @{DOMAIN}</h2>
              <div className="flex gap-2 mb-4">
                 <input id="customName" type="text" placeholder="Tên tùy chọn..." className="border p-2 rounded flex-1"/>
                 <button 
                    onClick={() => handleCreateMail(document.getElementById('customName').value)} 
                    className="bg-blue-600 text-white px-4 rounded"
                 >Tạo</button>
              </div>
              <button onClick={() => handleCreateMail()} className="w-full bg-gray-800 text-white p-2 rounded">Tạo Ngẫu Nhiên</button>
              {!user && <p className="text-xs text-red-500 mt-2 text-center">Khách: {guestCount}/10 lượt hôm nay</p>}
            </div>

            {/* Box Hiển thị Mail & Inbox */}
            {currentAddress && (
              <div className="animate-fade-in">
                <div className="bg-green-100 border border-green-300 p-4 rounded mb-6 text-center">
                   <h2 className="text-2xl font-bold text-green-800 select-all">{currentAddress}</h2>
                   <p className="text-xs mt-2">API: {apiKey}</p>
                   <p className="text-xs">Link: https://{DOMAIN}/?restore={apiKey}</p>
                </div>

                <div className="bg-white rounded shadow min-h-[300px]">
                   <div className="p-3 border-b font-bold bg-gray-50">Hộp thư đến (Real-time)</div>
                   {inbox.length === 0 ? (
                      <div className="p-10 text-center text-gray-400">Đang chờ thư đến...</div>
                   ) : (
                      <ul>
                        {inbox.map(mail => (
                          <li key={mail.id} className="p-4 border-b hover:bg-blue-50">
                             <div className="font-bold">{mail.from}</div>
                             <div className="text-sm font-semibold text-blue-600">{mail.subject}</div>
                             <div className="text-sm text-gray-600 mt-1">{mail.body}</div>
                             <div className="text-xs text-gray-400 mt-2">{new Date(mail.timestamp?.seconds * 1000).toLocaleString()}</div>
                          </li>
                        ))}
                      </ul>
                   )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'PROFILE' && userData && (
           <div className="bg-white p-6 rounded shadow">
              <h2 className="text-2xl font-bold mb-4">Hồ sơ</h2>
              <p>Email: {userData.email}</p>
              <p>Role: <span className="font-bold text-purple-600">{userData.role.toUpperCase()}</span></p>
              
              {/* Demo Admin Update */}
              <div className="mt-6 border-t pt-4">
                 <h3 className="font-bold mb-2">Admin Zone</h3>
                 <button 
                    onClick={async () => {
                       const newRole = userData.role === 'admin' ? 'user' : 'admin';
                       await updateDoc(doc(db, "users", user.uid), { role: newRole });
                       setUserData({...userData, role: newRole});
                    }} 
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                 >
                    Chuyển đổi quyền Admin (Demo)
                 </button>
              </div>
           </div>
        )}

        {view === 'HISTORY' && (
           <HistoryView db={db} user={user} />
        )}
      </main>
    </div>
  );
}

// Sub-components Auth, History... (Giản lược để code ngắn gọn)
function AuthScreen({ setUser, setIsAuthScreen }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    try {
       if (isLogin) await signInWithEmailAndPassword(auth, email, pass);
       else await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { setError(err.message); }
  };

  const handleReset = async () => {
    if(!email) return alert("Nhập email trước!");
    await sendPasswordResetEmail(getAuth(), email);
    alert("Đã gửi email khôi phục!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
       <form onSubmit={handleAuth} className="bg-white p-8 rounded shadow-lg w-96">
          <h1 className="text-2xl font-bold mb-4 text-center">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</h1>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <input className="w-full border p-2 mb-3 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="w-full border p-2 mb-3 rounded" type="password" placeholder="Mật khẩu" value={pass} onChange={e=>setPass(e.target.value)} required />
          
          <button className="w-full bg-blue-600 text-white p-2 rounded mb-2">{isLogin ? "Login" : "Register"}</button>
          
          <div className="flex justify-between text-sm mt-4">
             <span onClick={() => setIsLogin(!isLogin)} className="text-blue-500 cursor-pointer">{isLogin ? "Tạo tài khoản" : "Quay lại đăng nhập"}</span>
             <span onClick={handleReset} className="text-gray-500 cursor-pointer">Quên mật khẩu?</span>
          </div>
          <div className="text-center mt-6 border-t pt-2">
             <span onClick={() => setIsAuthScreen(false)} className="text-gray-500 cursor-pointer text-sm">Dùng thử không cần đăng nhập</span>
          </div>
       </form>
    </div>
  )
}

function HistoryView({ db, user }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
     if (!user) return;
     const q = query(collection(db, "history"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
     onSnapshot(q, (snap) => setHistory(snap.docs.map(d => d.data())));
  }, [user]);

  if (!user) return <div className="p-6 bg-white">Vui lòng đăng nhập để xem lịch sử.</div>;

  return (
     <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Lịch sử tạo mail</h2>
        <table className="w-full text-left">
           <thead><tr className="border-b"><th className="p-2">Email</th><th className="p-2">Ngày tạo</th></tr></thead>
           <tbody>
              {history.map((h, i) => (
                 <tr key={i} className="border-b">
                    <td className="p-2 font-bold text-blue-600">{h.address}</td>
                    <td className="p-2">{new Date(h.createdAt?.seconds*1000).toLocaleDateString()}</td>
                 </tr>
              ))}
           </tbody>
        </table>
     </div>
  );
}
