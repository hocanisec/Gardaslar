require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// 1. FIREBASE BAĞLANTISI
// Bu dosyanın (serviceAccountKey.json) backend klasöründe olduğundan emin ol!
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); 

const sendCode = require("./mailer");
const { createCode, verifyCode } = require("./codes");

const app = express();
app.use(cors());
app.use(express.json());

// 2. KÜFÜR FİLTRESİ (Basit versiyon)
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

// Sunucu çalışıyor mu testi
app.get("/", (req, res) => res.send("✅ HocanıSeç Backend Firebase ile Aktif!"));

// FIREBASE ÜZERİNDEN HOCA ARAMA
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ profs: [] });

  try {
    const snapshot = await db.collection("professors").get();
    let allProfs = [];
    snapshot.forEach(doc => allProfs.push({ id: doc.id, ...doc.data() }));

    const filtered = allProfs.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.school.toLowerCase().includes(query.toLowerCase())
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

// OTP (MAİL KODU) İŞLEMLERİ
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  try {
    const code = createCode(email);
    await sendCode(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Mail gönderilemedi." });
  }
});

app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const ok = verifyCode(email, code);
  if (!ok) return res.status(400).json({ error: "Kod hatalı" });
  res.json({ ok: true, token: "verified-" + Date.now() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend Firebase ile çalışıyor: http://localhost:${PORT}`));