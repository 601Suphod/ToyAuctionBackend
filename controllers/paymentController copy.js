const qrcode = require("qrcode");
const generatePayload = require("promptpay-qr");
const Profile = require("../schemas/v1/profile.schema");
const fs = require("fs");
const path = require("path");
const Payment = require("../schemas/v1/payment.shema");
const Auction = require("../schemas/v1/auction.schema");

// ✅ สร้าง QR Code ให้ผู้ชนะการประมูล โดยไม่ให้มี payment ซ้ำ และเติมที่อยู่จาก profile
exports.generatePaymentQR = async (req, res) => {
  try {
    const { auctionId } = req.body;
    if (!auctionId) {
      return res.status(400).json({ error: "❌ ต้องระบุ auctionId" });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: "❌ ไม่พบข้อมูลการประมูล" });
    }

    const sellerPhone = auction.seller?.phone;
    if (!sellerPhone) {
      return res.status(400).json({ error: "❌ ผู้ขายไม่มีเบอร์พร้อมเพย์" });
    }

    let payment = await Payment.findOne({
      auctionId,
      isPaid: false,
      status: { $ne: "rejected" }
    });

    if (payment) {
      return res.status(200).json({
        success: true,
        qrCode: payment.qrCode,
        paymentId: payment._id,
        message: "📌 ใช้รายการที่มีอยู่แล้ว"
      });
    }

    // ✅ ดึงโปรไฟล์ พร้อม populate user เพื่อดึงเบอร์
    const profile = await Profile.findOne({ user: auction.highestBidder }).populate("user");
    const defaultAddr = profile?.addresses?.find(addr => addr.isDefault) || profile?.addresses?.[0];

    const payload = generatePayload(sellerPhone, { amount: auction.currentPrice });
    const qrCode = await qrcode.toDataURL(payload);

    payment = new Payment({
      userId: auction.highestBidder,
      auctionId,
      amount: auction.currentPrice,
      qrCode,
      shippingAddress: defaultAddr?.fullAddress || "",
      recipientName: profile?.name || "",
      recipientPhone: profile?.user?.phone || profile?.phone || "", // ✅ จุดนี้!
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await payment.save();

    auction.paymentQR = qrCode;
    await auction.save();

    res.status(200).json({ success: true, qrCode, paymentId: payment._id });
  } catch (err) {
    console.error("❌ generatePaymentQR error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
};

exports.getSlipByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const payment = await Payment.findOne({
      auctionId,
      slipImage: { $ne: null }
    }).sort({ createdAt: -1 });

    if (!payment) return res.status(404).json({ error: "ไม่พบข้อมูล" });

    res.status(200).json({
      success: true,
      paymentId: payment._id,
      slipImage: payment.slipImage,
      isPaid: payment.isPaid,
      status: payment.status,
      shippingStatus: payment.shippingStatus,
      trackingNumber: payment.trackingNumber,
      note: payment.note || "",

      // ✅ ดึงจาก payment schema โดยตรง (เพราะเราเซฟลงไปแล้ว)
      recipientName: payment.recipientName || "",
      recipientPhone: payment.recipientPhone || "",
      shippingAddress: payment.shippingAddress || ""
    });
  } catch (err) {
    console.error("❌ getSlipByAuctionId error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ตรวจสอบสถานะการชำระเงิน
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ error: "ไม่พบการชำระเงิน" });

    res.status(200).json({
      success: true,
      slipImage: payment.slipImage,
      isPaid: payment.isPaid,
      status: payment.status,
      shippingStatus: payment.shippingStatus,
      trackingNumber: payment.trackingNumber,
    });
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ผู้ซื้ออัปโหลดสลิป
exports.uploadPaymentSlip = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "❌ ไม่พบการชำระเงิน" });
    if (!req.file) return res.status(400).json({ message: "❌ กรุณาอัปโหลดสลิป" });

    payment.slipImage = "/" + req.file.path.replace(/\\/g, "/");
    payment.status = "uploaded";
    await payment.save();

    res.status(200).json({ success: true, slipImage: payment.slipImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ ระบบผิดพลาด" });
  }
};

// ✅ ผู้ขายยืนยันการชำระเงิน
exports.confirmPaymentByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const payment = await Payment.findOne({ auctionId });
    if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });

    payment.isPaid = true;
    payment.status = "approved";
    await payment.save();

    res.status(200).json({ success: true, message: "✅ ยืนยันการชำระเงินแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการยืนยัน" });
  }
}

