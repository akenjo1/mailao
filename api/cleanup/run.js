import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON on Vercel");
  const svc = JSON.parse(raw);

  // fix private_key bị \n
  if (svc.private_key) svc.private_key = svc.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({ credential: admin.credential.cert(svc) });
  return admin;
}

export default async function handler(req, res) {
  try {
    // chỉ cho GET
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const secretExpected = process.env.CLEANUP_SECRET;
    if (!secretExpected) return res.status(500).json({ ok: false, error: "Missing CLEANUP_SECRET on Vercel" });

    const secretGot = req.headers["x-cleanup-secret"]; // header name luôn lowercase trên Vercel
    if (!secretGot || secretGot !== secretExpected) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const a = getAdmin();
    const db = a.firestore();

    const now = new Date();

    // Xoá key hết hạn (collection keys)
    const snap = await db
      .collection("keys")
      .where("expiresAt", "<", a.firestore.Timestamp.fromDate(now))
      .limit(300) // tránh quá nặng
      .get();

    let deletedKeys = 0;

    const batch = db.batch();
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
      deletedKeys++;
    });
    if (deletedKeys > 0) await batch.commit();

    return res.json({ ok: true, deletedKeys });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
