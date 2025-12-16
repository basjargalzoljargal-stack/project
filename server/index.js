import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

console.log("🔥 SERVER FILE LOADED");

const app = express();

// ✅ MIDDLEWARE - Эхлээд тохируулах
app.use(cors({
  origin: "http://localhost:5173", // Vite-ийн default port
  credentials: true
}));
app.use(express.json());

// ✅ DATABASE CONNECTION - Алдааны шалгалт нэмсэн
let db;
try {
  db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Mongol1990@",
    database: process.env.DB_NAME || "planning_app",
  });
  console.log("✅ MySQL холбогдлоо");
  
  // Database холболт алдагдсан тохиолдолд дахин холбох
  db.on('error', (err) => {
    console.error('❌ MySQL алдаа:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 Дахин холбогдож байна...');
      db = mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "Mongol1990@",
        database: process.env.DB_NAME || "planning_app",
      });
    }
  });
} catch (error) {
  console.error("❌ MySQL холбогдох алдаа:", error.message);
  process.exit(1);
}

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.json({ 
    status: "Backend OK",
    timestamp: new Date().toISOString()
  });
});

// ✅ HEALTH CHECK - Database холболт шалгах
app.get("/health", async (req, res) => {
  try {
    await db.ping();
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message });
  }
});

// ✅ REGISTER - Сайжруулсан алдааны шалгалт
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Өгөгдөл шалгах
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Хэрэглэгчийн нэр болон нууц үг шаардлагатай" 
      });
    }

    // Нууц үгийн урт шалгах
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой" 
      });
    }

    // Хэрэглэгчийн нэрийн урт шалгах
    if (username.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: "Хэрэглэгчийн нэр дор хаяж 3 тэмдэгт байх ёстой" 
      });
    }

    // Нууц үг hash хийх
    const hash = await bcrypt.hash(password, 10);

    // Database-д хадгалах
    await db.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, hash]
    );

    console.log(`✅ Шинэ хэрэглэгч бүртгэгдлээ: ${username}`);
    
    res.status(201).json({ 
      success: true,
      message: "Амжилттай бүртгэгдлээ" 
    });

  } catch (err) {
    console.error("❌ Бүртгэлийн алдаа:", err);
    
    if (err.code === "ER_DUP_ENTRY") {
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

// ✅ LOGIN - Сайжруулсан хариу өгөх
app.post("/login", async (req, res) => {
  try {
    console.log("🔥 LOGIN хүсэлт ирлээ:", req.body);

    const { username, password } = req.body;

    // Өгөгдөл шалгах
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Хэрэглэгчийн нэр болон нууц үг шаардлагатай" 
      });
    }

    // Хэрэглэгч хайх
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      console.log("❌ Хэрэглэгч олдсонгүй:", username);
      return res.status(401).json({ 
        success: false,
        message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна" 
      });
    }

    const user = rows[0];

    // Нууц үг шалгах
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.log("❌ Нууц үг буруу:", username);
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

// ✅ 404 Handler - Олдоогүй route-ууд
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: "Route олдсонгүй" 
  });
});

// ✅ SERVER START
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend ажиллаж байна: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
