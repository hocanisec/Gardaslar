require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs"); // Dosya kontrolü için ekledik

// 1. FIREBASE BAĞLANTISI (Render Uyumlu Hata Kontrolü)
const serviceAccountPath = "./serviceAccountKey.json";

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🚀 Firebase Admin Başlatıldı");
} else {
  console.error("❌ HATA: serviceAccountKey.json dosyası bulunamadı!");
  console.info("💡 İpucu: Render panelinde 'Secret Files' kısmına bu dosyayı eklediğinizden emin olun.");
}

const db = admin.firestore(); 

const sendCode = require("./mailer");
const { createCode, verifyCode } = require("./codes");

const app = express();
app.use(cors());
app.use(express.json());

// 2. KÜFÜR FİLTRESİ
function cleanBadWords(text) {
  const bannedWords = ["küfür1", "salak", "aptal"]; 
  let cleaned = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(word, "gi");
    cleaned = cleaned.replace(regex, "***");
  });
  return cleaned;
}

// 3. API ENDPOINT'LERİ

// Ana Sayfa Testi (Render'ın çalışıp çalışmadığını anlamak için)
app.get("/", (req, res) => res.send("HocanıSeç Backend Firebase ile Aktif ✅"));

// HOCA ARAMA
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ profs: [] });

  try {
    const snapshot = await db.collection("professors").get();
    let allProfs = [];
    snapshot.forEach(doc => allProfs.push({ id: doc.id, ...doc.data() }));

    const filtered = allProfs.filter(p => 
      (p.name && p.name.toLowerCase().includes(query.toLowerCase())) || 
      (p.school && p.school.toLowerCase().includes(query.toLowerCase()))
    );

    res.json({ profs: filtered.slice(0, 10) });
  } catch (err) {
    console.error("Arama hatası:", err);
    res.status(500).json({ error: "Arama hatası" });
  }
});

// YORUM GÖNDERME
app.post("/api/comments", async (req, res) => {
  let { profId, text, rating, token } = req.body;
  if (!token) return res.status(401).json({ error: "Giriş yapmalısın" });

  try {
    const moderatedText = cleanBadWords(text);
    const newComment = {
      profId,
      text: moderatedText,
      rating: Number(rating),
      helpful: 0,
      isApproved: false,
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection("comments").add(newComment);
    res.json({ ok: true, msg: "Yorum onay için gönderildi." });
  } catch (err) {
    res.status(500).json({ error: "Yorum kaydedilemedi." });
  }
});

// HOCAYA AİT ONAYLANMIŞ YORUMLARI GETİR
app.get("/api/comments/:profId", async (req, res) => {
  try {
    const snapshot = await db.collection("comments")
      .where("profId", "==", req.params.profId)
      .where("isApproved", "==", true)
      .get();
    
    let comments = [];
    snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Yorumlar çekilemedi." });
  }
});

// MAIL KODU GÖNDERME
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  try {
    const code = createCode(email);
    await sendCode(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Mail hatası" });
  }
});

app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const ok = verifyCode(email, code);
  if (!ok) return res.status(400).json({ error: "Kod hatalı" });
  res.json({ ok: true, token: "verified-" + Date.now() });
});

// 4. PORT AYARI (Render için 10000 veya process.env.PORT şarttır)
const PORT = process.env.PORT || 10000; 
// --- ADMIN API ---
app.get("/api/admin/stats", async (req, res) => {
  const profs = await db.collection("professors").get();
  res.json({ profCount: profs.size, schoolCount: 208 });
});

app.get("/api/admin/professors", async (req, res) => {
  const snapshot = await db.collection("professors").get();
  let list = [];
  snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  res.json(list);
});

app.post("/api/admin/professors", async (req, res) => {
  const { name, school } = req.body;
  await db.collection("professors").add({ name, school, avgRating: 0 });
  res.json({ ok: true });
});

app.delete("/api/admin/professors/:id", async (req, res) => {
  await db.collection("professors").doc(req.params.id).delete();
  res.json({ ok: true });
});

app.get("/api/admin/pending-comments", async (req, res) => {
  const snapshot = await db.collection("comments").where("isApproved", "==", false).get();
  let list = [];
  snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  res.json(list);
});

app.post("/api/admin/approve-comment/:id", async (req, res) => {
  await db.collection("comments").doc(req.params.id).update({ isApproved: true });
  res.json({ ok: true });
});

app.delete("/api/admin/delete-comment/:id", async (req, res) => {
  await db.collection("comments").doc(req.params.id).delete();
  res.json({ ok: true });
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sunucu aktif: ${PORT}`);
});