import React, { useState, useEffect, useMemo, useRef } from "react";
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
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCMHTdqRyrEeu1qV9c1ycb8bBLsZwggh60",
  authDomain: "my-temp-mail-de60c.firebaseapp.com",
  projectId: "my-temp-mail-de60c",
  storageBucket: "my-temp-mail-de60c.firebasestorage.app",
  messagingSenderId: "466454763740",
  appId: "1:466454763740:web:b7a9563589be2f732bbc19",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === CẤU HÌNH DOMAIN ===
const EMAIL_DOMAIN = "adbv.io.vn";
const WEB_BASE = "https://mailao.vercel.app";

// --- OWNER UID (Người duy nhất có quyền set Admin) ---
const OWNER_UID = "9pWfn0s8LjTGFZPIrchUEUkigoB3";

// === LIMIT ===
const DAILY_LIMIT = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// =========================
// Helpers
// =========================
const todayKey = () => new Date().toISOString().slice(0, 10);

function normalizeLocalPart(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}
function isValidLocalPart(s) {
  return /^[a-z0-9._-]{1,32}$/.test(s);
}
function makeRandomLocalPart(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function makeApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "API-";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function safeToMillis(ts) {
  try {
    if (!ts) return null;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    return null;
  } catch {
    return null;
  }
}
function inferService(from = "", subject = "") {
  const x = `${from} ${subject}`.toLowerCase();
  const map = [
    ["capcut", "CapCut"],
    ["tiktok", "TikTok"],
    ["facebook", "Facebook"],
    ["meta", "Meta"],
    ["google", "Google"],
    ["gmail", "Google"],
    ["adobe", "Adobe"],
    ["microsoft", "Microsoft"],
    ["steam", "Steam"],
    ["discord", "Discord"],
    ["telegram", "Telegram"],
    ["netflix", "Netflix"],
    ["spotify", "Spotify"],
    ["x.com", "X"],
    ["twitter", "X"],
  ];
  for (const [k, v] of map) if (x.includes(k)) return v;
  return "-";
}
function getMagicKeyFromUrl() {
  const u = new URL(window.location.href);
  const qp = u.searchParams.get("key") || u.searchParams.get("restore");
  if (qp && qp.trim()) return qp.trim();

  const path = window.location.pathname.replace(/^\/+/, "").trim();
  if (path.startsWith("API-") && path.length <= 64) return path;

  return null;
}
function pruneGuestHistory() {
  const raw = JSON.parse(localStorage.getItem("guestHistory") || "[]");
  const now = Date.now();
  const kept = raw.filter((h) => {
    const exp = h?.expiresAtMs;
    if (!exp) return true;
    return now <= exp;
  });
  if (kept.length !== raw.length) localStorage.setItem("guestHistory", JSON.stringify(kept));
}

// =========================
// ✅ EMAIL PARSER (ưu tiên HTML, loại header dài)
// =========================
function _normNL(s = "") {
  return String(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function _splitHeadersBody(raw = "") {
  const s = _normNL(raw);
  const m = s.match(/\n[ \t]*\n/);
  if (!m) return { headers: s, body: "" };
  const idx = m.index ?? -1;
  const sepLen = m[0].length;
  return { headers: s.slice(0, idx), body: s.slice(idx + sepLen) };
}
function _decodeQuotedPrintable(input = "") {
  let s = String(input || "");
  s = s.replace(/=\n/g, "");
  s = s.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return s;
}
function _b64ToUtf8(b64 = "") {
  try {
    const clean = String(b64 || "").replace(/\s+/g, "");
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return String(b64 || "");
  }
}
function _isProbablyHtml(s = "") {
  const x = String(s || "").slice(0, 12000);
  return /<!doctype\s+html|<html\b|<head\b|<body\b|<div\b|<table\b|<p\b|<br\b|<span\b|<\/(html|body|div|table|p)>/i.test(
    x
  );
}
function _stripHtml(html = "") {
  try {
    const doc2 = new DOMParser().parseFromString(String(html || ""), "text/html");
    return (doc2.body?.textContent || "").replace(/\u00a0/g, " ").trim();
  } catch {
    return String(html || "");
  }
}
function sanitizeHtmlForIframe(html = "") {
  let s = String(html || "");

  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed[\s\S]*?>/gi, "");
  s = s.replace(/<link[\s\S]*?>/gi, "");

  s = s.replace(/\son\w+="[^"]*"/gi, "");
  s = s.replace(/\son\w+='[^']*'/gi, "");
  s = s.replace(/\son\w+=\S+/gi, "");

  if (!/<html/i.test(s)) {
    s = `<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body{font-family:system-ui,Segoe UI,Roboto,Arial; margin:16px; color:#111; line-height:1.6}
      img{max-width:100%; height:auto}
      a{color:#2563eb}
      pre{white-space:pre-wrap; word-break:break-word}
      .wrap{max-width:820px; margin:0 auto}
    </style>
    </head><body><div class="wrap">${s}</div></body></html>`;
  }
  return s;
}
function _decodePartBody(pb = "", enc = "") {
  const e = String(enc || "").toLowerCase();
  let content = pb || "";
  if (e.includes("base64")) content = _b64ToUtf8(content);
  else if (e.includes("quoted-printable")) content = _decodeQuotedPrintable(content);
  return String(content || "").replace(/\u0000/g, "");
}
function parseEmailContent(raw = "") {
  const full = _normNL(raw || "");
  const { headers, body } = _splitHeadersBody(full);

  const boundary =
    (headers.match(/boundary="?([^"\n;]+)"?/i) || [])[1] ||
    (full.match(/boundary="?([^"\n;]+)"?/i) || [])[1] ||
    "";

  // Single-part decode
  const topCT = (headers.match(/Content-Type:\s*([^;\n]+)/i) || [])[1]?.toLowerCase() || "";
  const topEnc = (headers.match(/Content-Transfer-Encoding:\s*([^\n]+)/i) || [])[1]?.toLowerCase() || "";

  if (!boundary || !full.includes(`--${boundary}`)) {
    const decoded = _decodePartBody(body, topEnc);
    const html = topCT.includes("text/html") || _isProbablyHtml(decoded) ? decoded.trim() : "";
    const text = html ? _stripHtml(html) : decoded.trim();
    return { html: html || "", text: text || "" };
  }

  // Multipart
  const chunks = _normNL(body).split(`--${boundary}`);

  let bestHtml = "";
  let bestPlain = "";
  let bestAnyText = "";

  for (const ch0 of chunks) {
    let part = (ch0 || "").trim();
    if (!part || part === "--") continue;
    if (part.endsWith("--")) part = part.slice(0, -2).trim();

    const { headers: ph, body: pb } = _splitHeadersBody(part);
    const ct = (ph.match(/Content-Type:\s*([^;\n]+)/i) || [])[1]?.toLowerCase() || "";
    const enc = (ph.match(/Content-Transfer-Encoding:\s*([^\n]+)/i) || [])[1]?.toLowerCase() || "";

    // Skip attachments quickly
    const disp = (ph.match(/Content-Disposition:\s*([^\n]+)/i) || [])[1]?.toLowerCase() || "";
    if (disp.includes("attachment")) continue;

    const decoded = _decodePartBody(pb, enc).trim();
    if (!decoded) continue;

    const isHtml = ct.includes("text/html") || _isProbablyHtml(decoded);
    const isPlain = ct.includes("text/plain") && !isHtml;

    if (isHtml && !bestHtml) bestHtml = decoded;
    if (isPlain && !bestPlain) bestPlain = decoded;

    if (!bestAnyText) {
      bestAnyText = isHtml ? _stripHtml(decoded) : decoded;
    }
  }

  const html = bestHtml || "";
  const text = (bestPlain || (html ? _stripHtml(html) : bestAnyText) || "").trim();
  return { html, text };
}
function cleanMailText(raw = "") {
  const { text } = parseEmailContent(raw);
  return String(text || "")
    .replace(/^[A-Za-z0-9+/=]{120,}$/gm, "[...binary/attachment removed...]")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
function getMailIframeDoc(raw = "") {
  const { html, text } = parseEmailContent(raw);
  if (html) return sanitizeHtmlForIframe(html);
  const safeText = String(text || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  return sanitizeHtmlForIframe(`<pre>${safeText}</pre>`);
}

// =========================
// ✅ Notifications
// =========================
async function ensureNotificationPermission() {
  try {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}
function showMailNotification({ title, body, tag }) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(title || "New mail", {
      body: body || "",
      tag: tag || undefined,
      silent: true,
    });
    setTimeout(() => n.close?.(), 8000);
  } catch {
    // ignore
  }
}

// ==========================================
// 1. MÀN HÌNH AUTH (ĐĂNG NHẬP / ĐĂNG KÝ)
// ==========================================
function AuthScreen({ onLoginSuccess, onSkip }) {
  const [isLogin, setIsLogin] = useState(true);
  const [inputLogin, setInputLogin] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewForgot, setViewForgot] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let loginEmail = inputLogin.trim();
      if (!loginEmail.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", loginEmail));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error("Tên tài khoản không tồn tại!");
        loginEmail = querySnapshot.docs[0].data().email;
      }
      await signInWithEmailAndPassword(auth, loginEmail, password);
      onLoginSuccess?.();
    } catch (err) {
      setError(String(err?.message || err).replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (password !== confirmPass) throw new Error("Mật khẩu xác nhận không khớp!");

      const u = normalizeLocalPart(username);
      if (!u || !isValidLocalPart(u)) throw new Error("Tên tài khoản chỉ gồm a-z 0-9 . _ - (tối đa 32 ký tự)");

      const qU = query(collection(db, "users"), where("username", "==", u));
      const snapU = await getDocs(qU);
      if (!snapU.empty) throw new Error("Tên tài khoản đã được sử dụng!");

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, {
        displayName: u,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}`,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email.trim(),
        username: u,
        role: "user",
        dailyUsage: { date: todayKey(), count: 0 },
        createdAt: serverTimestamp(),
      });

      onLoginSuccess?.();
    } catch (err) {
      setError(String(err?.message || err).replace("Firebase:", "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleResetPass = async (e) => {
    e.preventDefault();
    if (!email) return setError("Vui lòng nhập Email!");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg(`Đã gửi LINK đổi mật khẩu tới ${email}. Vui lòng kiểm tra hộp thư.`);
      setError("");
    } catch (e2) {
      setError(String(e2?.message || e2));
    }
  };

  if (viewForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Quên mật khẩu</h2>
          {msg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>}
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleResetPass} className="space-y-4">
            <input
              type="email"
              placeholder="Nhập email đã đăng ký"
              className="w-full p-3 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-bold">
              Gửi link đổi mật khẩu
            </button>
            <button type="button" onClick={() => setViewForgot(false)} className="w-full text-gray-500 text-sm">
              Quay lại đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md fade-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">ADBV Mail</h1>
          <p className="text-gray-500 text-sm">{isLogin ? "Đăng nhập hệ thống" : "Đăng ký tài khoản"}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-100">{error}</div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Tên tài khoản hoặc Email"
              value={inputLogin}
              onChange={(e) => setInputLogin(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Đang xử lý..." : "Đăng Nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Tên tài khoản (Viết liền)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="email"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
              placeholder="Xác nhận mật khẩu"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Đang xử lý..." : "Đăng Ký"}
            </button>
          </form>
        )}

        <div className="mt-4 flex justify-between text-sm items-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMsg("");
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            {isLogin ? "Đăng ký tài khoản" : "Đã có tài khoản?"}
          </button>
          {isLogin && (
            <button type="button" onClick={() => setViewForgot(true)} className="text-gray-400 hover:text-gray-600">
              Quên mật khẩu?
            </button>
          )}
        </div>

        <div className="mt-6 border-t pt-4 text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center gap-1 mx-auto transition group"
          >
            Sử dụng không cần đăng nhập <i className="ph ph-arrow-right ml-1"></i>
          </button>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Giới hạn 10 mail/ngày</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. MÀN HÌNH LỊCH SỬ (HISTORY)
// ==========================================
function HistoryView({ db, user }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      let data = [];
      if (!user) {
        pruneGuestHistory();
        data = JSON.parse(localStorage.getItem("guestHistory") || "[]");
      } else {
        const q = query(collection(db, "history"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        data = snap.docs.map((d) => d.data());
      }

      data.sort((a, b) => {
        const tA =
          a.createdAt?.seconds ||
          (typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() / 1000 : 0) ||
          0;
        const tB =
          b.createdAt?.seconds ||
          (typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() / 1000 : 0) ||
          0;
        return tB - tA;
      });

      if (isMounted) setHistory(data);
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
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
              <th className="p-3">Email</th>
              <th className="p-3">API Key / Link</th>
              <th className="p-3">Dịch vụ</th>
              <th className="p-3">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400">
                  Chưa có lịch sử nào
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i} className="hover:bg-blue-50/50 transition">
                  <td className="p-3 font-medium text-blue-600">{h.address}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                        {h.apiKey}
                      </span>
                      <a
                        href={h.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <i className="ph ph-link"></i> Link
                      </a>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 text-xs font-semibold">{h.service || "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {h.createdAt?.seconds
                      ? new Date(h.createdAt.seconds * 1000).toLocaleString()
                      : h.createdAt || "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!user && (
        <div className="mt-4 text-xs text-gray-500">
          * Guest history lưu trên trình duyệt. Mail guest/user thường sẽ hết hạn sau 24h (nếu bạn bật TTL).
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. THÔNG TIN CÁ NHÂN (PROFILE & ĐỔI PASS)
// ==========================================
function ProfileView({ user, userData, auth }) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");

  const handleChangePassword = async () => {
    setPassMsg("");
    if (!currentPass) return setPassMsg("Vui lòng nhập mật khẩu hiện tại!");
    if (newPass.length < 6) return setPassMsg("Mật khẩu mới phải từ 6 ký tự!");
    if (newPass !== confirmNewPass) return setPassMsg("Mật khẩu xác nhận không khớp!");

    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setPassMsg("Đổi mật khẩu thành công!");
      setCurrentPass("");
      setNewPass("");
      setConfirmNewPass("");
    } catch (e) {
      setPassMsg("Lỗi: " + (e?.message || e));
    }
  };

  const handleForgotPass = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`Đã gửi link đổi mật khẩu tới ${user.email}`);
    } catch (e) {
      alert(String(e?.message || e));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in max-w-2xl mx-auto animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Thông tin tài khoản</h2>

      <div className="flex items-start gap-6 mb-8">
        <img
          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`}
          className="w-24 h-24 rounded-full border-4 border-blue-50 shadow-sm"
          alt="Avatar"
        />
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
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                userData?.role === "admin"
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {(userData?.role || "user").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-2 border-t pt-6">
        <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2">
          <i className="ph ph-lock-key"></i> Đổi mật khẩu
        </h3>
        <div className="bg-gray-50 p-6 rounded-xl space-y-4">
          {passMsg && (
            <div
              className={`text-sm p-3 rounded font-medium ${
                passMsg.includes("thành công") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {passMsg}
            </div>
          )}
          <input
            type="password"
            placeholder="Mật khẩu hiện tại"
            className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              className="w-full border p-3 rounded-lg bg-white focus:outline-none focus:border-blue-500"
              value={confirmNewPass}
              onChange={(e) => setConfirmNewPass(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleForgotPass} className="text-sm text-blue-600 hover:underline">
              Quên mật khẩu?
            </button>
            <button
              type="button"
              onClick={handleChangePassword}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition"
            >
              Lưu thay đổi
            </button>
          </div>

          <div className="text-[11px] text-gray-500 leading-relaxed">
            * Firebase Auth mặc định gửi <b>LINK</b> reset. Nếu bạn muốn <b>mã code</b>, cần backend gửi email.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. OWNER ADMIN PANEL (Quản lý User)
// ==========================================
function OwnerAdminPanel({ db, user, setUserRoleByUid }) {
  const [qText, setQText] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");

  const findUser = async () => {
    setMsg("");
    setFound(null);
    const input = qText.trim();
    if (!input) return setMsg("Nhập username hoặc email");

    let snap;
    if (input.includes("@")) snap = await getDocs(query(collection(db, "users"), where("email", "==", input)));
    else snap = await getDocs(query(collection(db, "users"), where("username", "==", normalizeLocalPart(input))));

    if (snap.empty) return setMsg("Không tìm thấy user");
    const d = snap.docs[0];
    setFound({ uid: d.id, ...d.data() });
  };

  if (!user || user.uid !== OWNER_UID) return <div className="bg-white p-6 rounded-2xl border">Bạn không phải OWNER.</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 animate-fade-in-up">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <i className="ph ph-shield-check text-yellow-600"></i> Owner: Quản trị tài khoản
      </h2>

      <div className="flex gap-2">
        <input
          className="flex-1 p-3 border rounded-lg outline-none focus:border-blue-500"
          placeholder="Nhập username hoặc email..."
          value={qText}
          onChange={(e) => setQText(e.target.value)}
        />
        <button type="button" onClick={findUser} className="px-5 rounded-lg bg-gray-900 text-white hover:bg-black transition">
          Tìm
        </button>
      </div>

      {msg && <div className="mt-3 text-sm text-gray-600">{msg}</div>}

      {found && (
        <div className="mt-6 border rounded-xl p-4 bg-gray-50">
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <b>UID:</b> {found.uid}
            </div>
            <div>
              <b>Username:</b> {found.username}
            </div>
            <div>
              <b>Email:</b> {found.email}
            </div>
            <div>
              <b>Role:</b>{" "}
              <span className="px-2 py-1 rounded bg-white border text-xs font-bold">{(found.role || "user").toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await setUserRoleByUid(found.uid, "admin");
                setFound({ ...found, role: "admin" });
                setMsg("Đã set ADMIN");
              }}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600"
            >
              Set Admin
            </button>

            <button
              type="button"
              onClick={async () => {
                await setUserRoleByUid(found.uid, "user");
                setFound({ ...found, role: "user" });
                setMsg("Đã set USER");
              }}
              className="px-4 py-2 rounded-lg bg-white border font-medium hover:bg-gray-100"
            >
              Set User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. APP SHELL & LOGIC CHÍNH
// ==========================================
export default function App() {
  // Auth
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // App state
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState("HOME");
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mail modal
  const [selectedMail, setSelectedMail] = useState(null);

  // Inbox filter/sort
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState("newest"); // newest | oldest | from | subject

  const [isAuthScreen, setIsAuthScreen] = useState(() => {
    const skipped = localStorage.getItem("skipAuth") === "1";
    const hasSession = !!localStorage.getItem("currentSession");
    return !skipped && !hasSession;
  });

  const [currentAddress, setCurrentAddress] = useState(() => {
    try {
      const s = localStorage.getItem("currentSession");
      return s ? JSON.parse(s).address : null;
    } catch {
      return null;
    }
  });
  const [apiKey, setApiKey] = useState(() => {
    try {
      const s = localStorage.getItem("currentSession");
      return s ? JSON.parse(s).apiKey : null;
    } catch {
      return null;
    }
  });

  const [inbox, setInbox] = useState([]);
  const [restoreKey, setRestoreKey] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [customName, setCustomName] = useState("");

  // ✅ Unread/Read tracking
  const readStoreKey = useMemo(() => (currentAddress ? `read_${currentAddress}` : null), [currentAddress]);
  const [readSet, setReadSet] = useState(() => new Set());
  useEffect(() => {
    if (!readStoreKey) {
      setReadSet(new Set());
      return;
    }
    try {
      const arr = JSON.parse(localStorage.getItem(readStoreKey) || "[]");
      setReadSet(new Set(Array.isArray(arr) ? arr : []));
    } catch {
      setReadSet(new Set());
    }
  }, [readStoreKey]);

  const markRead = (mailId) => {
    if (!readStoreKey || !mailId) return;
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(mailId);
      try {
        localStorage.setItem(readStoreKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const isVip = useMemo(() => {
    return !!user && (user.uid === OWNER_UID || userData?.role === "admin");
  }, [user, userData]);

  const usedCount = useMemo(() => {
    const t = todayKey();
    if (user) {
      const du = userData?.dailyUsage;
      if (du?.date === t) return du.count || 0;
      return 0;
    }
    return guestCount || 0;
  }, [user, userData, guestCount]);

  const unreadCount = useMemo(() => {
    if (!inbox?.length) return 0;
    let c = 0;
    for (const m of inbox) if (!readSet.has(m.id)) c++;
    return c;
  }, [inbox, readSet]);

  const filteredInbox = useMemo(() => {
    const q = (searchText || "").trim().toLowerCase();
    let list = [...(inbox || [])];

    if (q) {
      list = list.filter((m) => {
        const from = String(m.from || "").toLowerCase();
        const subject = String(m.subject || "").toLowerCase();
        const text = cleanMailText(m.body || "").toLowerCase();
        return from.includes(q) || subject.includes(q) || text.includes(q);
      });
    }

    const getTs = (m) => (m?.timestamp?.seconds ? m.timestamp.seconds : 0);

    list.sort((a, b) => {
      if (sortMode === "oldest") return getTs(a) - getTs(b);
      if (sortMode === "from") return String(a.from || "").localeCompare(String(b.from || ""));
      if (sortMode === "subject") return String(a.subject || "").localeCompare(String(b.subject || ""));
      return getTs(b) - getTs(a);
    });

    return list;
  }, [inbox, searchText, sortMode]);

  // Notifications: detect new mails
  const inboxInitRef = useRef(false);
  const prevIdsRef = useRef(new Set());

  // =========================
  // Admin function
  // =========================
  const setUserRoleByUid = async (targetUid, role) => {
    if (!user || user.uid !== OWNER_UID) throw new Error("Không có quyền OWNER");
    await updateDoc(doc(db, "users", targetUid), { role });
  };

  // =========================
  // Restore từ API Key (Magic Link)
  // =========================
  const restoreFromKey = async (key, manual = false) => {
    const k = (key || "").trim();
    if (!k) return;

    try {
      const snap = await getDoc(doc(db, "keys", k));
      if (snap.exists()) {
        const data = snap.data();
        const address = data.address;
        const exp = safeToMillis(data.expiresAt);

        if (exp && Date.now() > exp) {
          if (manual) alert("Mail đã hết hạn (quá 24h).");
          return;
        }

        setCurrentAddress(address);
        setApiKey(k);

        localStorage.setItem(
          "currentSession",
          JSON.stringify({
            address,
            apiKey: k,
            createdAtMs: Date.now(),
            expiresAtMs: exp || null,
          })
        );

        localStorage.setItem("skipAuth", "1");
        setIsAuthScreen(false);

        window.history.replaceState({}, document.title, "/");

        if (manual) {
          // yêu cầu quyền thông báo bằng thao tác người dùng
          ensureNotificationPermission();
          alert(`Đã khôi phục thành công: ${address}`);
        }
        return;
      }
    } catch {
      // ignore
    }

    const localHist = JSON.parse(localStorage.getItem("guestHistory") || "[]");
    const localMatch = localHist.find((h) => h.apiKey === k);
    if (localMatch?.address) {
      setCurrentAddress(localMatch.address);
      setApiKey(k);
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          address: localMatch.address,
          apiKey: k,
          createdAtMs: localMatch.createdAtMs || Date.now(),
          expiresAtMs: localMatch.expiresAtMs || null,
        })
      );
      localStorage.setItem("skipAuth", "1");
      setIsAuthScreen(false);
      window.history.replaceState({}, document.title, "/");
      if (manual) {
        ensureNotificationPermission();
        alert(`Đã khôi phục thành công: ${localMatch.address}`);
      }
      return;
    }

    if (manual) alert("Không tìm thấy API Key này!");
  };

  // =========================
  // Refresh inbox (không reload trang)
  // =========================
  const refreshInbox = (e) => {
    e?.preventDefault?.();
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // =========================
  // Limit check (Guest + User thường)
  // =========================
  const checkLimitAndBump = async () => {
    if (isVip) return true;

    if (!user) {
      const today = todayKey();
      const local = JSON.parse(localStorage.getItem("guestLimit") || "{}");
      const count = local.date === today ? Number(local.count || 0) : 0;

      if (count >= DAILY_LIMIT) {
        alert("Hết lượt tạo mail hôm nay. Đăng nhập hoặc nâng cấp Admin để không giới hạn!");
        setIsAuthScreen(true);
        return false;
      }

      const newCount = count + 1;
      setGuestCount(newCount);
      localStorage.setItem("guestLimit", JSON.stringify({ date: today, count: newCount }));
      return true;
    }

    try {
      const today = todayKey();
      const userRef = doc(db, "users", user.uid);

      const newCount = await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        const du = data.dailyUsage || { date: today, count: 0 };
        const cur = du.date === today ? Number(du.count || 0) : 0;

        if (cur >= DAILY_LIMIT) throw new Error("Hết lượt tạo mail hôm nay (10/10).");

        const next = cur + 1;
        tx.update(userRef, { dailyUsage: { date: today, count: next } });
        return next;
      });

      setUserData((prev) => ({
        ...(prev || {}),
        dailyUsage: { date: todayKey(), count: newCount },
      }));

      return true;
    } catch (e) {
      alert(String(e?.message || e));
      return false;
    }
  };

  // =========================
  // Reserve email (đảm bảo không trùng)
  // =========================
  const reserveAddress = async (addressLower) => {
    const ref = doc(db, "reserved_addresses", addressLower);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("EXISTS");
        tx.set(ref, {
          address: addressLower,
          createdAt: serverTimestamp(),
          uid: user ? user.uid : "guest",
        });
      });
      return true;
    } catch {
      return false;
    }
  };

  // =========================
  // Create mail
  // =========================
  const handleCreateMail = async (custom = null) => {
    // yêu cầu quyền notification bằng thao tác người dùng (click)
    ensureNotificationPermission();

    const ok = await checkLimitAndBump();
    if (!ok) return;

    let localPart = "";
    if (custom) {
      localPart = normalizeLocalPart(custom);
      if (!isValidLocalPart(localPart)) {
        alert("Tên mail chỉ gồm a-z 0-9 . _ - (tối đa 32 ký tự)");
        return;
      }
    }

    let address = "";
    if (localPart) {
      address = `${localPart}@${EMAIL_DOMAIN}`.toLowerCase();
      const okReserve = await reserveAddress(address);
      if (!okReserve) {
        alert("Mail này đã tồn tại. Vui lòng chọn tên khác!");
        return;
      }
    } else {
      let tries = 0;
      while (tries < 25) {
        const candidate = `${makeRandomLocalPart(10)}@${EMAIL_DOMAIN}`.toLowerCase();
        const okReserve = await reserveAddress(candidate);
        if (okReserve) {
          address = candidate;
          break;
        }
        tries++;
      }
      if (!address) {
        alert("Không tạo được mail (bị trùng quá nhiều). Thử lại!");
        return;
      }
    }

    let key = "";
    for (let i = 0; i < 15; i++) {
      const k = makeApiKey();
      const ks = await getDoc(doc(db, "keys", k));
      if (!ks.exists()) {
        key = k;
        break;
      }
    }
    if (!key) {
      alert("Không tạo được API Key. Thử lại!");
      return;
    }

    const expiresAt = isVip ? null : Timestamp.fromMillis(Date.now() + ONE_DAY_MS);

    const session = {
      address,
      apiKey: key,
      createdAtMs: Date.now(),
      expiresAtMs: expiresAt ? expiresAt.toMillis() : null,
    };
    localStorage.setItem("currentSession", JSON.stringify(session));
    localStorage.setItem("skipAuth", "1");
    setIsAuthScreen(false);

    setCurrentAddress(address);
    setApiKey(key);
    setInbox([]);
    setSelectedMail(null);
    setSearchText("");
    setSortMode("newest");

    // reset read list for new mailbox (localStorage key changes by currentAddress effect)

    const link = `${WEB_BASE}/${key}`;

    await setDoc(doc(db, "keys", key), {
      apiKey: key,
      address,
      uid: user ? user.uid : "guest",
      createdAt: serverTimestamp(),
      ...(expiresAt ? { expiresAt } : {}),
    });

    const historyData = {
      address,
      apiKey: key,
      link,
      service: "-",
      createdAt: serverTimestamp(),
      ...(expiresAt ? { expiresAt } : {}),
      uid: user ? user.uid : "guest",
    };

    if (user) {
      await setDoc(doc(db, "history", key), historyData);
    } else {
      pruneGuestHistory();
      const localHist = JSON.parse(localStorage.getItem("guestHistory") || "[]");
      localHist.unshift({
        address,
        apiKey: key,
        link,
        service: "-",
        createdAt: new Date().toLocaleString(),
        createdAtMs: Date.now(),
        expiresAtMs: session.expiresAtMs,
        uid: "guest",
      });
      localStorage.setItem("guestHistory", JSON.stringify(localHist));
    }
  };

  // =========================
  // Logout
  // =========================
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("currentSession");
    setCurrentAddress(null);
    setApiKey(null);
    setView("HOME");
    setMenuOpen(false);
    setSelectedMail(null);
    setIsAuthScreen(false);
  };

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    pruneGuestHistory();

    const magicKey = getMagicKeyFromUrl();
    if (magicKey) restoreFromKey(magicKey);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) setUserData(snap.data());
        else {
          setUserData({
            username: currentUser.email.split("@")[0],
            role: "user",
            dailyUsage: { date: todayKey(), count: 0 },
          });
        }

        setIsAuthScreen(false);
      } else {
        setUser(null);
        setUserData(null);

        const today = todayKey();
        const local = JSON.parse(localStorage.getItem("guestLimit") || "{}");
        if (local.date === today) setGuestCount(Number(local.count || 0));
        else {
          localStorage.setItem("guestLimit", JSON.stringify({ date: today, count: 0 }));
          setGuestCount(0);
        }

        const skipped = localStorage.getItem("skipAuth") === "1";
        const hasSession = !!localStorage.getItem("currentSession");
        setIsAuthScreen(!skipped && !hasSession);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // Listen inbox + notify + auto update "service"
  // =========================
  useEffect(() => {
    if (!currentAddress) return;

    inboxInitRef.current = false;
    prevIdsRef.current = new Set();

    const q = query(collection(db, "emails"), where("to", "==", currentAddress));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const mails = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      mails.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      // ✅ notifications for new mails (skip initial load)
      const currentIds = new Set(mails.map((m) => m.id));
      if (inboxInitRef.current) {
        const prev = prevIdsRef.current || new Set();
        const newOnes = mails.filter((m) => !prev.has(m.id));
        if (newOnes.length > 0) {
          // chỉ notify 1 cái mới nhất
          const m0 = newOnes[0];
          const from = String(m0.from || "Unknown");
          const subject = String(m0.subject || "(No subject)");
          showMailNotification({
            title: `📩 Mail mới: ${subject}`,
            body: `${from}\n${new Date((m0.timestamp?.seconds || Math.floor(Date.now() / 1000)) * 1000).toLocaleString()}`,
            tag: `mail-${currentAddress}`,
          });
        }
      } else {
        inboxInitRef.current = true;
      }
      prevIdsRef.current = currentIds;

      setInbox(mails);

      // auto update "service"
      if (apiKey && mails.length > 0) {
        const s = inferService(mails[0]?.from || "", mails[0]?.subject || "");
        if (s && s !== "-") {
          if (user) {
            try {
              const hRef = doc(db, "history", apiKey);
              const hSnap = await getDoc(hRef);
              if (hSnap.exists()) {
                const cur = hSnap.data();
                if (!cur.service || cur.service === "-") await updateDoc(hRef, { service: s });
              }
            } catch {}
          } else {
            const localHist = JSON.parse(localStorage.getItem("guestHistory") || "[]");
            const idx = localHist.findIndex((h) => h.apiKey === apiKey);
            if (idx >= 0 && (!localHist[idx].service || localHist[idx].service === "-")) {
              localHist[idx].service = s;
              localStorage.setItem("guestHistory", JSON.stringify(localHist));
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [currentAddress, apiKey, user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthScreen && !user) {
    return (
      <AuthScreen
        onSkip={() => {
          localStorage.setItem("skipAuth", "1");
          setIsAuthScreen(false);
        }}
        onLoginSuccess={() => {
          localStorage.setItem("skipAuth", "1");
          setIsAuthScreen(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm h-16 fixed w-full top-0 z-50 flex items-center justify-between px-4 lg:px-8">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setView("HOME");
            setMenuOpen(false);
          }}
        >
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">A</div>
          <span className="font-bold text-xl tracking-tight">
            ADBV<span className="text-blue-600">Mail</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center gap-2 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full border">
            {isVip ? (
              <>
                <i className="ph ph-crown-simple text-yellow-600"></i> VIP
              </>
            ) : (
              <>Limit: {usedCount}/{DAILY_LIMIT}</>
            )}
            {currentAddress && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white border text-[10px] text-gray-600">
                Unread: {unreadCount}
              </span>
            )}
          </span>

          {!user && (
            <button
              type="button"
              onClick={() => setIsAuthScreen(true)}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            >
              <i className="ph ph-user"></i> Đăng nhập
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition relative z-50"
          >
            <i className={`ph ${menuOpen ? "ph-x" : "ph-list"} text-2xl text-gray-700`}></i>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 bg-black/10 z-40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)}></div>

              <div className="absolute top-16 right-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex items-center gap-3">
                  <img
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.username || "Guest")}`}
                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                    alt="ava"
                  />
                  <div className="overflow-hidden">
                    <p className="font-bold text-gray-800 truncate">{userData?.username || "Guest"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || "Chưa đăng nhập"}</p>
                  </div>
                </div>

                <nav className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setView("HOME");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition"
                  >
                    <i className="ph ph-house text-lg text-blue-600"></i> Trang chủ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) return setIsAuthScreen(true);
                      setView("PROFILE");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition"
                  >
                    <i className="ph ph-user-circle text-lg text-purple-600"></i> Thông tin cá nhân
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("HISTORY");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition"
                  >
                    <i className="ph ph-clock-counter-clockwise text-lg text-orange-600"></i> Lịch sử
                  </button>

                  {user?.uid === OWNER_UID && (
                    <button
                      type="button"
                      onClick={() => {
                        setView("OWNER_ADMIN");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-yellow-50 text-gray-800 font-medium flex items-center gap-3 transition border-t mt-1 pt-3"
                    >
                      <i className="ph ph-shield-star text-lg text-yellow-600"></i> Quản trị (Owner)
                    </button>
                  )}

                  <div className="border-t my-2 border-gray-100"></div>

                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-medium flex items-center gap-3 transition"
                    >
                      <i className="ph ph-sign-out text-lg"></i> Đăng xuất
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAuthScreen(true)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 text-blue-600 font-medium flex items-center gap-3 transition"
                    >
                      <i className="ph ph-sign-in text-lg"></i> Đăng nhập / Đăng ký
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await ensureNotificationPermission();
                      alert(ok ? "Đã bật thông báo trình duyệt ✅" : "Không bật được thông báo (bị chặn hoặc bạn từ chối).");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-3 transition"
                  >
                    <i className="ph ph-bell text-lg text-gray-600"></i> Bật thông báo
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mt-20 p-4 max-w-5xl mx-auto w-full pb-20">
        {view === "HOME" && (
          <div className="space-y-6 fade-in">
            {/* CREATE AREA */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h1 className="text-xl font-bold text-gray-800 mb-4">Tạo Hộp Thư Mới</h1>

              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex-1 flex shadow-sm rounded-lg group focus-within:ring-2 ring-blue-100 transition">
                  <input
                    type="text"
                    placeholder="Nhập tên mail..."
                    className="flex-1 p-3 border border-r-0 border-gray-200 rounded-l-lg outline-none text-gray-700"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <div className="bg-gray-50 border border-l-0 border-gray-200 px-4 flex items-center text-gray-500 font-medium rounded-r-lg">
                    @{EMAIL_DOMAIN}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!customName.trim()) return alert("Vui lòng nhập tên!");
                    handleCreateMail(customName);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-200 transition active:scale-95"
                >
                  Tạo
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleCreateMail()}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-lg font-medium transition flex items-center justify-center gap-2 active:scale-95"
              >
                <i className="ph ph-shuffle"></i> Tạo Ngẫu Nhiên
              </button>

              {!currentAddress && (
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập API Key để khôi phục mail..."
                    className="flex-1 p-3 border rounded-lg bg-gray-50 focus:bg-white outline-none"
                    value={restoreKey}
                    onChange={(e) => setRestoreKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      ensureNotificationPermission();
                      restoreFromKey(restoreKey, true);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-lg font-medium shadow-lg shadow-orange-200"
                  >
                    Khôi phục
                  </button>
                </div>
              )}

              {!isVip && (
                <div className="mt-3 text-xs text-gray-500">
                  * Guest/User thường: giới hạn {DAILY_LIMIT} mail/ngày. Mail sẽ hết hạn sau 24h (nếu bật TTL).
                </div>
              )}
            </div>

            {/* INFO & INBOX */}
            {currentAddress && (
              <div className="fade-in space-y-6">
                <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition">
                    <i className="ph ph-envelope-open text-9xl text-blue-600"></i>
                  </div>

                  <p className="text-blue-600 font-medium mb-1 text-sm uppercase tracking-wider">Địa chỉ Email của bạn</p>

                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 break-all">{currentAddress}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentAddress);
                        alert("Đã copy!");
                      }}
                      className="p-2 bg-white rounded-lg shadow-sm hover:scale-110 transition text-blue-600"
                    >
                      <i className="ph ph-copy text-xl"></i>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white/80 p-3 rounded-lg border border-blue-100 backdrop-blur-sm">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">API Key (Dùng để khôi phục)</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-gray-700 truncate mr-2">{apiKey}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey);
                            alert("Đã copy API Key!");
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <i className="ph ph-copy"></i>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-blue-100 backdrop-blur-sm">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Magic Link (Truy cập nhanh)</p>
                      <div className="flex items-center justify-between">
                        <a
                          href={`${WEB_BASE}/${apiKey}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-500 underline truncate mr-2"
                        >
                          {WEB_BASE}/{apiKey}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${WEB_BASE}/${apiKey}`);
                            alert("Đã copy Link!");
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <i className="ph ph-copy"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INBOX */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[420px] flex flex-col">
                  <div className="p-4 border-b bg-gray-50 rounded-t-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <i className="ph ph-tray text-lg text-blue-600"></i> Hộp thư đến
                      </h3>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Real-time
                        </div>

                        <button
                          type="button"
                          onClick={refreshInbox}
                          className={`p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition ${
                            refreshing ? "animate-spin text-blue-600" : ""
                          }`}
                          title="Làm mới"
                        >
                          <i className="ph ph-arrows-clockwise text-lg"></i>
                        </button>
                      </div>
                    </div>

                    {/* Search + Sort */}
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                        <i className="ph ph-magnifying-glass text-gray-400"></i>
                        <input
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Tìm theo người gửi / tiêu đề / nội dung..."
                          className="w-full outline-none text-sm text-gray-700"
                        />
                      </div>

                      <select
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value)}
                        title="Sắp xếp"
                      >
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="from">Theo người gửi</option>
                        <option value="subject">Theo tiêu đề</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1">
                    {filteredInbox.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                        <i className="ph ph-envelope-simple-open text-6xl mb-4"></i>
                        <p className="font-medium">{inbox.length === 0 ? "Chưa có thư nào" : "Không có kết quả"}</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {filteredInbox.map((mail) => {
                          const when = mail.timestamp?.seconds
                            ? new Date(mail.timestamp.seconds * 1000).toLocaleString()
                            : "Vừa xong";
                          const service = inferService(mail.from || "", mail.subject || "");
                          const isRead = readSet.has(mail.id);
                          const preview = cleanMailText(mail.body || "");
                          return (
                            <li
                              key={mail.id}
                              onClick={() => {
                                setSelectedMail(mail);
                                markRead(mail.id);
                              }}
                              className={`relative p-5 cursor-pointer transition ${
                                isRead ? "opacity-60 hover:opacity-80" : "hover:bg-blue-50/50"
                              }`}
                            >
                              {!isRead && (
                                <span className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-blue-600" title="Chưa đọc" />
                              )}

                              <div className="flex justify-between items-start mb-2 gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {(mail.from || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-bold text-gray-800 truncate">{mail.from || "Unknown"}</span>
                                      {service !== "-" && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border text-gray-600 shrink-0">
                                          {service}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      <span className="font-semibold">To:</span> {mail.to || currentAddress}
                                    </div>
                                  </div>
                                </div>

                                <span className="text-xs text-gray-400 whitespace-nowrap">{when}</span>
                              </div>

                              <p className="font-bold text-sm text-gray-700 mb-1 pl-10">{mail.subject || "(No subject)"}</p>
                              <p className="text-sm text-gray-500 line-clamp-2 pl-10">{preview || "(No content)"}</p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* ✅ MODAL: đọc mail trực quan + hiển thị FULL luôn (HTML nếu có) */}
                {selectedMail && (
                  <>
                    <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setSelectedMail(null)} />
                    <div className="fixed inset-0 z-[61] flex items-center justify-center p-3 sm:p-4">
                      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border">
                        <div className="p-4 border-b bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-lg sm:text-xl font-extrabold text-gray-900 break-words">
                                {selectedMail.subject || "(No subject)"}
                              </div>

                              <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs sm:text-sm text-gray-600">
                                <div className="break-words">
                                  <span className="font-semibold text-gray-800">From:</span>{" "}
                                  {selectedMail.from || "Unknown"}
                                </div>
                                <div className="break-words">
                                  <span className="font-semibold text-gray-800">To:</span>{" "}
                                  {selectedMail.to || currentAddress}
                                </div>
                                <div className="break-words">
                                  <span className="font-semibold text-gray-800">Received:</span>{" "}
                                  {selectedMail.timestamp?.seconds
                                    ? new Date(selectedMail.timestamp.seconds * 1000).toLocaleString()
                                    : "Vừa xong"}
                                </div>
                                <div className="break-words">
                                  <span className="font-semibold text-gray-800">Service:</span>{" "}
                                  {inferService(selectedMail.from || "", selectedMail.subject || "")}
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const txt = cleanMailText(selectedMail.body || "");
                                    navigator.clipboard.writeText(txt);
                                    alert("Đã copy nội dung!");
                                  }}
                                  className="px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white hover:bg-gray-50"
                                >
                                  <i className="ph ph-copy mr-1"></i> Copy nội dung
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const srcDoc = getMailIframeDoc(selectedMail.body || "");
                                    const w = window.open("", "_blank");
                                    if (w) {
                                      w.document.open();
                                      w.document.write(srcDoc);
                                      w.document.close();
                                    }
                                  }}
                                  className="px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white hover:bg-gray-50"
                                >
                                  <i className="ph ph-arrow-square-out mr-1"></i> Mở toàn màn hình
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedMail(null)}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title="Đóng"
                            >
                              <i className="ph ph-x text-xl"></i>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 sm:p-4 bg-gray-50">
                          <iframe
                            title="mail-view"
                            sandbox="allow-popups allow-top-navigation-by-user-activation"
                            className="w-full rounded-xl border bg-white"
                            style={{ height: "72vh" }}
                            srcDoc={getMailIframeDoc(selectedMail.body || "")}
                          />
                          <div className="mt-2 text-[11px] text-gray-500">
                            * Email từ CapCut/Facebook thường là HTML. Mình render trực tiếp để bạn xem đầy đủ.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {view === "PROFILE" && user && userData && <ProfileView user={user} userData={userData} auth={auth} />}
        {view === "HISTORY" && <HistoryView db={db} user={user} />}
        {view === "OWNER_ADMIN" && <OwnerAdminPanel db={db} user={user} setUserRoleByUid={setUserRoleByUid} />}
      </main>
    </div>
  );
}
