// migrate-to-firebase.js
// Bu script PostgreSQL veritabanınızdaki verileri Firebase'e aktarır

const admin = require("firebase-admin");
const fs = require("fs");
const readline = require("readline");

// Firebase bağlantısı
const serviceAccount = require("./asıl proje/backend/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Firebase koleksiyonunu temizleme fonksiyonu
async function clearCollection(collectionName) {
  const batchSize = 500;
  const collectionRef = db.collection(collectionName);
  
  let deleted = 0;
  let query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });

  async function deleteQueryBatch(query, resolve, reject) {
    try {
      const snapshot = await query.get();

      if (snapshot.size === 0) {
        resolve(deleted);
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deleted += snapshot.size;
      console.log(`   ${deleted} belge silindi...`);

      // Devam et
      process.nextTick(() => {
        deleteQueryBatch(query, resolve, reject);
      });
    } catch (error) {
      reject(error);
    }
  }
}

async function parseAndMigrate() {
  console.log("🚀 Migration başlatılıyor...");
  
  // Firebase'i temizle
  console.log("\n🧹 Mevcut veriler temizleniyor...");
  console.log("   (Bu işlem birkaç saniye sürebilir)");
  
  try {
    const profCount = await clearCollection("professors");
    console.log(`   ✅ ${profCount} professor silindi`);
    
    const uniCount = await clearCollection("universities");
    console.log(`   ✅ ${uniCount} university silindi`);
    
    const deptCount = await clearCollection("departments");
    console.log(`   ✅ ${deptCount} department silindi`);
    
    console.log("\n✨ Firebase temizlendi, yeni veriler yükleniyor...\n");
  } catch (error) {
    console.error("❌ Temizleme hatası:", error);
    console.log("⚠️ Devam ediliyor...\n");
  }

  const universities = new Map(); // id -> university
  const departments = new Map();  // id -> department
  const professors = [];

  const fileStream = fs.createReadStream("./hocanisec_final_v12.sql");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentTable = null;

  for await (const line of rl) {
    const trimmed = line.trim().replace(/\r$/, ''); // Remove carriage return

    // COPY komutlarını yakala
    if (trimmed.startsWith("COPY public.departments")) {
      currentTable = "departments";
      console.log("📋 Departments verisi okunuyor...");
      continue;
    }
    if (trimmed.startsWith("COPY public.professors")) {
      currentTable = "professors";
      console.log("👨‍🏫 Professors verisi okunuyor...");
      continue;
    }
    if (trimmed.startsWith("COPY public.universities")) {
      currentTable = "universities";
      console.log("🏫 Universities verisi okunuyor...");
      continue;
    }

    // Veri satırlarını işle
    if (currentTable && trimmed && trimmed !== "\\." && !trimmed.startsWith("--")) {
      const values = trimmed.split("\t");

      if (currentTable === "departments" && values.length >= 2) {
        departments.set(parseInt(values[0]), {
          id: parseInt(values[0]),
          name: values[1] || "",
          faculty: values[2] || ""
        });
      } else if (currentTable === "universities" && values.length >= 2) {
        universities.set(parseInt(values[0]), {
          id: parseInt(values[0]),
          name: values[1] || ""
        });
      } else if (currentTable === "professors" && values.length >= 4) {
        const faculty = values[6] === "\\N" ? "" : (values[6] || "");
        professors.push({
          id: parseInt(values[0]),
          name: values[1] || "",
          title: values[2] || "",
          profile_link: values[3] || "",
          university_id: values[4] ? parseInt(values[4]) : null,
          department_id: values[5] ? parseInt(values[5]) : null,
          faculty: faculty
        });
      }
    }

    if (trimmed === "\\.") {
      currentTable = null;
    }
  }

  console.log(`\n📊 Veriler parse edildi:`);
  console.log(`   Universities: ${universities.size}`);
  console.log(`   Departments: ${departments.size}`);
  console.log(`   Professors: ${professors.length}`);

  // Firebase'e yükleme
  console.log("\n🔥 Firebase'e yükleniyor...");

  // 1. Universities (500'lük batch limitine dikkat)
  console.log("\n1️⃣ Universities yükleniyor...");
  const uniArray = Array.from(universities.values());
  const uniBatchSize = 500;
  
  for (let i = 0; i < uniArray.length; i += uniBatchSize) {
    const batch = db.batch();
    const chunk = uniArray.slice(i, i + uniBatchSize);
    
    chunk.forEach((uni) => {
      const docRef = db.collection("universities").doc(uni.id.toString());
      batch.set(docRef, {
        name: uni.name
      });
    });
    
    await batch.commit();
    console.log(`   ${Math.min(i + uniBatchSize, uniArray.length)}/${uniArray.length} üniversite eklendi...`);
  }

  // 2. Departments
  console.log("\n2️⃣ Departments yükleniyor...");
  const deptArray = Array.from(departments.values());
  const deptBatchSize = 500;
  
  for (let i = 0; i < deptArray.length; i += deptBatchSize) {
    const batch = db.batch();
    const chunk = deptArray.slice(i, i + deptBatchSize);
    
    chunk.forEach((dept) => {
      const docRef = db.collection("departments").doc(dept.id.toString());
      batch.set(docRef, {
        name: dept.name,
        faculty: dept.faculty
      });
    });
    
    await batch.commit();
    console.log(`   ${Math.min(i + deptBatchSize, deptArray.length)}/${deptArray.length} bölüm eklendi...`);
  }

  // 3. Professors
  console.log("\n3️⃣ Professors yükleniyor...");
  const profBatchSize = 500;
  let processed = 0;

  for (let i = 0; i < professors.length; i += profBatchSize) {
    const batch = db.batch();
    const chunk = professors.slice(i, i + profBatchSize);

    chunk.forEach((prof) => {
      // University ve department bilgilerini getir
      const university = universities.get(prof.university_id);
      const department = departments.get(prof.department_id);

      const docRef = db.collection("professors").doc();
      batch.set(docRef, {
        name: prof.name,
        title: prof.title || "Akademisyen",
        profileLink: prof.profile_link || "",
        school: university ? university.name : "Genel Üniversite",
        department: department ? department.name : "",
        faculty: prof.faculty || (department ? department.faculty : ""),
        avgRating: 0,
        commentCount: 0
      });
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`   ${processed}/${professors.length} hoca eklendi...`);
  }

  console.log(`\n✅ Migration tamamlandı!`);
  console.log(`\n📈 Özet:`);
  console.log(`   🏫 ${universities.size} Üniversite`);
  console.log(`   📚 ${departments.size} Bölüm`);
  console.log(`   👨‍🏫 ${professors.length} Hoca`);
  console.log(`\n🎉 Artık hocanisec.com.tr'de bu verileri kullanabilirsiniz!`);

  process.exit(0);
}

// Script'i çalıştır
parseAndMigrate().catch((error) => {
  console.error("❌ Migration hatası:", error);
  process.exit(1);
});