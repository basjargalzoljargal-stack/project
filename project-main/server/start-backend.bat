@echo off
echo ========================================
echo BACKEND ASEHLJ BAINA...
echo ========================================
cd /d "D:\install\web sait tol\project\server"
if not exist "D:\install\web sait tol\project\server" (
    echo ERROR: server хavтас олдсонгүй!
    pause
    exit
)
echo Server хavтас олдлоо!
echo npm run dev ажиллуулж байна...
npm run dev
pause
```

### 3.2 **Ctrl + S** (хадгална)

---

## 🧪 ШАЛГАХ

File Explorer-оор очоод `start-backend.bat` дээр **давхар дар**.

Одоо CMD цонх **хаагдахгүй**, мессеж харуулна.

---

### Юу харагдах вэ?

**А) Хэрэв алдаа гарвал:**
```
ERROR: server хavтас олдсонгүй!
Press any key to continue...
```

**Б) Хэрэв зөв бол:**
```
Server хavтас олдлоо!
npm run dev ажиллуулж байна...
Backend ажиллаж байна: http://localhost:4000