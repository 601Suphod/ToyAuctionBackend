const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["time_warning", "new_bid", "auction_end"], // ✅ เพิ่มตรงนี้
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model("Notification", notificationSchema);
