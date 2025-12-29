import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });
  return admin;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, endpoint: "cleanup" });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const secret = req.headers["x-cleanup-secret"];
    if (!process.env.CLEANUP_SECRET || secret !== process.env.CLEANUP_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const a = getAdmin();
    const db = a.firestore();
    const now = a.firestore.Timestamp.now();

    // Xoá emails hết hạn theo expiresAt
    const snap = await db.collection("emails").where("expiresAt", "<=", now).limit(400).get();
    if (snap.empty) return res.status(200).json({ ok: true, deleted: 0 });

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return res.status(200).json({ ok: true, deleted: snap.size });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
