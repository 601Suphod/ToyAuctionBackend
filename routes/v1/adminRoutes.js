const express = require('express');
const router = express.Router();
const adminController = require("../../controllers/adminController");
//ดึงข้อมูลผู้ใช้
router.get("/users", adminController.getMembers);

router.delete("/users/:id", adminController.deleteUser);

router.get("/auctions", adminController.getAllAuctions);

router.delete("/auction-del/:id", adminController.deleteAuction);

router.get("/payments", adminController.getAllPayments);

module.exports = router;