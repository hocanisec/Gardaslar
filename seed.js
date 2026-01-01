// backend/seed.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase bağlantısını kur
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test için Türkiye'nin en popüler hocalarından bir liste
const hocalar = [
  { name: "Celal Şengör", school: "İstanbul Teknik Üniversitesi", department: "Jeoloji" },
  { name: "İlber Ortaylı", school: "Galatasaray Üniversitesi", department: "Tarih" },
  { name: "Özgür Demirtaş", school: "Sabancı Üniversitesi", department: "Finans" },
  { name: "Naci Görür", school: "İstanbul Teknik Üniversitesi", department: "Jeoloji" },
  { name: "Emrah Safa Gürkan", school: "29 Mayıs Üniversitesi", department: "Tarih" },
  { name: "Canan Dağdeviren", school: "Hacettepe Üniversitesi", department: "Fizik" },
  { name: "Daron Acemoğlu", school: "Galatasaray Üniversitesi", department: "Ekonomi" },
  { name: "Selçuk Şirin", school: "ODTÜ", department: "Eğitim" }
];

async function yukle() {
  console.log("⏳ Hocalar veritabanına ekleniyor...");
  
  const batch = db.batch();
  
  hocalar.forEach((hoca) => {
    // professors isimli bir tabloya (collection) rastgele ID ile ekle
    const docRef = db.collection("professors").doc();
    batch.set(docRef, hoca);
  });

  await batch.commit();
  console.log("✅ İşlem tamam! Firebase sayfasına bakabilirsin.");
  process.exit();
}

yukle();