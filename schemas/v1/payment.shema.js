const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "auction", required: true },
    amount: { type: Number, required: true },
    qrCode: { type: String, required: true },
    slipImage: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "uploaded", "approved", "rejected", "completed"],
      default: "pending",
    },
    shippingAddress: { type: String, default: null },
    recipientName: { type: String, default: null },
    recipientPhone: { type: String, default: null },

    // ✅ เพิ่ม completed ใน enum
    shippingStatus: {
      type: String,
      enum: ["not_sent", "shipped", "delivered", "completed"],
      default: "not_sent",
    },

    trackingNumber: { type: String, default: null },
    note: { type: String, default: "" },
    isPaid: { type: Boolean, default: false },
    paymentConfirmedAt: { type: Date, default: null },

    // ✅ เพิ่ม timestamp เมื่อผู้ซื้อกดยืนยัน
    deliveryConfirmedAt: { type: Date, default: null },

    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);


// ✅ ป้องกันสร้างซ้ำ
paymentSchema.index(
  { auctionId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isPaid: false },
  }
);

// ✅ ป้องกันโหลด model ซ้ำตอน dev
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
module.exports = Payment;
