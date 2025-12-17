import express from "express";
import pkg from "pg";
import bcrypt from "bcrypt";
import cors from "cors";

// Render дээр dotenv хэрэггүй
// import dotenv from "dotenv";
// dotenv.config();

const { Pool } = pkg;

console.log("🔥 SERVER FILE LOADED");
console.log("📊 DATABASE_URL байна уу?", !!process.env.DATABASE_URL);

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://my-planning-app-frontend.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());

/* ======================
   POSTGRESQL CONNECTION
====================== */
const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://my_website_db_n944_user:PKpRzcXr5qDiDIz7IUeOqL7Tduy3SiB3@dpg-d50bmj5actks73f0qp20-a.oregon-postgres.render.com/my_website_db_n944";

console.log("🔗 Database URL эхлэл:", DATABASE_URL.substring(0, 30) + "...");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL холбогдлоо");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL алдаа:", err);
  process.exit(1);
});

/* ======================
   AUTO CREATE TABLE
====================== */
const initDB = async () => {
  try {
    console.log("🔄 Table үүсгэж байна...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ users table бэлэн боллоо");
  } catch (err) {
    console.error("❌ Table үүсгэх алдаа:", err.message);
  }
};

initDB();

/* ======================
   TEST ROUTE
====================== */
app.get("/", (req, res) => {
  res.json({
    status: "Backend OK",
    timestamp: new Date().toISOString()
  });
});

/* ======================
   HEALTH CHECK
====================== */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message
    });
  }
});

/* ======================
   REGISTER
====================== */
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр болон нууц үг шаардлагатай"
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр дор хаяж 3 тэмдэгт байх ёстой"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [username, hash]
    );

    console.log(`✅ Шинэ хэрэглэгч бүртгэгдлээ: ${username}`);

    res.status(201).json({
      success: true,
      message: "Амжилттай бүртгэгдлээ"
    });

  } catch (err) {
    console.error("❌ Бүртгэлийн алдаа:", err);

    if (err.code === "23505") { // PostgreSQL duplicate key
      return res.status(400).json({
        success: false,
        message: "Энэ хэрэглэгчийн нэр аль хэдийн бүртгэлтэй байна"
      });
    }

    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   LOGIN
====================== */
app.post("/login", async (req, res) => {
  try {
    console.log("🔥 LOGIN хүсэлт:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Хэрэглэгчийн нэр болон нууц үг шаардлагатай"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна"
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна"
      });
    }

    console.log(`✅ Амжилттай нэвтэрлээ: ${username}`);

    res.json({
      success: true,
      message: "Амжилттай нэвтэрлээ",
      userId: user.id,
      username: user.username
    });

  } catch (err) {
    console.error("❌ Нэвтрэх алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route олдсонгүй"
  });
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend ажиллаж байна: ${PORT}`);
});