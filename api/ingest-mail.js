import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });
  return admin;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, endpoint: "ingest-mail" });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const secret = req.headers["x-ingest-secret"];
    if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const payload = await readJson(req);

    const to = String(payload.to || "").toLowerCase().trim();
    if (!to) return res.status(400).json({ ok: false, error: "Missing to" });

    const fromEmail = String(payload.from || "").trim();
    const fromName = String(payload.fromName || "").trim();
    const subject = String(payload.subject || "(No subject)").trim();
    const dateHeader = String(payload.dateHeader || "").trim();
    const receivedAt = String(payload.receivedAt || new Date().toISOString());

    // Ưu tiên html để render giống CapCut; fallback text
    const html = String(payload.html || "");
    const text = String(payload.text || "");
    const raw = String(payload.raw || "");

    // FE hiện tại đang đọc mail.body + mail.timestamp => giữ tương thích
    const body = html || text || raw;

    const a = getAdmin();
    const db = a.firestore();

    // TTL mặc định 24h (bạn có thể đổi)
    const expiresAt = a.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const docData = {
      to,
      from: fromEmail,
      fromName,
      subject,
      dateHeader,
      receivedAt, // ISO
      html,
      text,
      body,
      // để FE sort/hiển thị như cũ
      timestamp: a.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    };

    const ref = await db.collection("emails").add(docData);
    return res.status(200).json({ ok: true, id: ref.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
