import admin from "firebase-admin";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function initAdmin() {
  if (admin.apps.length) return;

  // Cách dễ nhất: lưu JSON service account vào env FIREBASE_SERVICE_ACCOUNT
  // Vercel: Settings -> Environment Variables -> FIREBASE_SERVICE_ACCOUNT
  const saRaw = mustEnv("FIREBASE_SERVICE_ACCOUNT");
  const serviceAccount = JSON.parse(saRaw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function stripHtml(html = "") {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makePreview({ text, html }) {
  const base = (text && text.trim()) ? text.trim() : stripHtml(html || "");
  return base.slice(0, 220);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

    const secret = req.headers["x-ingest-secret"];
    if (!secret || secret !== mustEnv("INGEST_SECRET")) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    initAdmin();
    const db = admin.firestore();

    const {
      to,
      fromEmail,
      fromName,
      subject,
      dateHeader,
      receivedAt,
      html,
      text,
      raw,
    } = req.body || {};

    if (!to) return res.status(400).json({ ok: false, error: "MISSING_TO" });

    const docData = {
      to: String(to).toLowerCase().trim(),
      fromEmail: String(fromEmail || "").trim(),
      fromName: String(fromName || "").trim(),
      subject: String(subject || "(No subject)").trim(),
      dateHeader: String(dateHeader || "").trim(),
      receivedAt: String(receivedAt || new Date().toISOString()),
      html: String(html || ""),
      text: String(text || ""),
      raw: String(raw || ""),
      preview: makePreview({ text, html }),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("emails").add(docData);

    return res.status(200).json({ ok: true, id: ref.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
