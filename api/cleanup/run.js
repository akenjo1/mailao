import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
    const sa = JSON.parse(raw);
    initializeApp({ credential: cert(sa) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

    const secret = req.headers["x-cleanup-secret"] || req.query.secret || req.query.key || "";
    if (!process.env.CLEANUP_SECRET) return res.status(500).json({ ok: false, error: "Missing CLEANUP_SECRET on Vercel" });
    if (String(secret) !== String(process.env.CLEANUP_SECRET)) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const db = getAdminDb();
    const now = Timestamp.now();

    // Xoá các mail đã hết hạn (expiresAt <= now)
    const q = db.collection("emails").where("expiresAt", "<=", now).limit(400);
    let deleted = 0;

    while (true) {
      const snap = await q.get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      deleted += snap.size;
      if (snap.size < 400) break;
    }

    return res.json({ ok: true, deleted });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
