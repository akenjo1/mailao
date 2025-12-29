// api/ingest.js
import admin from "firebase-admin";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function initAdmin() {
  if (admin.apps.length) return;

  const projectId = mustEnv("FIREBASE_PROJECT_ID");
  const clientEmail = mustEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = mustEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export default async function handler(req, res) {
  try {
    // chỉ nhận POST
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // check secret
    const secret = mustEnv("INGEST_SECRET");
    const got = req.headers["x-ingest-secret"];
    if (got !== secret) return res.status(401).send("Unauthorized");

    initAdmin();
    const db = admin.firestore();

    const body = req.body || {};
    const to = String(body.to || "").toLowerCase().trim();

    if (!to) return res.status(400).json({ ok: false, error: "Missing to" });

    const docData = {
      to,
      from: String(body.from || ""),
      fromName: String(body.fromName || ""),
      fromDisplay: String(body.fromName || body.from || "").trim(),
      subject: String(body.subject || "(No subject)"),
      dateHeader: String(body.dateHeader || ""),
      receivedAt: String(body.receivedAt || new Date().toISOString()),
      html: String(body.html || ""),
      text: String(body.text || ""),
      raw: String(body.raw || ""),
      // timestamp chuẩn để sort
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // lưu vào collection emails (frontend đang query where("to","==",currentAddress))
    await db.collection("emails").add(docData);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
