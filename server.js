// server.js - GÜNCELLENMİŞ VERSİYON
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");

// 1. FIREBASE BAĞLANTISI
const serviceAccountPath = "./serviceAccountKey.json";

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("🚀 Firebase Admin Başlatıldı");
} else {
  console.error("❌ HATA: serviceAccountKey.json dosyası bulunamadı!");
}

const db = admin.firestore(); 
const sendCode = require("./mailer");
const { createCode, verifyCode } = require("./codes");

const app = express();
app.use(cors());
app.use(express.json());

// 2. KÜFÜR FİLTRESİ
function cleanBadWords(text) {
  const bannedWords = ["küfür1", "salak", "aptal", "gerizekalı"]; 
  let cleaned = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(word, "gi");
    cleaned = cleaned.replace(regex, "***");
  });
  return cleaned;
}

// 3. API ENDPOINT'LERİ

// Ana Sayfa Testi
app.get("/", (req, res) => res.send("HocanıSeç Backend Aktif ✅"));

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

// --- YENİ EKLENEN: KULLANICI KAYDI (NICKNAME İLE) ---
app.post("/api/auth/register", async (req, res) => {
  const { email, nickname } = req.body;
  if (!email || !nickname) return res.status(400).json({ error: "Eksik bilgi" });

  try {
    // Kullanıcıyı veritabanına kaydet
    await db.collection("users").doc(email).set({
      email: email,
      nickname: nickname,
      createdAt: admin.firestore.Timestamp.now()
    });
    res.json({ ok: true, message: "Kullanıcı kaydedildi." });
  } catch (err) {
    console.error("Kayıt hatası:", err);
    res.status(500).json({ error: "Kayıt oluşturulamadı." });
  }
});

// --- GÜNCELLENEN: YORUM GÖNDERME (KULLANICI BİLGİSİ İLE) ---
app.post("/api/comments", async (req, res) => {
  // Frontend'den email ve nickname bilgisini de bekliyoruz artık
  let { profId, text, rating, token, userEmail, userNickname } = req.body;
  
  if (!token) return res.status(401).json({ error: "Giriş yapmalısın" });

  try {
    const moderatedText = cleanBadWords(text);
    const newComment = {
      profId,
      text: moderatedText,
      rating: Number(rating),
      helpful: 0,
      isApproved: false,
      userEmail: userEmail || "anonim", // Kullanıcı emailini kaydet
      userNickname: userNickname || "Anonim", // Nickname'i kaydet
      createdAt: admin.firestore.Timestamp.now()
    };
    await db.collection("comments").add(newComment);
    res.json({ ok: true, msg: "Yorum onay için gönderildi." });
  } catch (err) {
    res.status(500).json({ error: "Yorum kaydedilemedi." });
  }
});

// --- YENİ EKLENEN: KULLANICININ KENDİ YORUMLARI ---
app.get("/api/my-comments", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email gerekli" });

  try {
    const snapshot = await db.collection("comments")
      .where("userEmail", "==", email)
      .get();
    
    let myComments = [];
    snapshot.forEach(doc => myComments.push({ id: doc.id, ...doc.data() }));
    res.json(myComments);
  } catch (err) {
    console.error("Yorum çekme hatası:", err);
    res.status(500).json({ error: "Yorumlar alınamadı." });
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
  if (!ok) return res.status(400).json({ error: "Kod hatalı veya süresi dolmuş" });
  res.json({ ok: true, token: "verified-" + Date.now() });
});

// ADMIN API KISIMLARI (Değişmedi)
app.get("/api/admin/stats", async (req, res) => {
  const profs = await db.collection("professors").get();
  res.json({ profCount: profs.size, schoolCount: 208 });
});
// ... (Diğer admin route'ları aynı kalabilir)

const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sunucu aktif: ${PORT}`);
});