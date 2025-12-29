import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env");

  const sa = JSON.parse(raw);

  // an toàn với trường hợp private_key bị xuống dòng dạng \n
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(sa),
  });

  return admin;
}

function cleanSnippet(s = "") {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    // bảo mật: worker phải gửi đúng secret
    const secret = req.headers["x-ingest-secret"];
    if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const a = getAdmin();
    const db = a.firestore();

    const body = req.body || {};
    const to = String(body.to || "").toLowerCase().trim();
    if (!to) return res.status(400).json({ ok: false, error: "Missing `to`" });

    const receivedAtIso = body.receivedAt || new Date().toISOString();
    const receivedAtDate = new Date(receivedAtIso);
    const timestamp = a.firestore.Timestamp.fromDate(isNaN(receivedAtDate.getTime()) ? new Date() : receivedAtDate);

    // TTL: mặc định 24h (bạn có thể chỉnh)
    const expiresAt = a.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

    const docData = {
      to,
      from: String(body.from || ""),
      fromName: String(body.fromName || ""),
      subject: String(body.subject || "(No subject)"),
      dateHeader: String(body.dateHeader || ""),
      receivedAt: receivedAtIso,
      timestamp, // để sort
      html: String(body.html || ""),
      text: String(body.text || ""),
      raw: String(body.raw || ""),
      snippet: cleanSnippet(body.text || body.html || body.raw || ""),
      expiresAt, // cho cleanup / TTL
      createdAt: a.firestore.FieldValue.serverTimestamp(),
    };

    // auto-id
    const ref = await db.collection("emails").add(docData);
    return res.status(200).json({ ok: true, id: ref.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
