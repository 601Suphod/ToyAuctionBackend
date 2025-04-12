// /schemas/v1/payment.schema.js

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auction",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    qrCode: {
      type: String,
      required: true,
    },
    slipImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "uploaded", "approved", "rejected", "completed"],
      default: "pending",
    },
    shippingAddress: {
      type: String,
      default: null,
    },
    recipientName: {
      type: String,
      default: "",
    },
    recipientPhone: {
      type: String,
      default: "",
    },
    shippingStatus: {
      type: String,
      enum: ["not_sent", "shipped", "delivered"],
      default: "not_sent",
    },
    trackingNumber: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentConfirmedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ ป้องกันการสร้างซ้ำ หากยังไม่ได้จ่าย
paymentSchema.index(
  { auctionId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isPaid: false },
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
