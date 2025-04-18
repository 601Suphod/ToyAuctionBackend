const qrcode = require("qrcode");
const generatePayload = require("promptpay-qr");
const Profile = require("../schemas/v1/profile.schema");
const fs = require("fs");
const path = require("path");
const Payment = require("../schemas/v1/payment.shema");
const Auction = require("../schemas/v1/auction.schema");
const User = require("../schemas/v1/user.schema");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose"); 

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

    // ✅ ตรวจสอบรายการที่ยังไม่จ่าย (ตรงตาม unique index)
    let payment = await Payment.findOne({
      auctionId,
      userId: auction.highestBidder,
      isPaid: false
    });

    if (payment) {
      return res.status(200).json({
        success: true,
        qrCode: payment.qrCode,
        paymentId: payment._id,
        message: "📌 ใช้รายการที่มีอยู่แล้ว"
      });
    }

    // ✅ ดึงข้อมูลโปรไฟล์
    const profile = await Profile.findOne({ user: auction.highestBidder }).populate("user");
    const defaultAddr = profile?.addresses?.find(addr => addr.isDefault) || profile.addresses?.[0];

    if (!defaultAddr) {
      return res.status(400).json({ error: "❌ ผู้ใช้ยังไม่มีที่อยู่" });
    }

    const payload = generatePayload(sellerPhone, { amount: auction.currentPrice });
    const qrCode = await qrcode.toDataURL(payload);

    payment = new Payment({
      userId: auction.highestBidder,
      auctionId,
      amount: auction.currentPrice,
      qrCode,
      shippingAddress: defaultAddr.fullAddress || "",
      recipientName: defaultAddr.name || profile.name || "",
      recipientPhone: defaultAddr.phone || profile.user?.phone || "",
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

    // ✅ ดึงข้อมูล Payment ล่าสุด ไม่ว่า slip จะมีหรือไม่
    const payment = await Payment.findOne({ auctionId })
      .sort({ createdAt: -1 });

    if (!payment) {
      console.log("📍 ไม่พบ payment สำหรับ auctionId:", auctionId);
      return res.status(404).json({ error: "ไม่พบข้อมูลการชำระเงิน" });
    }

    res.status(200).json({
      success: true,
      paymentId: payment._id,
      slipImage: payment.slipImage || null,
      isPaid: payment.isPaid,
      status: payment.status,
      shippingStatus: payment.shippingStatus,
      trackingNumber: payment.trackingNumber,
      note: payment.note || "",

      recipientName: payment.recipientName || "",
      recipientPhone: payment.recipientPhone || "",
      shippingAddress: payment.shippingAddress || ""
    });
  } catch (err) {
    console.error("❌ getSlipByAuctionId error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

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

exports.confirmPaymentByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const payment = await Payment.findOne({ auctionId });
    if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });

    payment.isPaid = true;
    payment.status = "approved";

    payment.paymentConfirmedAt = new Date();

    await payment.save();

    res.status(200).json({ success: true, message: "✅ ยืนยันการชำระเงินแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการยืนยัน" });
  }
}

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

    // ✅ ดึงข้อมูลจาก profile แทน req.user
    const profile = await Profile.findOne({ user: payment.userId });
    if (!profile) return res.status(404).json({ error: "❌ ไม่พบโปรไฟล์ผู้ใช้" });

    const defaultAddr = profile.addresses?.find((addr) => addr.isDefault) || profile.addresses?.[0];

    const recipientName = defaultAddr?.name || profile.name || "";
    const recipientPhone = defaultAddr?.phone || profile.phone || "";

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

