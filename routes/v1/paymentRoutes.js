const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");  // เพิ่มการ import fs
const paymentController = require("../../controllers/paymentController");

const router = express.Router();

// 📌 ตั้งค่าอัปโหลดไฟล์สลิป
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ตรวจสอบว่าโฟลเดอร์ 'uploads/slips' มีอยู่หรือไม่
    const uploadPath = "uploads/slips/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });  // สร้างโฟลเดอร์หากไม่มี
    }
    cb(null, uploadPath);  // เก็บไฟล์ไว้ในโฟลเดอร์นี้
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // ตั้งชื่อไฟล์ใหม่
  },
});
const upload = multer({ storage });

// 🔹 สร้าง QR Code
// router.post("/generate-qr", paymentController.generatePromptPayQR);

router.post("/generate-qr", paymentController.generateSellerQR);

// 🔹 ตรวจสอบสถานะการชำระเงิน
router.get("/payment-status/:id", paymentController.checkPaymentStatus);

// 🔹 อัปโหลดสลิปการโอนเงิน
router.post("/upload-slip/:id", upload.single("slip"), paymentController.uploadSlip);

// ✅ ตรวจสอบสถานะการชำระเงิน
router.get("/check-status/:id", paymentController.checkPaymentStatus);

router.get("/slip-by-auction/:auctionId", paymentController.getSlipByAuctionId);

router.post("/upload-slip/by-auction/:auctionId", upload.single("slip"), paymentController.uploadSlipByAuctionId);

router.post("/confirm-payment/by-auction/:auctionId", paymentController.confirmPaymentByAuctionId);


module.exports = router;
