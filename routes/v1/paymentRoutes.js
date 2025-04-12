const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const paymentController = require("../../controllers/paymentController");

const { checkLogin, isAdmin } = require("../../middlewares/authMiddleware");

const router = express.Router();

/* ---------------------- 📦 ตั้งค่าอัปโหลดไฟล์สลิป ---------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/slips/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------------------- 🛡️ ROUTES สำหรับ USER ---------------------- */

router.post("/generate-qr", checkLogin, paymentController.generatePaymentQR);
router.post("/upload-slip/:paymentId", checkLogin, upload.single("slip"), paymentController.uploadPaymentSlip);
router.get("/payment-status/:id", checkLogin, paymentController.checkPaymentStatus);
router.get("/slip-by-auction/:auctionId", checkLogin, paymentController.getSlipByAuctionId);
router.post("/confirm-payment/by-auction/:auctionId", checkLogin, paymentController.confirmPaymentByAuctionId);
router.post("/shipping-status/:paymentId", checkLogin, paymentController.updateShippingStatus);
router.post("/shipping-address/:paymentId", checkLogin, paymentController.updateShippingAddress);

/* ---------------------- 🛡️ ROUTES สำหรับ ADMIN ---------------------- */

router.get("/admin/pending", checkLogin, isAdmin, paymentController.getPendingPayments);
router.post("/admin/:id/approve", checkLogin, isAdmin, paymentController.approvePayment);
router.get("/admin/paid", checkLogin, isAdmin, paymentController.getPaidPaymentsByDateRange); // ✅ ใหม่
router.post("/admin/:id/reject", checkLogin, isAdmin, paymentController.rejectPayment);
router.get("/admin/payment/:id", checkLogin, isAdmin, paymentController.getPaymentById);

/* --------------------------------------------------------------------- */

module.exports = router;