exports.getShippingHistory = async (req, res) => {
  try {
    const { auctionId } = req.params;
    console.log("📦 ตรวจสอบ auctionId:", auctionId);

    // แปลงเป็น ObjectId เพื่อให้ query ตรงกับใน MongoDB
    const objectId = mongoose.Types.ObjectId.isValid(auctionId)
      ? new mongoose.Types.ObjectId(auctionId)
      : null;

    if (!objectId) {
      return res.status(400).json({ success: false, message: "auctionId ไม่ถูกต้อง" });
    }

    const payment = await Payment.findOne({ auctionId: objectId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงิน" });
    }

    // mock data — ควรเก็บใน DB จริงในอนาคต
    const history = [
      {
        time: "2025-04-06T15:48:00",
        message: "การจัดส่งสำเร็จ",
        status: "delivered",
        location: "สุพรรณบุรี"
      },
      {
        time: "2025-04-06T11:12:00",
        message: "อยู่ระหว่างการนำส่ง",
        status: "shipped",
        location: "บางปลาม้า"
      },
      {
        time: "2025-04-05T18:46:00",
        message: "เกิดปัญหาระหว่างการส่งพัสดุ",
        status: "error",
        location: "บางบัวทอง"
      },
      {
        time: "2025-04-05T09:08:00",
        message: "พัสดุถึงศูนย์คัดแยกปลายทาง",
        status: "hub",
        location: "นครปฐม"
      }
    ];

    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error("❌ getShippingHistory error:", err);
    return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
  }
};

exports.confirmDeliveryByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user?.userId;

    console.log("🔎 auctionId:", auctionId);
    console.log("🔎 req.user:", req.user);

    if (!userId) {
      return res.status(401).json({ success: false, error: "กรุณาเข้าสู่ระบบ" });
    }

    const payment = await Payment.findOne({ auctionId });
    if (!payment) {
      return res.status(404).json({ success: false, error: "ไม่พบข้อมูลการชำระเงิน" });
    }

    if (!payment.userId || payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: "คุณไม่มีสิทธิ์ยืนยันรายการนี้" });
    }

    if (payment.shippingStatus !== "delivered") {
      return res.status(400).json({ success: false, error: "ต้องอยู่ในสถานะ 'delivered' เท่านั้นจึงจะยืนยันได้" });
    }

    payment.shippingStatus = "completed";
    payment.deliveryConfirmedAt = new Date();
    await payment.save();

    return res.status(200).json({ success: true, message: "✅ ยืนยันรับสินค้าเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("❌ confirmDeliveryByAuctionId error:", err);
    return res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

exports.downloadReceiptPDF = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate({ path: "auctionId", model: "Auction" })
      .populate({ path: "userId", model: "User" });

    if (!payment) {
      return res.status(404).send("ไม่พบข้อมูลใบเสร็จ");
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const thaiFontPath = path.resolve(__dirname, '../assets/fonts/THSarabunNew.ttf');
    if (fs.existsSync(thaiFontPath)) {
      doc.registerFont('THSarabun', thaiFontPath);
      doc.font('THSarabun');
    } else {
      console.warn('⚠️ ไม่พบฟอนต์ภาษาไทย THSarabunNew.ttf, ใช้ฟอนต์เริ่มต้นแทน');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${paymentId}.pdf`);

    doc.pipe(res);

    // Header (ซ้าย)
    doc.fontSize(14).text('Toy Auction', 50, 50);
    doc.fontSize(12).text('12/1234 กรุงเทพฯ 10160', 50);
    doc.text('เลขประจำตัวผู้เสียภาษี 0105511222333', 50);
    doc.text('โทร. 1234567890', 50);
    doc.text('อีเมล seller@test.com', 50);

    // Header (ขวา)
    doc.fontSize(16).text('ใบกำกับภาษี/ใบเสร็จรับเงิน', 350, 50, { align: 'right' });
    doc.fontSize(10).text('ต้นฉบับ', 350, 70, { align: 'right' });
    doc.text(`เลขที่: ${payment._id}`, 350, 85, { align: 'right' });
    doc.text(`วันที่: ${new Date(payment.createdAt).toLocaleDateString('th-TH')}`, 350, 100, { align: 'right' });

    // ผู้ซื้อ
    doc.moveDown(2);
    doc.fontSize(12).text(`ชื่อลูกค้า: ${payment.recipientName}`);
    doc.text(`ที่อยู่: ${payment.shippingAddress}`);
    doc.text(`เบอร์โทร: ${payment.recipientPhone}`);

    // รายการสินค้า
    const tableTop = 200;
    const colX = [50, 220, 300, 370, 440, 510];

    doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
    doc.fontSize(12).text('#', colX[0], tableTop + 5);
    doc.text('รายการ', colX[1], tableTop + 5);
    doc.text('จำนวน', colX[2], tableTop + 5);
    doc.text('ราคาต่อหน่วย', colX[3], tableTop + 5);
    doc.text('ส่วนลด', colX[4], tableTop + 5);
    doc.text('ภาษี', colX[5], tableTop + 5);

    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    const itemName = payment.auctionId?.name || '-';
    const price = payment.amount || 0;
    const tax = +(price * 0.07).toFixed(2);
    const total = +(price + tax).toFixed(2);

    const rowY = tableTop + 30;
    doc.text('1', colX[0], rowY);
    doc.text(itemName, colX[1], rowY);
    doc.text('1', colX[2], rowY);
    doc.text(price.toFixed(2), colX[3], rowY);
    doc.text('0.00', colX[4], rowY);
    doc.text('7%', colX[5], rowY);

    doc.moveTo(50, rowY + 20).lineTo(550, rowY + 20).stroke();

    // สรุปราคาด้านล่าง
    const sumY = rowY + 40;
    doc.fontSize(12).text('รวมเป็นเงิน', 400, sumY);
    doc.text(price.toFixed(2), 500, sumY, { align: 'right' });
    doc.text('มูลค่าที่ไม่เสียภาษี/ยกเว้นภาษี', 400, sumY + 15);
    doc.text('0.00', 500, sumY + 15, { align: 'right' });
    doc.text('มูลค่าที่ต้องเสียภาษี', 400, sumY + 30);
    doc.text(price.toFixed(2), 500, sumY + 30, { align: 'right' });
    doc.text('ภาษีมูลค่าเพิ่ม 7%', 400, sumY + 45);
    doc.text(tax.toFixed(2), 500, sumY + 45, { align: 'right' });
    doc.text('จำนวนเงินรวมทั้งสิ้น', 400, sumY + 60);
    doc.text(total.toFixed(2), 500, sumY + 60, { align: 'right' });

    // ภาพสลิป
    // if (payment.slipImage) {
    //   const imagePath = `.${payment.slipImage}`;
    //   if (fs.existsSync(imagePath)) {
    //     doc.image(imagePath, 50, sumY + 100, { fit: [200, 200] });
    //   } else {
    //     doc.text('ไม่พบรูปภาพสลิป', 50, sumY + 100);
    //   }
    // }

    doc.end();
  } catch (err) {
    console.error("❌ downloadReceiptPDF error:", err);
    res.status(500).send("เกิดข้อผิดพลาดในการสร้างใบเสร็จ");
  }
};
