import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env");

  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });

  return admin;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const secret = req.headers["x-cleanup-secret"];
    if (!process.env.CLEANUP_SECRET || secret !== process.env.CLEANUP_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const a = getAdmin();
    const db = a.firestore();

    const now = a.firestore.Timestamp.fromMillis(Date.now());
    let deleted = 0;

    // Xoá theo lô (batch)
    while (true) {
      const snap = await db
        .collection("emails")
        .where("expiresAt", "<=", now)
        .orderBy("expiresAt", "asc")
        .limit(200)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      deleted += snap.size;

      // chống loop vô tận
      if (snap.size < 200) break;
    }

    return res.status(200).json({ ok: true, deleted });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
