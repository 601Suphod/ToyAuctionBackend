const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    user: {
      name: { type: String, required: true },
      username: { type: String, trim: true },
      email: {
        type: String,
        required: true,
        unique: true,
        match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
      },
      phone: { type: String, trim: true },
      password: { type: String, required: true, select: false },
      token: { type: String },
      activated: { type: Boolean, default: false },
      verified: {
        email: { type: Boolean, default: false },
        phone: { type: Boolean, default: false },
      },

      // ✅ เพิ่มเพศและวันเกิด
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "other",
      },
      birthday: {
        type: Date,
      },
    },

    // ✅ เพิ่ม role แยกแอดมินหรือยูสเซอร์ทั่วไป
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ✅ อุปกรณ์ที่เคยเข้าสู่ระบบ
    loggedInDevices: [
      {
        deviceFingerprint: { type: String },
        lastLogin: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ❗ ตรวจสอบอีเมลซ้ำ
UserSchema.pre("save", async function (next) {
  if (!this.isModified("email")) return next();
  const existingUser = await mongoose.models.User.findOne({ email: this.user.email });
  if (existingUser) {
    const error = new Error("Email already exists");
    error.status = 409;
    return next(error);
  }
  next();
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
