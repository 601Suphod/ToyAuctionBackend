const qrcode = require("qrcode");
const generatePayload = require("promptpay-qr");
const QRCodeModel = require("../schemas/v1/QRcode.shema");
const Auction = require("../schemas/v1/auction.schema");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch"); // ✅ ใช้ fetch เพื่อเรียก API ภายใน Backend
const Tesseract = require('tesseract.js');

// 📌 ฟังก์ชันสร้าง QR Code พร้อมเพย์สำหรับการจ่ายเงิน
exports.generatePaymentQR = async (req, res) => {
  try {
    const { auctionId } = req.body;

    // ดึงข้อมูลการประมูล
    const auction = await Auction.findById(auctionId).populate("owner", "phone email");
    if (!auction) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการประมูล" });
    }

    // ดึงหมายเลขพร้อมเพย์ของผู้ขาย
    const sellerPhone = auction.owner.phone;
    if (!sellerPhone) {
      return res.status(400).json({ error: "ผู้ขายไม่มีหมายเลขพร้อมเพย์" });
    }

    // สร้าง QR Code
    const payload = generatePayload(sellerPhone, { amount: auction.currentPrice });
    const qrCode = await qrcode.toDataURL(payload);

    // บันทึก QR Code ลงฐานข้อมูล
    const payment = new Payment({
      userId: auction.highestBidder,
      auctionId,
      amount: auction.currentPrice,
      qrCode,
      status: "pending",
    });
    await payment.save();

    // อัปเดตการประมูลให้เก็บ QR Code
    auction.paymentQR = qrCode;
    await auction.save();

    res.status(200).json({ success: true, qrCode, auctionId });
  } catch (error) {
    console.error("❌ Error generating QR Code:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
};

// ฟังก์ชันตรวจสอบสถานะการชำระเงิน
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Checking status for QR Code ID: ${id}`);
    
    const qrCodeData = await QRCodeModel.findById(id);

    if (!qrCodeData) {
      console.log("❌ ไม่พบ QR Code ในฐานข้อมูล");
      return res.status(404).json({ error: "❌ ไม่พบ QR Code" });
    }

    // ✅ ตรวจสอบว่า QR Code หมดอายุหรือไม่
    if (new Date() > qrCodeData.expiresAt) {
      qrCodeData.isPaid = false;
      await qrCodeData.save();
      return res.status(400).json({ error: "⏳ QR Code หมดอายุแล้ว" });
    }

    console.log(`✅ Payment status: ${qrCodeData.isPaid ? "PAID" : "NOT PAID"}`);

    res.status(200).json({
      success: true,
      isPaid: qrCodeData.isPaid,
      slipImage: qrCodeData.slipImage,
      message: qrCodeData.isPaid ? "✅ การชำระเงินสำเร็จแล้ว" : "⏳ ยังไม่ได้ชำระเงิน",
    });
  } catch (error) {
    console.error("❌ Error checking payment status:", error.message);
    res.status(500).json({ error: "❌ เกิดข้อผิดพลาดในระบบ" });
  }
};

exports.uploadSlip = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    const qrCodeData = await QRCodeModel.findById(qrCodeId);

    if (!qrCodeData) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูล QR Code" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "ไม่ได้อัปโหลดไฟล์สลิป" });
    }

    // ❌ ลบการเช็ค OCR
    // const slipPath = req.file.path;
    // const parsedAmount = await parseSlipAmount(slipPath);
    // const expectedAmount = qrCodeData.amount;

    // if (Math.abs(parsedAmount - expectedAmount) > 1) {
    //   return res.status(400).json({ success: false, message: "จำนวนเงินในสลิปไม่ถูกต้อง" });
    // }

    qrCodeData.slipImage = `http://localhost:3111/${req.file.path}`;
    qrCodeData.isPaid = false; // ✅ ยังไม่ยืนยันโดยผู้ขาย
    await qrCodeData.save();

    return res.status(200).json({
      success: true,
      message: "อัปโหลดสลิปสำเร็จ รอผู้ขายตรวจสอบ",
      slipImage: qrCodeData.slipImage,
    });
  } catch (error) {
    console.error("❌ Upload slip error:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปโหลดสลิป" });
  }
};

