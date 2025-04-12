const express = require("express");
const {
  getProfile,
  updateProfile,           // ✅ ต้องมี
  getLoginHistory,
  uploadProfileImage,
  addAddress,              // ✅ ใหม่
  deleteAddress,           // ✅ ใหม่
  setDefaultAddress        // ✅ ใหม่
} = require("../../controllers/profileController");

const { checkLogin } = require("../../middlewares/authMiddleware");
const multer = require("multer");
const Profile = require("../../schemas/v1/profile.schema");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(checkLogin);

// 🔹 โปรไฟล์หลัก
router.get("/", getProfile);

router.get("/history", getLoginHistory);
router.post("/addresses", addAddress);
router.delete("/addresses/:addressId", deleteAddress);
router.patch("/addresses/default/:addressId", setDefaultAddress);


// 🔹 อัปโหลดรูปโปรไฟล์
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ error: "กรุณาอัปโหลดไฟล์ภาพ" });

    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ error: "ไม่พบโปรไฟล์ของผู้ใช้" });

    profile.profileImage = {
      data: Buffer.from(req.file.buffer),
      contentType: req.file.mimetype,
    };
    await profile.save();

    res.json({ success: true, message: "อัปโหลดรูปโปรไฟล์สำเร็จ!" });
  } catch (error) {
    console.error("🚨 Upload Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" });
  }
});

// 🔹 ดึงรูปโปรไฟล์
router.get("/image", async (req, res) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile?.profileImage?.data) {
      return res.status(404).json({ error: "ไม่พบรูปโปรไฟล์" });
    }

    res.json({
      success: true,
      image: `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString("base64")}`,
    });
  } catch (error) {
    console.error("🚨 Get Image Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรูปภาพ" });
  }
});

// ✅ ดึงที่อยู่ทั้งหมด
router.get("/addresses", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ success: false, error: "ไม่พบโปรไฟล์" });

    res.json({ success: true, addresses: profile.addresses || [] });
  } catch (err) {
    console.error("❌ GET /addresses error:", err);
    res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงที่อยู่" });
  }
});

// ✅ เพิ่มที่อยู่ใหม่
router.post("/addresses", async (req, res) => {
  try {
    const { label, fullAddress } = req.body;
    if (!label || !fullAddress) {
      return res.status(400).json({ success: false, error: "กรุณาระบุ label และ fullAddress" });
    }

    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ success: false, error: "ไม่พบโปรไฟล์" });

    profile.addresses.push({ label, fullAddress });
    await profile.save();

    res.json({ success: true, addresses: profile.addresses });
  } catch (err) {
    console.error("❌ POST /addresses error:", err);
    res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการเพิ่มที่อยู่" });
  }
});

module.exports = router;
