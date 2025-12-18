import express from "express";
import pkg from "pg";
import bcrypt from "bcrypt";
import cors from "cors";

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
   AUTO CREATE TABLE & MIGRATION
====================== */
const initDB = async () => {
  try {
    console.log("🔄 Database шалгаж байна...");
    
    // 1. Users table үүсгэх
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Шинэ багануудыг нэмэх (хэрэв байхгүй бол)
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';`);
      console.log("✅ role багана нэмэгдлээ");
    } catch (err) {
      console.log("ℹ️ role багана аль хэдийн байна");
    }
    
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;`);
      console.log("✅ approved багана нэмэгдлээ");
    } catch (err) {
      console.log("ℹ️ approved багана аль хэдийн байна");
    }
    
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`);
      console.log("✅ last_login багана нэмэгдлээ");
    } catch (err) {
      console.log("ℹ️ last_login багана аль хэдийн байна");
    }
    
    // 3. Индекс үүсгэх
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);`);
      console.log("✅ Индексүүд үүсгэгдлээ");
    } catch (err) {
      console.log("ℹ️ Индексүүд аль хэдийн байна");
    }
    
    // 4. Админ үүсгэх/нууц үг reset хийх
    const adminCheck = await pool.query(`SELECT * FROM users WHERE username = 'admin';`);
    const adminPassword = 'Mongol1990';
    const hash = await bcrypt.hash(adminPassword, 10);
    
    if (adminCheck.rows.length === 0) {
      // "admin" хэрэглэгч байхгүй бол үүсгэнэ
      await pool.query(
        `INSERT INTO users (username, password_hash, role, approved) VALUES ($1, $2, $3, $4);`,
        ['admin', hash, 'admin', true]
      );
      console.log("✅ Анхны админ үүсгэгдлээ (username: admin, password: Mongol1990)");
    } else {
      // Байгаа admin хэрэглэгчийг засах: нууц үг + эрх
      await pool.query(
        `UPDATE users SET password_hash = $1, role = 'admin', approved = true WHERE username = 'admin';`,
        [hash]
      );
      console.log("✅ 'admin' хэрэглэгч засагдлаа - нууц үг: Mongol1990");
    }
    
    console.log("✅ Database бэлэн боллоо!");
    
  } catch (err) {
    console.error("❌ Database засалт хийх алдаа:", err.message);
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

    // ✅ ШИНЭ: approved = false (админ зөвшөөрөх хүртэл)
    await pool.query(
      "INSERT INTO users (username, password_hash, role, approved) VALUES ($1, $2, $3, $4)",
      [username, hash, 'user', false]
    );

    console.log(`✅ Шинэ хэрэглэгч бүртгэгдлээ: ${username} (зөвшөөрөл хүлээгдэж байна)`);

    res.status(201).json({
      success: true,
      message: "Амжилттай бүртгэгдлээ. Админы зөвшөөрлийг хүлээнэ үү."
    });

  } catch (err) {
    console.error("❌ Бүртгэлийн алдаа:", err);

    if (err.code === "23505") {
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
    
    // ✅ ШИНЭ: Зөвшөөрөл шалгах
    if (!user.approved && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Таны бүртгэл хараахан зөвшөөрөгдөөгүй байна. Админтай холбогдоно уу."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна"
      });
    }

    // ✅ ШИНЭ: Сүүлд нэвтэрсэн хугацааг хадгалах
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    console.log(`✅ Амжилттай нэвтэрлээ: ${username}`);

    res.json({
      success: true,
      message: "Амжилттай нэвтэрлээ",
      userId: user.id,
      username: user.username,
      role: user.role // ✅ ШИНЭ: Role буцаах
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
   ADMIN: GET ALL USERS
====================== */
app.get("/admin/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        role, 
        approved, 
        last_login,
        created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (err) {
    console.error("❌ Хэрэглэгчдийг авах алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   ADMIN: APPROVE USER
====================== */
app.post("/admin/users/:userId/approve", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      "UPDATE users SET approved = true WHERE id = $1",
      [userId]
    );

    console.log(`✅ Хэрэглэгч зөвшөөрөгдлөө: ${userId}`);

    res.json({
      success: true,
      message: "Хэрэглэгч зөвшөөрөгдлөө"
    });

  } catch (err) {
    console.error("❌ Зөвшөөрөх алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   ADMIN: REJECT USER
====================== */
app.post("/admin/users/:userId/reject", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      "UPDATE users SET approved = false WHERE id = $1",
      [userId]
    );

    console.log(`❌ Хэрэглэгч цуцлагдлаа: ${userId}`);

    res.json({
      success: true,
      message: "Хэрэглэгч цуцлагдлаа"
    });

  } catch (err) {
    console.error("❌ Цуцлах алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   ADMIN: DELETE USER
====================== */
app.delete("/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [userId]
    );

    console.log(`🗑️ Хэрэглэгч устгагдлаа: ${userId}`);

    res.json({
      success: true,
      message: "Хэрэглэгч устгагдлаа"
    });

  } catch (err) {
    console.error("❌ Устгах алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   ADMIN: CHANGE ROLE
====================== */
app.post("/admin/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Буруу эрх"
      });
    }

    await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2",
      [role, userId]
    );

    console.log(`✅ Хэрэглэгчийн эрх өөрчлөгдлөө: ${userId} -> ${role}`);

    res.json({
      success: true,
      message: "Эрх өөрчлөгдлөө"
    });

  } catch (err) {
    console.error("❌ Эрх өөрчлөх алдаа:", err);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа"
    });
  }
});

/* ======================
   ADMIN: STATISTICS
====================== */
app.get("/admin/stats", async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const approvedUsers = await pool.query("SELECT COUNT(*) FROM users WHERE approved = true");
    const pendingUsers = await pool.query("SELECT COUNT(*) FROM users WHERE approved = false");
    const adminUsers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");

    res.json({
      success: true,
      stats: {
        total: parseInt(totalUsers.rows[0].count),
        approved: parseInt(approvedUsers.rows[0].count),
        pending: parseInt(pendingUsers.rows[0].count),
        admins: parseInt(adminUsers.rows[0].count)
      }
    });

  } catch (err) {
    console.error("❌ Статистик авах алдаа:", err);
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