const checkPaymentsAutomatically = async () => {
  console.log("🔄 กำลังตรวจสอบสถานะการชำระเงิน...");
  try {
    const pendingPayments = await QRCodeModel.find({ isPaid: false, expiresAt: { $gte: new Date() } });

    for (const payment of pendingPayments) {
      // 📌 ตรวจสอบว่ามีการชำระเงินผ่าน API ธนาคาร (สมมติว่าฟังก์ชัน checkBankPaymentStatus ทำหน้าที่นี้)
      const isPaid = await checkBankPaymentStatus(payment.payload); 

      if (isPaid) {
        payment.isPaid = true;
        await payment.save();

        console.log(`✅ อัปเดตการชำระเงินสำเร็จ: ${payment._id}`);

        // 📌 แจ้งเตือนผู้ขายเมื่อได้รับการชำระเงิน
        notifySeller(payment);
      }
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน:", error);
  }
};

exports.generateSellerQR = async (req, res) => {
  try {
    const { auctionId, recipient, amount } = req.body;

    if (!recipient || !amount || !auctionId) {
      return res.status(400).json({ error: "❌ กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ✅ สร้าง QR Code
    const payload = generatePayload(recipient, { amount: parseFloat(amount) });
    const qrCodeDataUrl = await qrcode.toDataURL(payload);
    const paymentId = uuidv4(); // ✅ สร้าง `paymentId` แบบสุ่ม

    // ✅ บันทึก QR Code ลง `QRCodeSchema`
    const qrCodeEntry = await QRCodeModel.create({
      auctionId,
      recipient,
      amount,
      payload,
      qrCode: qrCodeDataUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ✅ หมดอายุใน 24 ชั่วโมง
      isPaid: false,
    });

    // ✅ อัปเดต `Auction` ให้บันทึก `qrCode` และ `paymentId`
    const updatedAuction = await Auction.findByIdAndUpdate(
      auctionId,
      { qrCode: qrCodeDataUrl, paymentId },
      { new: true }
    );

    if (!updatedAuction) {
      return res.status(404).json({ error: "❌ ไม่พบการประมูล" });
    }

    res.status(200).json({
      success: true,
      message: "✅ สร้าง QR Code สำเร็จ และบันทึกลงฐานข้อมูล",
      qrCode: qrCodeDataUrl,
      paymentId,
      auctionId
    });
  } catch (error) {
    console.error("❌ Error generating QR Code:", error);
    res.status(500).json({ error: "❌ เกิดข้อผิดพลาดในระบบ" });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const qrCodeData = await QRCodeModel.findById(id);

    if (!qrCodeData) {
      return res.status(404).json({ error: "❌ ไม่พบ QR Code นี้" });
    }

    // ✅ ตรวจสอบว่า QR Code หมดอายุหรือไม่
    if (new Date() > qrCodeData.expiresAt) {
      qrCodeData.isPaid = false;
      await qrCodeData.save();
      return res.status(400).json({ error: "⏳ QR Code หมดอายุแล้ว" });
    }

    res.status(200).json({
      success: true,
      isPaid: qrCodeData.isPaid,
      slipImage: qrCodeData.slipImage,
      message: qrCodeData.isPaid ? "✅ การชำระเงินสำเร็จแล้ว" : "⏳ ยังไม่ได้ชำระเงิน",
    });
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    res.status(500).json({ error: "❌ เกิดข้อผิดพลาดในระบบ" });
  }
};

// 📌 อัปเดต QR Code ในฐานข้อมูล
exports.updateQRForAuction = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const auctionId = req.params.id;

    if (!qrCode) {
      return res.status(400).json({ status: "error", message: "QR Code ไม่สามารถว่างเปล่าได้" });
    }

    const auction = await Auction.findByIdAndUpdate(
      auctionId,
      { qrCode },
      { new: true }
    );

    if (!auction) {
      return res.status(404).json({ status: "error", message: "ไม่พบการประมูล" });
    }

    res.status(200).json({ status: "success", message: "อัปเดต QR Code สำเร็จ", data: auction });
  } catch (error) {
    console.error("❌ Error updating QR Code:", error);
    res.status(500).json({ status: "error", message: "ไม่สามารถอัปเดต QR Code ได้" });
  }
};

// 📌 ฟังก์ชันอัปโหลดสลิปและตรวจสอบการชำระเงิน
exports.uploadPaymentSlip = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const slipImage = req.file ? req.file.path : null;

    if (!slipImage) {
      return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพสลิป" });
    }

    // ค้นหาการชำระเงิน
    const payment = await Payment.findById(paymentId).populate("auctionId");
    if (!payment) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการชำระเงิน" });
    }

    // อัปเดตสถานะเป็น "completed"
    payment.status = "completed";
    payment.slipImage = slipImage;
    await payment.save();

    // แจ้งเตือนผู้ขาย
    await Notification.create({
      user: payment.auctionId.owner,
      message: `✅ ผู้ชนะการประมูล "${payment.auctionId.name}" ได้ชำระเงินแล้ว`,
      type: "payment_received",
    });

    res.status(200).json({ success: true, message: "อัปโหลดสลิปสำเร็จ" });
  } catch (error) {
    console.error("❌ Error uploading slip:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
};

// 📌 ฟังก์ชันอัปเดตที่อยู่จัดส่ง
exports.updateShippingAddress = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "กรุณากรอกที่อยู่จัดส่ง" });
    }

    // ค้นหาการชำระเงิน
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== "completed") {
      return res.status(400).json({ error: "ยังไม่สามารถเพิ่มที่อยู่จัดส่งได้" });
    }

    // บันทึกที่อยู่ลงในฐานข้อมูล
    payment.shippingAddress = address;
    await payment.save();

    res.status(200).json({ success: true, message: "บันทึกที่อยู่จัดส่งสำเร็จ" });
  } catch (error) {
    console.error("❌ Error updating shipping address:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  }
};

// ฟังก์ชันตรวจจับจำนวนเงินจากสลิป
const parseSlipAmount = async (imagePath) => {
  try {
    const result = await Tesseract.recognize(
      imagePath,
      'eng', // ภาษา
      {
        logger: (m) => console.log(m), // บันทึกสถานะ
      }
    );

    // แปลงข้อความที่ได้เป็นจำนวนเงิน
    const amount = extractAmountFromText(result.text); // ใช้ฟังก์ชันดึงจำนวนเงินจาก OCR
    return amount;
  } catch (error) {
    console.error("Error parsing slip amount:", error);
    throw new Error("ไม่สามารถตรวจจับจำนวนเงินจากสลิปได้");
  }
};

// ฟังก์ชันดึงจำนวนเงินจากข้อความที่ OCR ตรวจจับได้
const extractAmountFromText = (text) => {
  // ทำความสะอาดข้อความที่ OCR ตรวจจับได้ เช่น ลบช่องว่าง, ฿, และ , (comma)
  const cleanedText = text.replace(/[,฿\s]/g, '');  // ลบ , ฿ และช่องว่าง
  const regex = /\d+(?:\.\d{2})?/g;
  const match = cleanedText.match(regex);
  return match ? parseFloat(match[0]) : null;
};

exports.getSlipByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const qrCodeData = await QRCodeModel.findOne({ auctionId });

    if (!qrCodeData) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการชำระเงินของการประมูลนี้" });
    }

    res.status(200).json({
      success: true,
      slipImage: qrCodeData.slipImage,
      isPaid: qrCodeData.isPaid,
      message: qrCodeData.isPaid ? "✅ การชำระเงินสำเร็จแล้ว" : "⏳ ยังไม่ได้ชำระเงิน",
    });
  } catch (error) {
    console.error("❌ Error fetching slip by auctionId:", error.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};

exports.uploadSlipByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const slipImagePath = req.file ? `/uploads/slips/${req.file.filename}` : null;

    if (!slipImagePath) {
      return res.status(400).json({ success: false, message: "❌ ไม่มีสลิปที่ถูกอัปโหลด" });
    }

    // สามารถบันทึกข้อมูลสลิปกับการประมูลได้ที่นี่ เช่น เก็บในฐานข้อมูล
    // ใช้ auctionId เพื่อบันทึกข้อมูล

    return res.status(200).json({ success: true, slipImage: slipImagePath });
  } catch (error) {
    console.error("❌ Error while uploading slip:", error);
    return res.status(500).json({ success: false, message: "❌ เกิดข้อผิดพลาดในการอัปโหลดสลิป" });
  }
};

exports.confirmPaymentByAuctionId = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const qrCodeData = await QRCodeModel.findOne({ auctionId });

    if (!qrCodeData) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงิน" });
    }

    qrCodeData.isPaid = true;
    await qrCodeData.save();

    res.status(200).json({ success: true, message: "อัปเดตสถานะการชำระเงินเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ confirmPaymentByAuctionId:", error.message);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
  }
};


// 📌 รันตรวจสอบทุกๆ 5 นาที
setInterval(checkPaymentsAutomatically, 5 * 60 * 1000);