// ✅ ผู้ซื้อกรอกที่อยู่
exports.updateShippingAddress = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { address, note } = req.body;

    if (!address) return res.status(400).json({ error: "❌ กรุณากรอกที่อยู่" });

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: "❌ ไม่พบข้อมูล" });

    if (!payment.slipImage) {
      return res.status(400).json({ error: "❌ กรุณาอัปโหลดสลิปก่อน" });
    }

    // ✅ ดึงชื่อและเบอร์จาก req.user มาเติมใน payment
    const recipientName = req.user.name || "";
    const recipientPhone = req.user.phone || "";

    payment.shippingAddress = address;
    payment.recipientName = recipientName;
    payment.recipientPhone = recipientPhone;
    payment.note = note || "";

    await payment.save();

    res.status(200).json({ success: true, message: "📦 บันทึกที่อยู่สำเร็จ" });
  } catch (error) {
    console.error("❌ updateShippingAddress Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ดึงรายการ pending
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "pending" })
      .populate("user", "name email")
      .populate("auction", "name currentPrice");

    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error("❌ getPendingPayments Error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
};

// ✅ อนุมัติ
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "ไม่พบรายการ" });

    payment.status = "approved";
    payment.isPaid = true;
    payment.paymentConfirmedAt = new Date(); // ✅ บันทึกเวลา
    await payment.save();

    res.status(200).json({ success: true, message: "✅ อนุมัติแล้ว" });
  } catch (err) {
    console.error("❌ approvePayment Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ปฏิเสธ
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "ไม่พบรายการ" });

    payment.status = "rejected";
    await payment.save();

    res.status(200).json({ success: true, message: "❌ ปฏิเสธแล้ว" });
  } catch (err) {
    console.error("❌ rejectPayment Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ดึงรายการที่จ่ายเงินแล้ว ระหว่างวันที่ start และ end
exports.getPaidPaymentsByDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "กรุณาระบุช่วงเวลา start และ end (ISO format)" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const payments = await Payment.find({
      isPaid: true,
      paymentConfirmedAt: { $gte: startDate, $lte: endDate }
    })
      .populate("userId", "name email")
      .populate("auctionId", "name currentPrice");

    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error("❌ getPaidPaymentsByDateRange Error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรายการ" });
  }
};

// ✅ รายการคำสั่งซื้อย้อนหลังของผู้ใช้
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user._id;
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .populate("auctionId", "name image");

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("❌ getMyPayments Error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
  }
};

exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: { $in: ["pending", "uploaded"] } })
      .populate("userId", "name email phone")
      .populate("auctionId", "name image currentPrice");

    res.status(200).json({ status: "success", payments });
  } catch (err) {
    console.error("❌ Error fetching payments:", err);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id)
      .populate("userId", "name email phone")
      .populate("auctionId", "name image currentPrice seller");

    if (!payment) return res.status(404).json({ status: "error", message: "ไม่พบรายการ" });

    res.status(200).json({ status: "success", payment });
  } catch (err) {
    console.error("❌ getPaymentById Error:", err);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
  }
};

exports.getSellerReceivedPayments = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const payments = await Payment.find({ isPaid: true })
      .populate({
        path: "auctionId",
        match: { seller: sellerId },
        select: "name image",
      })
      .populate("userId", "name email");

    const filtered = payments.filter(p => p.auctionId != null);

    res.status(200).json({ status: "success", payments: filtered });
  } catch (err) {
    console.error("❌ Error getSellerReceivedPayments:", err);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
  }
};

// ✅ ดูคำสั่งซื้อทั้งหมดของ user
exports.getMyPurchases = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("auctionId", "name image currentPrice");

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("❌ getMyPurchases Error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
  }
};

exports.updateShippingStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { shippingStatus, trackingNumber } = req.body;

    if (!shippingStatus) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกสถานะจัดส่ง" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: "ไม่พบรายการ" });

    payment.shippingStatus = shippingStatus;
    payment.trackingNumber = trackingNumber || "";

    await payment.save();

    res.status(200).json({ success: true, message: "📦 อัปเดตสถานะจัดส่งเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("❌ updateShippingStatus Error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
  }
};