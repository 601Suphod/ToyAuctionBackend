const path = require('path');
const multer = require('multer');
const Profile = require("../schemas/v1/profile.schema");
const User = require("../schemas/v1/user.schema");
const uaParser = require('ua-parser-js');
const geoip = require('geoip-lite');

// 📌 ฟังก์ชันแปลง Binary เป็น Base64 URL
const getBase64Image = (profileImage) => {
  if (!profileImage || !profileImage.data) return null;
  return `data:${profileImage.contentType};base64,${profileImage.data.toString("base64")}`;
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await Profile.findOne({ user: userId }).populate("user");

    if (!profile) {
      return res.status(404).json({ status: "error", message: "ไม่พบข้อมูลโปรไฟล์" });
    }

    const userObj = profile.user?.user || profile.user;

    res.status(200).json({
      status: "success",
      data: {
        name: profile.name,
        email: userObj?.email || "ไม่มีอีเมล",
        phone: profile.phone || "ไม่มีเบอร์โทร",
        gender: profile.gender || "ไม่ระบุ",
        birthday: profile.birthday || null,
        addresses: profile.addresses || [],
        profileImage: profile.profileImage?.data
          ? `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString("base64")}`
          : null,
        createdAt: profile.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ Error in getProfile:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};


exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { label, fullAddress, name, phone, location } = req.body;

    if (!label || !fullAddress || !name || !phone) {
      return res.status(400).json({ status: "error", message: "❌ ต้องกรอกข้อมูลให้ครบถ้วน" });
    }

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ status: "error", message: "ไม่พบโปรไฟล์" });
    }

    profile.addresses.push({
      label,
      fullAddress,
      name,
      phone,
      location: location || { lat: null, lng: null },
    });

    await profile.save();

    res.status(200).json({ status: "success", message: "✅ เพิ่มที่อยู่สำเร็จ", data: profile.addresses });
  } catch (err) {
    console.error("❌ Error in addAddress:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};


exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ status: "error", message: "ไม่พบโปรไฟล์" });
    }

    profile.addresses = profile.addresses.filter(addr => addr._id.toString() !== addressId);

    // ✅ FIX สำหรับ address เก่าที่ไม่มี name / phone
    profile.addresses = profile.addresses.map(addr => ({
      ...addr.toObject(),
      name: addr.name || "ไม่ระบุชื่อ",
      phone: addr.phone || "0000000000"
    }));

    await profile.save();

    res.status(200).json({ status: "success", message: "ลบที่อยู่สำเร็จ", data: profile.addresses });
  } catch (err) {
    console.error("❌ Error in deleteAddress:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ status: "error", message: "ไม่พบโปรไฟล์" });
    }

    // ✅ อัปเดตโดยตรง
    profile.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    await profile.save();

    res.status(200).json({ status: "success", message: "ตั้งค่าที่อยู่เริ่มต้นสำเร็จ", data: profile.addresses });
  } catch (err) {
    console.error("❌ Error in setDefaultAddress:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, gender, birthday } = req.body;

    // 🔹 อัปเดต Profile
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { name, phone, gender, birthday },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ status: "error", message: "ไม่พบโปรไฟล์" });
    }

    await User.findByIdAndUpdate(userId, { phone });

    const userObj = await User.findById(userId);

    res.status(200).json({
      status: "success",
      data: {
        name: profile.name,
        phone: userObj?.phone || profile.phone,
        gender: profile.gender,
        birthday: profile.birthday,
        profileImage: getBase64Image(profile.profileImage)
      }
    });
  } catch (err) {
    console.error("❌ updateProfile error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};


// ✅ ตั้งค่า multer สำหรับอัปโหลดรูป
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ✅ อัปโหลดรูปโปรไฟล์
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: "กรุณาอัปโหลดรูปภาพ" });
    }

    const userId = req.user.userId;
    let profile = await Profile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ status: "fail", message: "Profile not found" });
    }

    profile.profileImage = {
      data: Buffer.from(req.file.buffer),
      contentType: req.file.mimetype
    };

    await profile.save();

    res.json({ status: "success", message: "อัปโหลดรูปโปรไฟล์สำเร็จ!" });
  } catch (error) {
    console.error("🚨 Upload Error:", error);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" });
  }
};


