const mongoose = require("mongoose");

// ✅ เพิ่ม field สำหรับชื่อผู้รับ, เบอร์โทร, ตำแหน่ง GPS
const addressSchema = new mongoose.Schema({
  label: { type: String, required: true },              // เช่น "บ้าน", "ที่ทำงาน"
  fullAddress: { type: String, required: true },        // ที่อยู่เต็ม
  name: { type: String, required: true },               // ชื่อผู้รับ
  phone: { type: String, required: true },              // เบอร์ผู้รับ
  isDefault: { type: Boolean, default: false },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  }
});

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },
    birthday: { type: Date },
    addresses: [addressSchema],
    profileImage: {
      data: Buffer,
      contentType: String
    },
    loginHistory: [
      {
        ipAddress: { type: String },
        userAgent: { type: String },
        device: { type: String },
        os: { type: String },
        browser: { type: String },
        location: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    winningBids: [
      {
        auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction" },
        finalPrice: { type: Number },
        wonAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// จำกัด loginHistory แค่ 10 รายการ
profileSchema.pre("save", function (next) {
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(0, 10);
  }
  next();
});

module.exports = mongoose.model("Profile", profileSchema);
