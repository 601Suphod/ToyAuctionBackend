const express = require("express");
const { 
  createAuction, getAuctions, getAuctionById, placeBid, endAuctions, 
  getAuctionHistory, getBidHistory, forceEndAuctions, forceEndAuctionById, 
  getHighestBidder, forceExpirePayment, getCategories,getMyAuctionHistory, getMyBidHistory, getMyWinningBids, 
  getAllAuctions, getNotifications, markAllNotificationsAsRead, getClosedAuctions, updateAuctionQR, searchAuctions,editAuction 
} = require("../../controllers/auctionController");
const { checkLogin } = require("../../middlewares/authMiddleware");
const Auction = require("../../schemas/v1/auction.schema");
const { generatePaymentQR, uploadPaymentSlip, updateShippingAddress } = require("../../controllers/paymentController");

const fs = require("fs");
const path = require("path");

const router = express.Router();

const multer = require("multer");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // สร้างโฟลเดอร์ uploads หากไม่มีอยู่
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    console.log("❌ ไฟล์ไม่ใช่รูปภาพ:", file.mimetype);
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาดไฟล์ 5MB
});
router.get("/search", searchAuctions);
// อัปเดต Route ให้รองรับการอัปโหลดไฟล์
router.post("/", upload.array("image", 5), checkLogin, createAuction);
// ✅ สร้างการประมูลใหม่ (รองรับการอัปโหลด 5 รูป)
router.post("/", checkLogin, createAuction);

// ✅ API แจ้งเตือน
router.get("/notifications", checkLogin, getNotifications);
router.post("/notifications/read-all", checkLogin, markAllNotificationsAsRead);

router.get("/closed-auctions", getClosedAuctions);

router.get("/my-auctions", checkLogin, getMyAuctionHistory);
router.get("/my-bids", checkLogin ,getMyBidHistory);
router.get("/my-winning-bids", checkLogin, getMyWinningBids);

router.get("/all", getAllAuctions);
// ✅ ดึงรายการประมูลทั้งหมด
router.get("/", getAuctions);
router.get("/categories", getCategories);
router.get("/:id", getAuctionById);
router.get("/:id/history", getAuctionHistory);
router.get("/:id/bids", getBidHistory);
router.get("/:id/highest-bidder", getHighestBidder);

// ✅ ปิดการประมูลทั้งหมดแบบบังคับ
router.post("/force-end-auctions", async (req, res) => {
  try {
    await forceEndAuctions();
    res.status(200).send({ status: "success", message: "Auctions forcibly ended" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// ✅ ปิดการประมูลเฉพาะ ID แบบบังคับ
router.post("/force-end-auction/:id", async (req, res) => {
  try {
    await forceEndAuctionById(req, res);
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// ✅ หมดเวลาชำระเงินแบบบังคับ
router.post("/force-expire-payment/:id", async (req, res) => {
  try {
    await forceExpirePayment(req, res);
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// ✅ ใช้ `checkLogin` เพื่อป้องกัน API ที่ต้องมีการล็อกอิน
router.use(checkLogin);

router.put("/:id", checkLogin, editAuction);

// ✅ ทำการบิด
router.post("/:id/bids", placeBid);

// ✅ อัปเดตสถานะการประมูลที่หมดเวลา
router.post("/end-auctions", async (req, res) => {
  try {
    await endAuctions();
    res.status(200).send({ status: "success", message: "Auctions checked and updated" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// ✅ ดึงรายการประมูลของตัวเองที่ยังเปิดอยู่
router.get("/my-auctions", async (req, res) => {
  try {
    const auctions = await Auction.find({ owner: req.user.userId, status: "active" });
    res.status(200).send({ status: "success", data: auctions });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// ✅ ดึงรายการประมูลที่ปิดไปแล้ว
router.get("/my-auctions/closed", async (req, res) => {
  try {
    const closedAuctions = await Auction.find({ owner: req.user.userId, status: "ended" });
    res.status(200).send({ status: "success", data: closedAuctions });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// 📌 API สำหรับอัปเดต QR Code และ Payment ID
router.post("/:id/update-qr", updateAuctionQR);

router.post("/:id/generate-payment-qr", checkLogin, generatePaymentQR);
router.post("/:id/upload-slip", checkLogin, upload.single("slip"), uploadPaymentSlip);
router.post("/:id/update-shipping-address", checkLogin, updateShippingAddress);


module.exports = router;
