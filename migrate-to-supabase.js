const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const readline = require("readline");

const supabase = createClient(
  "https://ozcdrdesudvbkecxthom.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2RyZGVzdWR2YmtlY3h0aG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDc1MDIsImV4cCI6MjA5NTg4MzUwMn0.Jj0a9-qy-CTVzV88AaH94dW0E6BdrUNu7ly55fu_Oos"
);

async function migrate() {
  const universities = new Map();
  const departments = new Map();
  const professors = [];

  const fileStream = fs.createReadStream(process.env.HOME + "/Downloads/hocanisec_clean.sql");
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentTable = null;
  console.log("SQL dosyasi okunuyor...");

  for await (const line of rl) {
    const trimmed = line.trim().replace(/\r$/, "");
    if (trimmed.startsWith("COPY public.departments")) { currentTable = "departments"; continue; }
    if (trimmed.startsWith("COPY public.professors")) { currentTable = "professors"; continue; }
    if (trimmed.startsWith("COPY public.universities")) { currentTable = "universities"; continue; }
    if (trimmed === "\\.") { currentTable = null; continue; }

    if (currentTable && trimmed && !trimmed.startsWith("--")) {
      const v = trimmed.split("\t");
      if (currentTable === "universities" && v.length >= 2) {
        universities.set(parseInt(v[0]), { id: parseInt(v[0]), name: v[1] || "" });
      } else if (currentTable === "departments" && v.length >= 2) {
        departments.set(parseInt(v[0]), { id: parseInt(v[0]), name: v[1] || "", faculty: v[2] || "" });
      } else if (currentTable === "professors" && v.length >= 4) {
        const uni = universities.get(parseInt(v[4]));
        const dept = departments.get(parseInt(v[5]));
        professors.push({
          name: v[1] || "",
          title: v[2] || "Akademisyen",
          profile_link: v[3] || "",
          school: uni ? uni.name : "",
          department: dept ? dept.name : "",
          faculty: v[6] === "\\N" ? (dept ? dept.faculty : "") : (v[6] || ""),
          avg_rating: 0,
          comment_count: 0
        });
      }
    }
  }

  console.log("Professors: " + professors.length);

  const batchSize = 500;
  for (let i = 0; i < professors.length; i += batchSize) {
    const chunk = professors.slice(i, i + batchSize);
    const { error } = await supabase.from("professors").insert(chunk);
    if (error) { console.error("Hata:", error.message); break; }
    console.log((i + chunk.length) + "/" + professors.length + " eklendi...");
  }

  console.log("Tamamlandi!");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
