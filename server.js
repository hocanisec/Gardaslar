// server.js - SUPABASE VERSİYONU
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ozcdrdesudvbkecxthom.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2RyZGVzdWR2YmtlY3h0aG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDc1MDIsImV4cCI6MjA5NTg4MzUwMn0.Jj0a9-qy-CTVzV88AaH94dW0E6BdrUNu7ly55fu_Oos";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("Supabase Baglantisi Kuruldu");

const sendCode = require("./mailer");
const { createCode, verifyCode } = require("./codes");

const app = express();
app.use(cors());
app.use(express.json());

function cleanBadWords(text) {
  const bannedWords = ["salak", "aptal", "gerizekalı"];
  let cleaned = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(word, "gi");
    cleaned = cleaned.replace(regex, "***");
  });
  return cleaned;
}

app.get("/", (req, res) => res.send("HocanisEc Backend Aktif (Supabase)"));

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) return res.json({ profs: [] });
  try {
    const { data, error } = await supabase
      .from("professors")
      .select("id, name, title, school, department, faculty, avg_rating, comment_count")
      .or(`name.ilike.%${query.toUpperCase()}%,school.ilike.%${query.toUpperCase()}%`)
      .limit(10);
    if (error) throw error;
    res.json({ profs: data });
  } catch (err) {
    res.status(500).json({ error: "Arama hatasi" });
  }
});

// UNİVERSİTE HOCALARI (fakülte + sıralama)
app.get("/api/school-profs", async (req, res) => {
  const school = req.query.school;
  if (!school) return res.status(400).json({ error: "Okul adi gerekli" });
  try {
    const { data, error } = await supabase
      .from("professors")
      .select("id, name, title, department, faculty, avg_rating, comment_count, school")
      .ilike("school", school)
      .order("name");
    if (error) throw error;
    res.json({ profs: data });
  } catch (err) {
    console.error("School profs hatasi:", err);
    res.status(500).json({ error: "Hocalar alinamadi." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, nickname } = req.body;
  if (!email || !nickname) return res.status(400).json({ error: "Eksik bilgi" });
  try {
    const { error } = await supabase
      .from("users")
      .upsert({ email, nickname, created_at: new Date().toISOString() }, { onConflict: "email" });
    if (error) throw error;
    res.json({ ok: true, message: "Kullanici kaydedildi." });
  } catch (err) {
    res.status(500).json({ error: "Kayit olusturulamadi." });
  }
});

app.post("/api/comments", async (req, res) => {
  let { profId, text, rating, token, userEmail, userNickname } = req.body;
  if (!token) return res.status(401).json({ error: "Giris yapmalisin" });
  try {
    const moderatedText = cleanBadWords(text);
    const { error } = await supabase.from("comments").insert({
      prof_id: profId,
      text: moderatedText,
      rating: Number(rating),
      helpful: 0,
      is_approved: false,
      user_email: userEmail || "anonim",
      user_nickname: userNickname || "Anonim",
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    res.json({ ok: true, msg: "Yorum onay icin gonderildi." });
  } catch (err) {
    res.status(500).json({ error: "Yorum kaydedilemedi." });
  }
});

app.get("/api/my-comments", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email gerekli" });
  try {
    const { data, error } = await supabase.from("comments").select("*")
      .eq("user_email", email).order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Yorumlar alinamadi." });
  }
});

app.get("/api/comments/:profId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("comments").select("*")
      .eq("prof_id", req.params.profId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Yorumlar cekilemedi." });
  }
});

app.post("/api/comments/:commentId/vote", async (req, res) => {
  try {
    const { data: comment, error: fetchErr } = await supabase
      .from("comments").select("helpful").eq("id", req.params.commentId).single();
    if (fetchErr) throw fetchErr;
    const { error } = await supabase.from("comments")
      .update({ helpful: (comment.helpful || 0) + 1 }).eq("id", req.params.commentId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Oylama basarisiz." });
  }
});

app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  try {
    const code = createCode(email);
    await sendCode(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Mail hatasi" });
  }
});

app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const ok = verifyCode(email, code);
  if (!ok) return res.status(400).json({ error: "Kod hatali veya suresi dolmus" });
  res.json({ ok: true, token: "verified-" + Date.now() });
});

app.get("/api/admin/stats", async (req, res) => {
  try {
    const { count: profCount } = await supabase.from("professors").select("*", { count: "exact", head: true });
    const { count: schoolCount } = await supabase.from("universities").select("*", { count: "exact", head: true });
    res.json({ profCount, schoolCount });
  } catch (err) {
    res.status(500).json({ error: "Istatistikler alinamadi." });
  }
});

app.get("/api/admin/professors", async (req, res) => {
  try {
    const { data, error } = await supabase.from("professors").select("id, name, school, department").order("name");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Hocalar alinamadi." });
  }
});

app.post("/api/admin/professors", async (req, res) => {
  const { name, school } = req.body;
  try {
    const { error } = await supabase.from("professors").insert({ name, school, avg_rating: 0, comment_count: 0 });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Hoca eklenemedi." });
  }
});

app.delete("/api/admin/professors/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("professors").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Hoca silinemedi." });
  }
});

app.get("/api/admin/pending-comments", async (req, res) => {
  try {
    const { data, error } = await supabase.from("comments").select("*")
      .eq("is_approved", false).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Yorumlar alinamadi." });
  }
});

app.post("/api/admin/approve-comment/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("comments").update({ is_approved: true }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Yorum onaylanamadi." });
  }
});

app.delete("/api/admin/delete-comment/:id", async (req, res) => {
  try {
    const { error } = await supabase.from("comments").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Yorum silinemedi." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Sunucu aktif: " + PORT);
});
