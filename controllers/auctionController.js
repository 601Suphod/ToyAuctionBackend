// controllers/auctionController.js
const Auction = require("../schemas/v1/auction.schema");
const Bid = require("../schemas/v1/bid.schema");
const User = require("../schemas/v1/user.schema"); // ✅ เพิ่ม User Schema
const Profile = require("../schemas/v1/profile.schema");
const Notification = require("../schemas/v1/notification.schema");
const sendWinnerEmail = require("../modules/email/emailService");
const sendNextWinnerEmail = require("../modules/email/emailService");
const { isValidObjectId } = require("mongoose");
const mongoose = require("mongoose");

// exports.createAuction = async (req, res) => {
//   try {
//     const { name, description, startingPrice, minimumBidIncrement = 10, image, category } = req.body;

//     // ตรวจสอบค่าที่จำเป็น
//     if (!name || !startingPrice || !category) {
//       return res.status(400).send({ status: "error", message: "Missing required fields" });
//     }

//     // ตรวจสอบหมวดหมู่ที่ถูกต้อง
//     const validCategories = [
//       "designer_toys", "vinyl_figures", "resin_figures", "blind_box",
//       "anime_figures", "movie_game_collectibles", "robot_mecha",
//       "soft_vinyl", "kaiju_monsters", "diy_custom", "retro_vintage",
//       "limited_edition", "gunpla_models", "plastic_models"
//     ];

//     if (!validCategories.includes(category)) {
//       return res.status(400).send({ status: "error", message: "Invalid category" });
//     }

//     const userId = req.user.userId; // ✅ ดึง userId อย่างปลอดภัย
//     console.log(`🆕 สร้างการประมูลโดย User ID: ${userId}`);

//     // ตรวจสอบว่ามี userId หรือไม่
//     if (!req.user || !req.user.userId) {
//       return res.status(401).send({ status: "error", message: "Unauthorized" });
//     }

//     // กำหนดเวลาหมดอายุอัตโนมัติ
//     const expiresAt = new Date();
//     expiresAt.setMinutes(expiresAt.getMinutes() + 5); 

//     const auction = new Auction({
//       name,
//       description: description || "",  // แก้ไขให้มีค่าเริ่มต้น
//       image: image || "https://example.com/default.jpg",
//       startingPrice,
//       currentPrice: startingPrice,
//       minimumBidIncrement,
//       expiresAt,
//       owner: req.user.userId,
//       category,
//     });

//     await auction.save();

//     // ✅ แจ้งเตือนผู้ใช้ทุกคนว่ามีสินค้าใหม่ลงทะเบียน (ยกเว้นเจ้าของสินค้า)
//     const allUsers = await User.find({ _id: { $ne: userId } }, "_id"); // ดึงผู้ใช้ทั้งหมด ยกเว้นเจ้าของ
//     if (allUsers.length > 0) {
//       const notifications = allUsers.map(user => ({
//         user: user._id,
//         message: `🆕 มีสินค้าประมูลใหม่: "${auction.name}"`,
//         type: "new_auction"
//       }));

//       await Notification.insertMany(notifications);
//       console.log(`📢 แจ้งเตือนสินค้าใหม่ "${auction.name}" ให้ผู้ใช้ ${allUsers.length} คน`);
//     }
   
//     res.status(201).send({ status: "success", data: auction });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ status: "error", message: "Internal Server Error" });
//   }
// };

// exports.createAuction = async (req, res) => {
//   try {

//     console.log("📌 Request Body:", req.body);
//     console.log("📌 Uploaded Files:", req.files);

//     const { name, description, startingPrice, minimumBidIncrement = 10, category } = req.body;

//     if (!name || !description || !startingPrice || !category) {
//       return res.status(400).send({ status: "error", message: "Missing required fields" });
//     }

//     const validCategories = [
//       "designer_toys", "vinyl_figures", "resin_figures", "blind_box",
//       "anime_figures", "movie_game_collectibles", "robot_mecha",
//       "soft_vinyl", "kaiju_monsters", "diy_custom", "retro_vintage",
//       "limited_edition", "gunpla_models", "plastic_models"
//     ];

//     if (!validCategories.includes(category)) {
//       return res.status(400).send({ status: "error", message: "Invalid category" });
//     }

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).send({ status: "error", message: "ต้องอัปโหลดภาพสินค้าอย่างน้อย 1 ภาพ" });
//     }

//     if (req.files.length > 5) {
//       return res.status(400).send({ status: "error", message: "สามารถอัปโหลดภาพสินค้าได้ไม่เกิน 5 รูป" });
//     }

//     const images = req.files.map((file) => ({
//       data: file.buffer.toString("base64"),
//       contentType: file.mimetype,
//     }));

//     const expiresAt = new Date();
//     expiresAt.setMinutes(expiresAt.getMinutes() + 5);

//     const auction = new Auction({
//       name,
//       description,
//       image: images || "https://example.com/default.jpg", // ✅ ตั้งค่า default image,
//       startingPrice,
//       currentPrice: startingPrice,
//       minimumBidIncrement,
//       expiresAt,
//       owner: req.user.userId,
//       category,
//     });

//     await auction.save();
//     res.status(201).send({ status: "success", data: auction });
//   } catch (err) {
//     console.error("❌ Error creating auction:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.createAuction = async (req, res) => {
//   try {
//     const { name, description, startingPrice, minimumBidIncrement = 10, category } = req.body;

//     if (!name || !startingPrice || !category) {
//       return res.status(400).send({ status: "error", message: "Missing required fields" });
//     }

//     // ตรวจสอบหมวดหมู่ที่ถูกต้อง
//     const validCategories = [
//       "designer_toys", "vinyl_figures", "resin_figures", "blind_box",
//       "anime_figures", "movie_game_collectibles", "robot_mecha",
//       "soft_vinyl", "kaiju_monsters", "diy_custom", "retro_vintage",
//       "limited_edition", "gunpla_models", "plastic_models"
//     ];
//     if (!validCategories.includes(category)) {
//       return res.status(400).send({ status: "error", message: "Invalid category" });
//     }

//     // ตรวจสอบว่ามีไฟล์อัปโหลดหรือไม่
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).send({ status: "error", message: "ต้องอัปโหลดภาพสินค้าอย่างน้อย 1 ภาพ" });
//     }

//     // จำกัดอัปโหลดสูงสุด 5 รูป
//     if (req.files.length > 5) {
//       return res.status(400).send({ status: "error", message: "สามารถอัปโหลดภาพสินค้าได้ไม่เกิน 5 รูป" });
//     }

//     // แปลงไฟล์เป็น URL
//     const images = req.files.map((file) => `/uploads/${file.filename}`);

//     const expiresAt = new Date();
//     expiresAt.setMinutes(expiresAt.getMinutes() + 5);

//     const auction = new Auction({
//       name,
//       description,
//       image: images,
//       startingPrice,
//       currentPrice: startingPrice,
//       minimumBidIncrement,
//       expiresAt,
//       owner: req.user.userId,
//       category,
//     });

//     await auction.save();
//     res.status(201).send({ status: "success", data: auction });

//   } catch (err) {
//     console.error("❌ Error creating auction:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.createAuction = async (req, res) => {
//   try {
//     const { name, description, startingPrice, minimumBidIncrement = 10, category } = req.body;

//     if (!name || !startingPrice || !category) {
//       return res.status(400).send({ status: "error", message: "Missing required fields" });
//     }

//     // ตรวจสอบไฟล์อัปโหลด
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).send({ status: "error", message: "ต้องอัปโหลดภาพสินค้าอย่างน้อย 1 ภาพ" });
//     }

//     // สร้าง URL ของรูปภาพที่สามารถเรียกใช้จาก Frontend ได้
//     const images = req.files.map(file => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`);

//     const expiresAt = new Date();
//     expiresAt.setMinutes(expiresAt.getMinutes() + 5);

//     const auction = new Auction({
//       name,
//       description,
//       image: images,  // ✅ บันทึก URL ของรูป
//       startingPrice,
//       currentPrice: startingPrice,
//       minimumBidIncrement,
//       expiresAt,
//       owner: req.user.userId,
//       category,
//     });

//     await auction.save();
//     res.status(201).send({ status: "success", data: auction });

//   } catch (err) {
//     console.error("❌ Error creating auction:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

exports.createAuction = async (req, res) => {
  try {
    const { name, description, startingPrice, minimumBidIncrement = 10, category } = req.body;

    if (!name || !startingPrice || !category) {
      return res.status(400).send({ status: "error", message: "Missing required fields" });
    }

    // ✅ ดึง `Profile` พร้อม `User`
    const userId = req.user.userId;
    const profile = await Profile.findOne({ user: userId }).populate("user");

    if (!profile) {
      return res.status(404).send({ status: "error", message: "ไม่พบข้อมูลโปรไฟล์ผู้ขาย" });
    }

    const validCategories = [
      "designer_toys", "vinyl_figures", "resin_figures", "blind_box",
      "anime_figures", "movie_game_collectibles", "robot_mecha",
      "soft_vinyl", "kaiju_monsters", "diy_custom", "retro_vintage",
      "limited_edition", "gunpla_models", "plastic_models"
    ];

    console.log("📌 Profile Data:", profile);
    console.log("📌 User Data:", profile.user);

    // ✅ ดึง `email` และ `phone` จาก `profile.user.user.email`
    const userEmail = profile.user?.user?.email || "ไม่มีอีเมล";
    const userPhone = profile.user?.user?.phone || "ไม่มีเบอร์โทร";

    console.log("📌 Email Before Save:", userEmail);
    console.log("📌 Phone Before Save:", userPhone);

    // ✅ ตรวจสอบการอัปโหลดรูปภาพ
    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ status: "error", message: "ต้องอัปโหลดภาพสินค้าอย่างน้อย 1 ภาพ" });
    }

    // ✅ แปลงไฟล์เป็น URL
    const images = req.files.map(file => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`);

    // ✅ แปลงโปรไฟล์รูปภาพเป็น Base64
    const sellerProfileImage = profile.profileImage
      ? `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString("base64")}`
      : "/default-profile.png";

    // ✅ จัดรูปแบบโปรไฟล์ผู้ขาย
    const sellerInfo = {
      name: profile.name || "ไม่ระบุชื่อ",
      email: userEmail,  // ✅ ใช้ `profile.user.user.email`
      phone: userPhone,  // ✅ ใช้ `profile.user.user.phone`
      profileImage: sellerProfileImage
    };

    console.log("📌 Seller Info Before Save:", sellerInfo);

    // ✅ บันทึกการประมูล
    const auction = new Auction({
      name,
      description,
      image: images,
      startingPrice,
      currentPrice: startingPrice,
      minimumBidIncrement,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      owner: userId,
      category,
      seller: sellerInfo,
      editCount: 2
    });

    await auction.save();
    res.status(201).send({ status: "success", data: auction });

        // ✅ แจ้งเตือนผู้ใช้ทุกคนว่ามีสินค้าใหม่ลงทะเบียน (ยกเว้นเจ้าของสินค้า)
        const allUsers = await User.find({ _id: { $ne: userId } }, "_id"); // ดึงผู้ใช้ทั้งหมด ยกเว้นเจ้าของ
        if (allUsers.length > 0) {
          const notifications = allUsers.map(user => ({
            user: user._id,
            message: `🆕 มีสินค้าประมูลใหม่: "${auction.name}"`,
            type: "new_auction"
          }));
    
          await Notification.insertMany(notifications);
          console.log(`📢 แจ้งเตือนสินค้าใหม่ "${auction.name}" ให้ผู้ใช้ ${allUsers.length} คน`);
        }

  } catch (err) {
    console.error("❌ Error creating auction:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};

// exports.checkAndEndAuctions = async () => {
//   try {
//     console.log("📌 กำลังตรวจสอบการประมูลที่หมดเวลา...");

//     const now = new Date();
//     const expiredAuctions = await Auction.find({ expiresAt: { $lte: now }, status: "active" })
//       .populate("highestBidder", "email name")
//       .populate("owner", "email name");

//     if (expiredAuctions.length === 0) {
//       console.log("⚠️ ไม่มีการประมูลที่ต้องปิด");
//       return;
//     }

//     for (const auction of expiredAuctions) {
//       console.log(`🚨 ปิดการประมูล: ${auction.name}`);

//       auction.status = "ended";
//       auction.finalPrice = auction.currentPrice;

//       let winnerEmail = auction.highestBidder?.email || auction.highestBidderEmail;
//       let winnerName = auction.highestBidder?.name || "ไม่มีผู้ชนะ";

//       // ✅ ถ้า `highestBidderEmail` ไม่มี ให้ดึงจากฐานข้อมูล
//       if (!winnerEmail && auction.highestBidder) {
//         console.log("🔍 ไม่พบอีเมลของผู้ชนะ กำลังดึงข้อมูลใหม่...");
//         const winner = await User.findById(auction.highestBidder);
//         winnerEmail = winner?.email || null;

//         if (winnerEmail) {
//           auction.highestBidderEmail = winnerEmail; // ✅ อัปเดตฐานข้อมูล
//           console.log(`✅ พบอีเมลของผู้ชนะจากฐานข้อมูล: ${winnerEmail}`);
//         } else {
//           console.log(`⚠️ ไม่พบอีเมลของผู้ชนะในฐานข้อมูล`);
//         }
//       }

//       // ✅ ส่งอีเมลแจ้งผู้ชนะ (ถ้ามี)
//       if (winnerEmail) {
//         console.log(`📢 ส่งอีเมลแจ้งเตือนถึงผู้ชนะ: ${winnerEmail}`);
//         try {
//           await sendWinnerEmail(winnerEmail, auction.name, auction.finalPrice);
//           console.log(`✅ ส่งอีเมลสำเร็จถึง: ${winnerEmail}`);
//         } catch (emailError) {
//           console.error(`❌ ส่งอีเมลล้มเหลว: ${emailError.message}`);
//         }
//       }

//       await auction.save();
//     }

//     console.log(`✅ ปิดการประมูลสำเร็จ ${expiredAuctions.length} รายการ`);
//   } catch (err) {
//     console.error("❌ Error checking and ending auctions:", err);
//   }
// };

// ✅ GET: ดึงรายละเอียดของประมูล
// exports.getAuctionById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).send({ status: "error", message: "Invalid auction ID" });
//     }
//     const auction = await Auction.findById(id).populate("highestBidder", "name email")
//       .populate({ path: "bids", select: "user amount createdAt", populate: { path: "user", select: "name" } });
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }
//     res.status(200).send({ status: "success", data: auction });
//   } catch (err) {
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.getAuctionById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).send({ status: "error", message: "Invalid auction ID" });
//     }

//     const auction = await Auction.findById(id).populate("highestBidder", "name email")
//       .populate({ path: "bids", select: "user amount createdAt", populate: { path: "user", select: "name" } });

//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     console.log("📌 Seller Data:", auction.seller); // ✅ ตรวจสอบข้อมูลผู้ขายใน Console

//     res.status(200).send({ status: "success", data: auction });
//   } catch (err) {
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// 📌 ดึงรายละเอียดประมูล

exports.checkAndEndAuctions = async () => {
  try {
    console.log("📌 กำลังตรวจสอบการประมูลที่หมดเวลา...");

    const now = new Date();
    const expiredAuctions = await Auction.find({ expiresAt: { $lte: now }, status: "active" })
      .populate("highestBidder", "email name")
      .populate("owner", "email name");

    if (expiredAuctions.length === 0) {
      console.log("⚠️ ไม่มีการประมูลที่ต้องปิด");
      return;
    }

    for (const auction of expiredAuctions) {
      console.log(`🚨 ปิดการประมูล: ${auction.name}`);

      auction.status = "ended";
      auction.finalPrice = auction.currentPrice;

      // ✅ เช็คว่าราคาปัจจุบัน (currentPrice) มากกว่าหรือเท่ากับราคาเริ่มต้น (startingPrice)
      let winnerEmail = auction.highestBidder?.email || auction.highestBidderEmail;
      let winnerName = auction.highestBidder?.name || "ไม่มีผู้ชนะ";

      // หากราคาปัจจุบันน้อยกว่าราคาเริ่มต้น จะไม่ถือว่าเป็นผู้ชนะ
      if (auction.currentPrice < auction.startingPrice) {
        winnerEmail = null;
        winnerName = "ไม่มีผู้ชนะ";
      }

      // ✅ ถ้า `highestBidderEmail` ไม่มี ให้ดึงจากฐานข้อมูล
      if (!winnerEmail && auction.highestBidder) {
        console.log("🔍 ไม่พบอีเมลของผู้ชนะ กำลังดึงข้อมูลใหม่...");
        const winner = await User.findById(auction.highestBidder);
        winnerEmail = winner?.email || null;

        if (winnerEmail) {
          auction.highestBidderEmail = winnerEmail; // ✅ อัปเดตฐานข้อมูล
          console.log(`✅ พบอีเมลของผู้ชนะจากฐานข้อมูล: ${winnerEmail}`);
        } else {
          console.log(`⚠️ ไม่พบอีเมลของผู้ชนะในฐานข้อมูล`);
        }
      }

      // ✅ ส่งอีเมลแจ้งผู้ชนะ (ถ้ามี)
      if (winnerEmail) {
        console.log(`📢 ส่งอีเมลแจ้งเตือนถึงผู้ชนะ: ${winnerEmail}`);
        try {
          await sendWinnerEmail(winnerEmail, auction.name, auction.finalPrice);
          console.log(`✅ ส่งอีเมลสำเร็จถึง: ${winnerEmail}`);
        } catch (emailError) {
          console.error(`❌ ส่งอีเมลล้มเหลว: ${emailError.message}`);
        }
      }

      await auction.save();
    }

    console.log(`✅ ปิดการประมูลสำเร็จ ${expiredAuctions.length} รายการ`);
  } catch (err) {
    console.error("❌ Error checking and ending auctions:", err);
  }
};


exports.getAuctionById = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("seller", "name email phone") // ✅ ดึงข้อมูลผู้ขาย
      .populate("winner", "name email phone"); // ✅ ดึงข้อมูลผู้ชนะ

    if (!auction) {
      return res.status(404).json({ status: "error", message: "ไม่พบข้อมูลการประมูล" });
    }

    res.status(200).json({ status: "success", data: auction });
  } catch (error) {
    console.error("❌ Error fetching auction:", error);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
  }
};

// ✅ GET: ดึงรายการประมูลทั้งหมด
exports.getAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find().populate("highestBidder", "name email");
    res.status(200).send({ status: "success", data: auctions });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.getAuctionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send({ status: "error", message: "Invalid auction ID" });
    }

    const auction = await Auction.findById(id).select("history").populate("history.user", "name email");
    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    res.status(200).send({ status: "success", data: auction.history });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};

// exports.placeBid = async (req, res) => {
//   try {
//     console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

//     const { amount } = req.body;
//     const { id } = req.params;
//     const userId = req.user?.userId;

//     const auction = await Auction.findById(id);
//     if (!auction) return res.status(404).send({ status: "error", message: "Auction not found" });

//     if (amount < auction.currentPrice + auction.minimumBidIncrement) {
//       return res.status(400).send({ status: "error", message: "Bid too low" });
//     }

//     // ✅ อ่าน email จากคุกกี้ และแก้ปัญหา %40
//     // ✅ ดึง Email จาก Token แทนที่จะใช้จากคุกกี้อย่างเดียว
//     const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//     console.log("📌 Token ที่ใช้:", token);

//     if (!token) {
//       return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
//     }

//     const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
//     console.log("📌 ค่าของ bidderEmail:", bidderEmail);

//     if (!bidderEmail) {
//       console.log("❌ ไม่มีคุกกี้ email");
//       return res.status(400).send({ status: "error", message: "User email not found in cookies" });
//     }

//     const bid = new Bid({ auction: auction._id, user: req.user.userId, amount });

//     // ✅ แจ้งเตือนผู้ใช้ที่ถูกแซงในการประมูล
//     if (auction.highestBidder && auction.highestBidder.toString() !== userId) {
//       const existingNotification = await Notification.findOne({
//         user: auction.highestBidder,
//         message: { $regex: new RegExp(`มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`), $options: "i" },
//         type: "outbid_warning"
//       });
  
//       if (!existingNotification) {
//         await Notification.create({
//           user: auction.highestBidder,
//           message: `⚠️ มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`,
//           type: "outbid_warning"
//         });
//       }
//     }

//     // ✅ แจ้งเตือนให้กับผู้ที่บิดใหม่ (ถ้ายังไม่เคยได้รับ)
//     const bidSuccessNotification = await Notification.findOne({
//       user: userId,
//       message: { $regex: new RegExp(`บิดประมูล "${auction.name}"`), $options: "i" },
//       type: "bid_success"
//     });

//     if (!bidSuccessNotification) {
//       await Notification.create({
//         user: userId,
//         message: `🎯 คุณได้ทำการบิดประมูล "${auction.name}" สำเร็จแล้ว!`,
//         type: "bid_success"
//       });
//     }

//     auction.currentPrice = amount;
//     auction.highestBidder = req.user.userId;
//     auction.highestBidderEmail = bidderEmail; // ✅ บันทึกอีเมลจากคุกกี้
//     auction.bids.push(bid._id);

//     await auction.save();
//     await bid.save();

//     // ✅ สร้างแจ้งเตือนการบิดสำเร็จ
//     //  await Notification.create({
//     //   user: userId,
//     //   message: `🎯 คุณได้ทำการบิดประมูล "${auction.name}" สำเร็จแล้ว!`,
//     //   type: "bid_success"
//     // });

//     console.log("✅ อัปเดต highestBidderEmail สำเร็จ:", bidderEmail);

//     res.status(201).send({ status: "success", data: { auction, bid } });
//   } catch (err) {
//     console.error("❌ Error placing bid:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.placeBid = async (req, res) => {
//   try {
//     console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

//     const { amount } = req.body;
//     const { id } = req.params;
//     const userId = req.user?.userId;

//     const auction = await Auction.findById(id);
//     if (!auction) return res.status(404).send({ status: "error", message: "Auction not found" });

//     if (amount < auction.currentPrice + auction.minimumBidIncrement) {
//       return res.status(400).send({ status: "error", message: "Bid too low" });
//     }

//     // ✅ ดึงข้อมูลผู้ใช้ทุกครั้งที่มีการบิด
//     const user = await User.findById(userId, "name email");
//     if (!user) {
//       return res.status(404).json({ status: "error", message: "User not found" });
//     }

//     let userProfile = await Profile.findOne({ user: userId }, "name");

//     // ✅ ตรวจสอบและกำหนดค่าของ `userName`
//     const userName = userProfile?.name || user?.name;
//     if (!userName) {
//       console.error("❌ Error: User name not found");
//       return res.status(404).json({ status: "error", message: "User name not found" });
//     }

//     console.log("📌 ชื่อผู้บิด:", userName);

//     // ✅ อ่าน email จากคุกกี้
//     const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//     console.log("📌 Token ที่ใช้:", token);

//     if (!token) {
//       return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
//     }

//     const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
//     console.log("📌 ค่าของ bidderEmail:", bidderEmail);

//     if (!bidderEmail) {
//       console.log("❌ ไม่มีคุกกี้ email");
//       return res.status(400).send({ status: "error", message: "User email not found in cookies" });
//     }

//     // ✅ สร้างการบิดใหม่
//     const bid = new Bid({
//       auction: auction._id,
//       userName: userName, // ✅ ใช้ `userName` ที่กำหนดไว้
//       user: req.user.userId,
//       amount
//     });

//     // ✅ แจ้งเตือนผู้ใช้ที่ถูกแซงในการประมูล
//     if (auction.highestBidder && auction.highestBidder.toString() !== userId) {
//       const existingNotification = await Notification.findOne({
//         user: auction.highestBidder,
//         message: { $regex: new RegExp(`มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`), $options: "i" },
//         type: "outbid_warning"
//       });
  
//       if (!existingNotification) {
//         await Notification.create({
//           user: auction.highestBidder,
//           message: `⚠️ มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`,
//           type: "outbid_warning"
//         });
//       }
//     }

//     // ✅ แจ้งเตือนให้กับผู้ที่บิดใหม่ (ถ้ายังไม่เคยได้รับ)
//     const bidSuccessNotification = await Notification.findOne({
//       user: userId,
//       message: { $regex: new RegExp(`บิดประมูล "${auction.name}"`), $options: "i" },
//       type: "bid_success"
//     });

//     if (!bidSuccessNotification) {
//       await Notification.create({
//         user: userId,
//         message: `🎯 คุณได้ทำการบิดประมูล "${auction.name}" สำเร็จแล้ว!`,
//         type: "bid_success"
//       });
//     }

//     // ✅ อัปเดต Auction ให้เก็บข้อมูลของผู้บิดสูงสุด
//     auction.currentPrice = amount;
//     auction.highestBidder = req.user.userId;
//     auction.highestBidderEmail = bidderEmail; // ✅ บันทึกอีเมลจากคุกกี้
//     auction.highestBidderName = userName; // ✅ ใช้ `userName` ที่ถูกกำหนดแล้ว
//     auction.bids.push(bid._id);

//     await auction.save();
//     await bid.save();

//     console.log("✅ อัปเดต highestBidderName สำเร็จ:", userName);

//     res.status(201).send({ status: "success", data: { auction, bid } });
//   } catch (err) {
//     console.error("❌ Error placing bid:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.placeBid = async (req, res) => {
//   try {
//     console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

//     const { amount } = req.body;
//     const { id } = req.params;
//     const userId = req.user?.userId;

//     const auction = await Auction.findById(id);
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     //  ป้องกันการบิดต่อกันโดยผู้ใช้เดิม
//     if (auction.highestBidder && auction.highestBidder.toString() === userId) {
//       return res.status(400).send({ 
//         status: "error", 
//         message: "คุณไม่สามารถบิดต่อกันเองได้ กรุณารอให้มีผู้ใช้คนอื่นบิดก่อน" 
//       });
//     }

//     if (amount < auction.currentPrice + auction.minimumBidIncrement) {
//       return res.status(400).send({ status: "error", message: "Bid too low" });
//     }

//     //  ดึงข้อมูลผู้ใช้ทุกครั้งที่มีการบิด
//     const user = await User.findById(userId, "name email");
//     if (!user) {
//       return res.status(404).json({ status: "error", message: "User not found" });
//     }

//     let userProfile = await Profile.findOne({ user: userId }, "name");

//     const userName = userProfile?.name || user?.name;
//     if (!userName) {
//       console.error("❌ Error: User name not found");
//       return res.status(404).json({ status: "error", message: "User name not found" });
//     }

//     console.log("📌 ชื่อผู้บิด:", userName);

//     const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//     console.log("📌 Token ที่ใช้:", token);

//     if (!token) {
//       return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
//     }

//     const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
//     console.log("📌 ค่าของ bidderEmail:", bidderEmail);

//     if (!bidderEmail) {
//       console.log("❌ ไม่มีคุกกี้ email");
//       return res.status(400).send({ status: "error", message: "User email not found in cookies" });
//     }

//     //  สร้างการบิดใหม่
//     const bid = new Bid({
//       auction: auction._id,
//       userName: userName,
//       user: req.user.userId,
//       amount
//     });

//     //  แจ้งเตือนผู้ใช้ที่ถูกแซงในการประมูล
//     if (auction.highestBidder && auction.highestBidder.toString() !== userId) {
//       const existingNotification = await Notification.findOne({
//         user: auction.highestBidder,
//         message: { $regex: new RegExp(`มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`), $options: "i" },
//         type: "outbid_warning"
//       });

//       if (!existingNotification) {
//         await Notification.create({
//           user: auction.highestBidder,
//           message: `⚠️ มีผู้ประมูลสูงกว่าคุณใน "${auction.name}"`,
//           type: "outbid_warning"
//         });
//       }
//     }

//     //  แจ้งเตือนให้กับผู้ที่บิดใหม่ (ถ้ายังไม่เคยได้รับ)
//     const bidSuccessNotification = await Notification.findOne({
//       user: userId,
//       message: { $regex: new RegExp(`บิดประมูล "${auction.name}"`), $options: "i" },
//       type: "bid_success"
//     });

//     if (!bidSuccessNotification) {
//       await Notification.create({
//         user: userId,
//         message: `🎯 คุณได้ทำการบิดประมูล "${auction.name}" สำเร็จแล้ว!`,
//         type: "bid_success"
//       });
//     }

//     //  อัปเดต Auction ให้เก็บข้อมูลของผู้บิดสูงสุด
//     auction.currentPrice = amount;
//     auction.highestBidder = req.user.userId;
//     auction.highestBidderEmail = bidderEmail;
//     auction.highestBidderName = userName;
//     auction.bids.push(bid._id);

//     await auction.save();
//     await bid.save();

//     console.log("✅ อัปเดต highestBidderName สำเร็จ:", userName);

//     res.status(201).send({ status: "success", data: { auction, bid } });
//   } catch (err) {
//     console.error("❌ Error placing bid:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.placeBid = async (req, res) => {
//   try {
//     console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

//     const { amount } = req.body;
//     const { id } = req.params;
//     const userId = req.user?.userId;

//     const auction = await Auction.findById(id).populate("bids"); // ✅ โหลดข้อมูลการประมูลพร้อมประวัติการบิด
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     // ✅ อัปเดตราคาเริ่มต้นถ้ายังไม่มีผู้บิด
//     if (auction.bids.length === 0) {
//       console.log("📌 ยังไม่มีการบิด -> อัปเดต currentPrice เท่ากับ startingPrice");
//       auction.currentPrice = auction.startingPrice;
//     }

//     // ✅ ป้องกันการบิดต่อกันเอง
//     if (auction.highestBidder && auction.highestBidder.toString() === userId) {
//       return res.status(400).send({ 
//         status: "error", 
//         message: "คุณไม่สามารถบิดต่อกันเองได้ กรุณารอให้มีผู้ใช้คนอื่นบิดก่อน" 
//       });
//     }

//     // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ startingPrice
//     if (amount < auction.startingPrice) {
//       return res.status(400).send({ status: "error", message: "ราคาประมูลต้องมากกว่าหรือเท่ากับราคาเริ่มต้น" });
//     }

//     // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ currentPrice + minimumBidIncrement
//     if (amount < auction.currentPrice + auction.minimumBidIncrement) {
//       return res.status(400).send({ status: "error", message: "ราคาบิดต้องสูงกว่าราคาปัจจุบันและขั้นต่ำที่กำหนด" });
//     }

//     // ✅ ดึงข้อมูลผู้ใช้
//     const user = await User.findById(userId, "name email");
//     if (!user) {
//       return res.status(404).json({ status: "error", message: "User not found" });
//     }
//     let userProfile = await Profile.findOne({ user: userId }, "name");
//     const userName = userProfile?.name || user?.name;
//     if (!userName) {
//       console.error("❌ Error: User name not found");
//       return res.status(404).json({ status: "error", message: "User name not found" });
//     }

//     console.log("📌 ชื่อผู้บิด:", userName);

//     // ✅ ตรวจสอบ Token
//     const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
//     }

//     const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
//     if (!bidderEmail) {
//       return res.status(400).send({ status: "error", message: "User email not found in cookies" });
//     }

//     // ✅ สร้างการบิดใหม่
//     const bid = new Bid({
//       auction: auction._id,
//       userName: userName,
//       user: req.user.userId,
//       amount
//     });

//     // ✅ อัปเดตราคาปัจจุบันตามเงื่อนไข
//     if (auction.bids.length === 0 || amount > auction.startingPrice) {
//       auction.currentPrice = amount;
//     } else {
//       auction.currentPrice = auction.startingPrice;
//     }

//     // ✅ อัปเดตผู้บิดสูงสุด
//     auction.highestBidder = req.user.userId;
//     auction.highestBidderEmail = bidderEmail;
//     auction.highestBidderName = userName;
//     auction.bids.push(bid._id);

//     await auction.save();
//     await bid.save();

//     console.log("✅ อัปเดต highestBidderName สำเร็จ:", userName);

//     res.status(201).send({ status: "success", data: { auction, bid } });
//   } catch (err) {
//     console.error("❌ Error placing bid:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.placeBid = async (req, res) => {
//   try {
//     console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

//     const { amount } = req.body;
//     const { id } = req.params;
//     const userId = req.user?.userId;

//     const auction = await Auction.findById(id).populate("bids"); // ✅ โหลดข้อมูลการประมูลพร้อมประวัติการบิด
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     // ✅ อัปเดตราคาเริ่มต้นถ้ายังไม่มีผู้บิด
//     if (auction.bids.length === 0) {
//       console.log("📌 ยังไม่มีการบิด -> อัปเดต currentPrice เท่ากับ startingPrice");
//       auction.currentPrice = auction.startingPrice;
//     }

//     // ✅ ป้องกันการบิดต่อกันเอง (หลังจากแก้ไขการประมูล, ผู้ชนะถูกล้าง)
//     if (auction.highestBidder && auction.highestBidder.toString() === userId && auction.editCount <= 0) {
//       return res.status(400).send({ 
//         status: "error", 
//         message: "คุณไม่สามารถบิดต่อกันเองได้ กรุณารอให้มีผู้ใช้คนอื่นบิดก่อน" 
//       });
//     }

//     // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ startingPrice
//     if (amount < auction.startingPrice) {
//       return res.status(400).send({ status: "error", message: "ราคาประมูลต้องมากกว่าหรือเท่ากับราคาเริ่มต้น" });
//     }

//     // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ currentPrice + minimumBidIncrement
//     if (amount < auction.currentPrice + auction.minimumBidIncrement) {
//       return res.status(400).send({ status: "error", message: "ราคาบิดต้องสูงกว่าราคาปัจจุบันและขั้นต่ำที่กำหนด" });
//     }

//     // ✅ ดึงข้อมูลผู้ใช้
//     const user = await User.findById(userId, "name email");
//     if (!user) {
//       return res.status(404).json({ status: "error", message: "User not found" });
//     }
//     let userProfile = await Profile.findOne({ user: userId }, "name");
//     const userName = userProfile?.name || user?.name;
//     if (!userName) {
//       console.error("❌ Error: User name not found");
//       return res.status(404).json({ status: "error", message: "User name not found" });
//     }

//     console.log("📌 ชื่อผู้บิด:", userName);

//     // ✅ ตรวจสอบ Token
//     const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
//     }

//     const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
//     if (!bidderEmail) {
//       return res.status(400).send({ status: "error", message: "User email not found in cookies" });
//     }

//     // ✅ สร้างการบิดใหม่
//     const bid = new Bid({
//       auction: auction._id,
//       userName: userName,
//       user: req.user.userId,
//       amount
//     });

//     // ✅ อัปเดตราคาปัจจุบันตามเงื่อนไข
//     if (auction.bids.length === 0 || amount > auction.startingPrice) {
//       auction.currentPrice = amount;
//     } else {
//       auction.currentPrice = auction.startingPrice;
//     }

//     // ✅ อัปเดตผู้บิดสูงสุด
//     auction.highestBidder = req.user.userId;
//     auction.highestBidderEmail = bidderEmail;
//     auction.highestBidderName = userName;
//     auction.bids.push(bid._id);

//     await auction.save();
//     await bid.save();

//     console.log("✅ อัปเดต highestBidderName สำเร็จ:", userName);

//     res.status(201).send({ status: "success", data: { auction, bid } });
//   } catch (err) {
//     console.error("❌ Error placing bid:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

exports.placeBid = async (req, res) => {
  try {
    console.log("📌 คุกกี้ทั้งหมดที่ได้รับ:", req.cookies);

    const { amount } = req.body;
    const { id } = req.params;
    const userId = req.user?.userId;

    const auction = await Auction.findById(id).populate("bids"); // ✅ โหลดข้อมูลการประมูลพร้อมประวัติการบิด
    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    // ✅ อัปเดตราคาเริ่มต้นถ้ายังไม่มีผู้บิด
    if (auction.bids.length === 0) {
      console.log("📌 ยังไม่มีการบิด -> อัปเดต currentPrice เท่ากับ startingPrice");
      auction.currentPrice = auction.startingPrice;
    }

    // ✅ ป้องกันการบิดต่อกันเอง (ต้องตรวจสอบว่าผู้ใช้งานไม่ใช่ highestBidder ก่อน)
    if (auction.highestBidder && auction.highestBidder.toString() === userId) {
      return res.status(400).send({ 
        status: "error", 
        message: "คุณไม่สามารถบิดต่อกันเองได้ กรุณารอให้มีผู้ใช้คนอื่นบิดก่อน" 
      });
    }

    // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ startingPrice
    if (amount < auction.startingPrice) {
      return res.status(400).send({ status: "error", message: "ราคาประมูลต้องมากกว่าหรือเท่ากับราคาเริ่มต้น" });
    }

    // ✅ ตรวจสอบว่าการบิดใหม่ต้องมากกว่าหรือเท่ากับ currentPrice + minimumBidIncrement
    if (amount < auction.currentPrice + auction.minimumBidIncrement) {
      return res.status(400).send({ status: "error", message: "ราคาบิดต้องสูงกว่าราคาปัจจุบันและขั้นต่ำที่กำหนด" });
    }

    // ✅ ดึงข้อมูลผู้ใช้
    const user = await User.findById(userId, "name email");
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    let userProfile = await Profile.findOne({ user: userId }, "name");
    const userName = userProfile?.name || user?.name;
    if (!userName) {
      console.error("❌ Error: User name not found");
      return res.status(404).json({ status: "error", message: "User name not found" });
    }

    console.log("📌 ชื่อผู้บิด:", userName);

    // ✅ ตรวจสอบ Token
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).send({ status: "error", message: "Unauthorized: No token found" });
    }

    const bidderEmail = req.cookies?.email ? decodeURIComponent(req.cookies.email) : null;
    if (!bidderEmail) {
      return res.status(400).send({ status: "error", message: "User email not found in cookies" });
    }

    // ✅ สร้างการบิดใหม่
    const bid = new Bid({
      auction: auction._id,
      userName: userName,
      user: req.user.userId,
      amount
    });

    // ✅ อัปเดตราคาปัจจุบันตามเงื่อนไข
    if (auction.bids.length === 0 || amount > auction.startingPrice) {
      auction.currentPrice = amount;
    } else {
      auction.currentPrice = auction.startingPrice;
    }

    // ✅ อัปเดตผู้บิดสูงสุด
    auction.highestBidder = req.user.userId;
    auction.highestBidderEmail = bidderEmail;
    auction.highestBidderName = userName;
    auction.bids.push(bid._id);

    await auction.save();
    await bid.save();

    console.log("✅ อัปเดต highestBidderName สำเร็จ:", userName);

    res.status(201).send({ status: "success", data: { auction, bid } });
  } catch (err) {
    console.error("❌ Error placing bid:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};


exports.endAuctions = async () => {
  try {
    console.log("📌 กำลังปิดการประมูลที่หมดเวลา...");

    const now = new Date();
    const expiredAuctions = await Auction.find({ expiresAt: { $lte: now }, status: "active" })
      .populate("highestBidder", "email");

    if (expiredAuctions.length === 0) {
      console.log("⚠️ ไม่มีการประมูลที่ต้องปิด");
      return;
    }

    for (const auction of expiredAuctions) {
      auction.status = "ended";
      auction.finalPrice = auction.currentPrice;
      auction.paymentDeadline = new Date(Date.now() + 5 * 60 * 1000);

      await auction.save();

      if (auction.highestBidder?.email) {
        console.log(`📢 ส่งอีเมลแจ้งผู้ชนะ: ${auction.highestBidder.email}`);
        await sendWinnerEmail(auction.highestBidder.email, auction.name, auction.finalPrice);
      } else {
        console.log("⚠️ ไม่พบอีเมลของผู้ชนะ");
      }
    }

    console.log(`✅ ปิดการประมูลสำเร็จ: ${expiredAuctions.length} รายการ`);
  } catch (err) {
    console.error("❌ Error ending auctions:", err);
  }
};

// exports.getBidHistory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).send({ status: "error", message: "Invalid auction ID" });
//     }

//     // ✅ ดึงประวัติการบิดทั้งหมดของการประมูล พร้อม `user.name`
//     const bids = await Bid.find({ auction: id })
//       .populate("user", "user.name email") // ✅ ดึง `user.name` แทน `name`
//       .sort({ createdAt: -1 });

//     if (!bids.length) {
//       return res.status(404).send({ status: "error", message: "No bids found" });
//     }

//     res.status(200).send({ status: "success", data: bids });
//   } catch (err) {
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

exports.getBidHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send({ status: "error", message: "Invalid auction ID" });
    }

    // ✅ ดึงประวัติการบิดทั้งหมดของการประมูล พร้อม `user.name`
    const bids = await Bid.find({ auction: id })
      .populate("user", "user.name email") // ✅ ดึง `user.name` แทน `name`
      .sort({ createdAt: -1 });

    if (!bids.length) {
      return res.status(404).send({ status: "error", message: "No bids found" });
    }

    res.status(200).send({ status: "success", data: bids });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};


exports.getHighestBidder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send({ status: "error", message: "Invalid auction ID" });
    }

    const auction = await Auction.findById(id).populate("highestBidder", "name email");
    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    if (!auction.highestBidder) {
      return res.status(404).send({ status: "error", message: "No bids placed yet" });
    }

    res.status(200).send({
      status: "success",
      data: {
        highestBidder: auction.highestBidder,
        currentPrice: auction.currentPrice,
      },
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.forceEndAuctions = async () => {
  try {
    console.log("🚨 กำลังบังคับปิดการประมูลทั้งหมด...");

    // ✅ ใช้ `select("highestBidderEmail")` แทน `populate()`
    const activeAuctions = await Auction.find({ status: "active" }).select("name highestBidderEmail currentPrice");

    console.log(`📌 พบการประมูลที่ยังเปิดอยู่: ${activeAuctions.length} รายการ`);

    if (activeAuctions.length === 0) {
      console.log("⚠️ ไม่มีการประมูลที่ต้องปิดแบบบังคับ");
      return;
    }

    for (const auction of activeAuctions) {
      auction.status = "ended";
      auction.finalPrice = auction.currentPrice;
      await auction.save();

      if (auction.highestBidderEmail) {
        console.log(`📢 ส่งอีเมลแจ้งเตือนถึงผู้ชนะ: ${auction.highestBidderEmail}`);
        await sendWinnerEmail(auction.highestBidderEmail, auction.name, auction.finalPrice);
      } else {
        console.log(`⚠️ ไม่พบอีเมลของผู้ชนะสำหรับ: ${auction.name}`);
      }
    }

    console.log(`✅ บังคับปิดการประมูลสำเร็จ: ${activeAuctions.length} รายการ`);
  } catch (err) {
    console.error("❌ Error forcing end auctions:", err);
  }
};

exports.forceEndAuctionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send({ status: "error", message: "Invalid auction ID" });
    }

    console.log(`🚨 กำลังบังคับปิดการประมูล ID: ${id}`);

    const auction = await Auction.findById(id).select("name highestBidderEmail currentPrice status");

    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    if (auction.status === "ended") {
      return res.status(400).send({ status: "error", message: "Auction already ended" });
    }

    auction.status = "ended";
    auction.finalPrice = auction.currentPrice;
    await auction.save();

    if (auction.highestBidderEmail) {
      console.log(`📢 ส่งอีเมลแจ้งเตือนถึงผู้ชนะ: ${auction.highestBidderEmail}`);
      await sendWinnerEmail(auction.highestBidderEmail, auction.name, auction.finalPrice);
    } else {
      console.log(`⚠️ ไม่พบอีเมลของผู้ชนะสำหรับ: ${auction.name}`);
    }

    res.status(200).send({ status: "success", message: `Auction ID ${id} forcibly ended` });
  } catch (err) {
    console.error("❌ Error forcing end auction:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.forceExpirePayment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚨 กำลังบังคับให้หมดเวลาชำระเงินสำหรับการประมูล ID: ${id}`);

    const auction = await Auction.findById(id).populate("bids").populate("highestBidder", "email");
    if (!auction) return res.status(404).send({ status: "error", message: "Auction not found" });

    if (auction.status !== "ended") {
      return res.status(400).send({ status: "error", message: "Auction is still active" });
    }

    if (!auction.paymentDeadline) {
      console.log("⚠️ ไม่พบ paymentDeadline → กำหนดค่าใหม่เป็นเวลาปัจจุบัน");
      auction.paymentDeadline = new Date();
      await auction.save();
    }

    const allBids = await Bid.find({ auction: auction._id }).sort({ amount: -1 });
    console.log("🔍 รายการบิดทั้งหมด:", allBids);

    if (allBids.length > 1) {
      const nextBidder = allBids[1]; // 📌 ผู้บิดอันดับถัดไป
      console.log("🔍 ผู้บิดอันดับถัดไป:", nextBidder);

      if (!nextBidder?.user) {
        console.log("⚠️ nextBidder.user เป็น undefined หรือ null");
        return res.status(400).send({ status: "error", message: "Next bidder data is missing" });
      }

      const nextBidderUser = await User.findById(nextBidder.user);
      console.log("🔍 ข้อมูลผู้บิดอันดับถัดไปใน User collection:", nextBidderUser);

      // ✅ ตรวจสอบว่าโครงสร้างข้อมูลของ nextBidderUser ถูกต้อง
      console.log("📧 ตรวจสอบค่า nextBidderUser:", JSON.stringify(nextBidderUser, null, 2));

      // ✅ ดึงอีเมลจากโครงสร้างข้อมูลที่ถูกต้อง
      const nextBidderEmail = nextBidderUser?.email || nextBidderUser?.user?.email || null;
      console.log("📧 อีเมลของผู้บิดคนถัดไป:", nextBidderEmail);

      if (!nextBidderEmail) {
        console.log("⚠️ ไม่พบอีเมลของผู้บิดอันดับถัดไป");
        return res.status(400).send({ status: "error", message: "Next bidder has no email" });
      }

      console.log(`📢 ส่งอีเมลไปยังผู้บิดคนถัดไป: ${nextBidderEmail}`);
      await sendNextWinnerEmail(nextBidderEmail, auction.name, nextBidder.amount);

      auction.highestBidder = nextBidder.user;
      auction.highestBidderEmail = nextBidderEmail;
      auction.finalPrice = nextBidder.amount;
      auction.paymentDeadline = new Date(Date.now() + 5 * 60 * 1000); // ✅ ให้เวลา 24 ชม.
      await auction.save();
    } else {
      console.log(`⚠️ ไม่มีผู้บิดคนถัดไปสำหรับ ${auction.name}`);
      return res.status(400).send({ status: "error", message: "No next bidder available" });
    }

    res.status(200).send({ status: "success", message: "Payment time expired and next bidder assigned" });
  } catch (err) {
    console.error("❌ Error forcing payment expiration:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = [
      { key: "designer_toys", name: "Designer Toys" },
      { key: "vinyl_figures", name: "Vinyl Figures" },
      { key: "resin_figures", name: "Resin Figures" },
      { key: "blind_box", name: "Blind Box Toys" },
      { key: "anime_figures", name: "Anime Figures" },
      { key: "movie_game_collectibles", name: "Movie & Game Collectibles" },
      { key: "robot_mecha", name: "Robot & Mecha Toys" },
      { key: "soft_vinyl", name: "Soft Vinyl (Sofubi)" },
      { key: "kaiju_monsters", name: "Kaiju & Monsters" },
      { key: "diy_custom", name: "DIY & Custom Toys" },
      { key: "retro_vintage", name: "Retro & Vintage Toys" },
      { key: "limited_edition", name: "Limited Edition & Exclusive" },
      { key: "gunpla_models", name: "Gunpla & Mecha Models" }, // ✅ เพิ่มกันพลา
      { key: "plastic_models", name: "Plastic Model Kits" } // ✅ เพิ่มโมเดลพลาสติก
    ];
    res.status(200).send({ status: "success", data: categories });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};

const getUserIdFromRequest = (req) => {
  try {
    if (req.user && req.user.userId) {
      return req.user.userId;
    }
    if (req.cookies && req.cookies.accesstoken) {
      const decoded = jwt.verify(req.cookies.accesstoken, process.env.JWT_SECRET);
      return decoded.userId;
    }
    return null;
  } catch (err) {
    console.error("❌ Error decoding access token:", err);
    return null;
  }
};

// exports.getMyAuctionHistory = async (req, res) => {
//   try {
//     const userId = req.user?.userId; // ดึง userId โดยตรงจาก req.user
//     if (!userId) {
//       return res.status(401).send({ status: "error", message: "Unauthorized or invalid token" });
//     }

//     // ✅ ดึงประวัติการประมูลของตัวเอง + รูป
//     const myAuctions = await Auction.find({ owner: userId })
//       .select("name startingPrice currentPrice image createdAt expiresAt status")
//       .sort({ createdAt: -1 });

//     res.status(200).send({ status: "success", data: myAuctions });
//   } catch (err) {
//     console.error("❌ Error fetching auction history:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

exports.getMyAuctionHistory = async (req, res) => {
  try {
    const userId = req.user?.userId; // ดึง userId โดยตรงจาก req.user
    if (!userId) {
      return res.status(401).send({ status: "error", message: "Unauthorized or invalid token" });
    }

    // ✅ ดึงประวัติการประมูลของตัวเอง + รูป และจำนวนครั้งที่แก้ไข
    const myAuctions = await Auction.find({ owner: userId })
      .select("name startingPrice currentPrice image createdAt expiresAt status editCount") // เพิ่ม editCount
      .sort({ createdAt: -1 });

    res.status(200).send({ status: "success", data: myAuctions });
  } catch (err) {
    console.error("❌ Error fetching auction history:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};


exports.getMyBidHistory = async (req, res) => {
  try {
    console.log("📌 Checking My Bid History...");

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).send({ status: "error", message: "Unauthorized or invalid token" });
    }

    // ✅ ดึงประวัติการบิด และรวมถึงรูปของการประมูลที่บิดไป
    const myBids = await Bid.find({ user: userId })
      .populate("auction", "name currentPrice image")
      .sort({ createdAt: -1 });

    console.log("✅ Found Bids:", myBids.length);
    res.status(200).send({ status: "success", data: myBids });
  } catch (err) {
    console.error("❌ Error fetching bid history:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.getAuctionHistory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send({ status: "error", message: "Invalid auction ID" });
    }

    const auction = await Auction.findById(id)
      .select("history image")  // ✅ เพิ่มให้ดึงรูปของประมูลด้วย
      .populate("history.user", "name email");

    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    res.status(200).send({ status: "success", data: auction.history, image: auction.image });
  } catch (err) {
    console.error("❌ Error fetching auction history:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};

exports.getMyWinningBids = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔍 ค้นหาการประมูลที่ชนะ (highest bid และประมูลจบแล้ว)
    const winningBids = await Bid.find({ user: userId })
      .populate({
        path: "auction",
        match: { status: "ended" }, // ✅ ตรวจสอบว่า Auction สิ้นสุดแล้ว
        select: "name image expiresAt currentPrice"
      })
      .sort({ createdAt: -1 });

    // ✅ กรองเฉพาะที่ชนะ (Auction ที่ `currentPrice === bid.amount`)
    const filteredWinningBids = winningBids.filter(bid => 
      bid.auction && bid.amount === bid.auction.currentPrice
    );

    // 🔹 อัปเดตลง Profile
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: { winningBids: filteredWinningBids.map(bid => ({
          auction: bid.auction._id,
          finalPrice: bid.amount,
          wonAt: bid.auction.expiresAt
        })) 
      }},
      { new: true, upsert: true }
    );

    res.status(200).json({ status: "success", data: filteredWinningBids });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getAllAuctions = async (req, res) => {
  try {
    // 🔍 ดึงข้อมูลการประมูลทั้งหมด
    const auctions = await Auction.find({})
      .populate("owner", "name") // แสดงชื่อเจ้าของ
      .populate("winner", "name email") // แสดงชื่อผู้ชนะ
      .sort({ expiresAt: -1 }); // เรียงลำดับจากใหม่ไปเก่า

    // 🔥 เช็คว่ามีการประมูลที่กำลังเปิดอยู่หรือไม่
    const updatedAuctions = await Promise.all(
      auctions.map(async (auction) => {
        let highestBidder = null;
        let highestBid = auction.currentPrice;

        // ถ้ายังเปิดอยู่ หา "ผู้บิดสูงสุด"
        if (auction.status === "active") {
          const highestBidEntry = await Bid.findOne({ auction: auction._id })
            .sort({ amount: -1 }) // เรียงจากมากไปน้อย
            .populate("user", "name email"); // ดึงชื่อผู้บิดสูงสุด

          if (highestBidEntry) {
            highestBidder = highestBidEntry.user;
            highestBid = highestBidEntry.amount;
          }
        }

        return {
          _id: auction._id,
          name: auction.name,
          image: auction.image || "/default-image.jpg",
          currentPrice: highestBid,
          status: auction.status,
          expiresAt: auction.expiresAt,
          winner: auction.status === "ended" ? auction.winner : null,
          winningBid: auction.status === "ended" ? auction.currentPrice : null,
          highestBidder: auction.status === "active" ? highestBidder : null,
        };
      })
    );

    res.status(200).json({ status: "success", data: updatedAuctions });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// ✅ ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ status: "error", message: "Unauthorized: User ID not found" });

    const notifications = await Notification.find({ user: userId }).sort({ timestamp: -1 });

    res.status(200).json({ status: "success", data: notifications });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// ✅ ตั้งค่าแจ้งเตือนทั้งหมดเป็น "อ่านแล้ว"
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ status: "error", message: "Unauthorized" });

    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    res.status(200).json({ status: "success", message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.handleAuctionNotifications = async () => {
  try {
    console.log("🔔 กำลังตรวจสอบแจ้งเตือนการประมูล...");

    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    // 🔍 หา Auction ที่เหลือ 5 นาที
    const soonToEndAuctions = await Auction.find({
      expiresAt: { $gte: now, $lte: fiveMinutesLater },
      status: "active"
    }).populate("highestBidder", "name");

    for (const auction of soonToEndAuctions) {
      if (auction.highestBidder) {
        // ✅ เช็คว่าแจ้งเตือนนี้เคยถูกสร้างไปแล้วหรือไม่
        const existingNotification = await Notification.findOne({
          user: auction.highestBidder._id,
          message: `🔥 การประมูล "${auction.name}" กำลังจะจบใน 5 นาที!`,
          type: "time_warning"
        });

        if (!existingNotification) {
          console.log(`⏳ แจ้งเตือน: การประมูล "${auction.name}" เหลือ 5 นาที!`);

          await Notification.create({
            user: auction.highestBidder._id,
            message: `🔥 การประมูล "${auction.name}" กำลังจะจบใน 5 นาที!`,
            type: "time_warning"
          });
        }
      }
    }

    // 🔍 หา Auction ที่จบแล้ว
    const expiredAuctions = await Auction.find({ expiresAt: { $lte: now }, status: "ended" })
      .populate("highestBidder", "name");

    for (const auction of expiredAuctions) {
      if (auction.highestBidder) {
        // ✅ เช็คว่าแจ้งเตือนนี้เคยถูกสร้างไปแล้วหรือไม่
        const existingNotification = await Notification.findOne({
          user: auction.highestBidder._id,
          message: `🎉 คุณชนะการประมูล "${auction.name}"`,
          type: "auction_end"
        });

        if (!existingNotification) {
          console.log(`🎉 แจ้งเตือน: การประมูล "${auction.name}" จบลงแล้ว!`);

          await Notification.create({
            user: auction.highestBidder._id,
            message: `🎉 คุณชนะการประมูล "${auction.name}"`,
            type: "auction_end"
          });
        }
      }
    }

    console.log("✅ ตรวจสอบแจ้งเตือนเสร็จสิ้น!");
  } catch (err) {
    console.error("❌ Error in handleAuctionNotifications:", err);
  }
};

exports.getClosedAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ status: "ended" })
      .populate("owner", "name") 
      .populate("winner", "name email") 
      .sort({ expiresAt: -1 });

    const closedAuctions = auctions.map(auction => ({
      _id: auction._id,
      name: auction.name,
      image: auction.image?.length ? auction.image : ["/default-image.jpg"], // ✅ ให้แน่ใจว่าเป็น Array เสมอ
      currentPrice: auction.currentPrice,
      expiresAt: auction.expiresAt,
      winner: auction.winner ? { name: auction.winner.name, email: auction.winner.email } : null,
      highestBidderName: auction.highestBidderName || "ไม่ระบุ", // ✅ ป้องกัน undefined
      winningBid: auction.finalPrice || auction.currentPrice, // ✅ ใช้ finalPrice ถ้ามี
    }));

    res.status(200).json({ status: "success", data: closedAuctions });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// 📌 ฟังก์ชันอัปเดต QR Code และ Payment ID ลงในฐานข้อมูล Auction
exports.updateAuctionQR = async (req, res) => {
  try {
    const { qrCode, paymentId } = req.body; // รับข้อมูล QR Code และ Payment ID จาก request
    const auctionId = req.params.id; // ดึง auctionId จาก URL params

    if (!qrCode || !paymentId) {
      return res.status(400).json({ status: "error", message: "❌ QR Code และ Payment ID ต้องไม่เป็นค่าว่าง" });
    }

    // ✅ บันทึก QR Code และ Payment ID ลงใน `Auction`
    const auction = await Auction.findByIdAndUpdate(
      auctionId,
      { qrCode, paymentId },
      { new: true }
    );

    if (!auction) {
      return res.status(404).json({ status: "error", message: "❌ ไม่พบการประมูล" });
    }

    res.status(200).json({ 
      status: "success", 
      message: "✅ อัปเดต QR Code สำเร็จ", 
      data: auction 
    });
  } catch (error) {
    console.error("❌ Error updating QR Code:", error);
    res.status(500).json({ status: "error", message: "❌ ไม่สามารถอัปเดต QR Code ได้" });
  }
};

// 📌 เพิ่มฟังก์ชันค้นหาสินค้า
exports.searchAuctions = async (req, res) => {
  try {
    const { name, category } = req.query;
    let query = {};

    if (name || category) {
      query.$or = [];
      if (name) {
        query.$or.push({ name: { $regex: new RegExp(name, "i") } });
      }
      if (category) {
        query.$or.push({ category: { $regex: new RegExp(category, "i") } });
      }
    }

    console.log("🔍 ค้นหาด้วยเงื่อนไข:", query); // ✅ Debugging

    const auctions = await Auction.find(query).populate("owner", "name");

    if (!auctions.length) {
      return res.status(200).json({ status: "success", data: [], message: "❌ ไม่พบสินค้า" });
    }

    res.status(200).json({ status: "success", data: auctions });
  } catch (err) {
    console.error("❌ Error in search:", err);
    res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหา" });
  }
};

// exports.editAuction = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, startingPrice, minimumBidIncrement, category } = req.body;

//     const auction = await Auction.findById(id).populate("bids"); // ✅ โหลดข้อมูลพร้อมประวัติการบิด
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     // ✅ ตรวจสอบสิทธิ์ว่าเป็นเจ้าของหรือไม่
//     if (auction.owner.toString() !== req.user.userId) {
//       return res.status(403).send({ status: "error", message: "Unauthorized to edit this auction" });
//     }

//     // ✅ ตรวจสอบจำนวนครั้งที่สามารถแก้ไขได้ (สูงสุด 2 ครั้ง)
//     if (auction.editCount >= 2) {
//       return res.status(400).send({ status: "error", message: "คุณได้ทำการแก้ไขการประมูลนี้แล้ว 2 ครั้ง ไม่สามารถแก้ไขได้อีก" });
//     }

//     // ✅ อัปเดตข้อมูลที่แก้ไข
//     auction.name = name || auction.name;
//     auction.description = description || auction.description;
//     auction.startingPrice = startingPrice || auction.startingPrice;
//     auction.minimumBidIncrement = minimumBidIncrement || auction.minimumBidIncrement;
//     auction.category = category || auction.category;

//     // ✅ คำนวณ `currentPrice` ตามเงื่อนไข
//     if (auction.bids.length === 0) {
//       auction.currentPrice = auction.startingPrice; // 📌 ถ้ายังไม่มีคนบิด ให้ราคาปัจจุบันเท่ากับราคาเริ่มต้น
//     } else {
//       const highestBid = Math.max(...auction.bids.map(bid => bid.amount));
//       auction.currentPrice = highestBid >= auction.startingPrice ? highestBid : auction.startingPrice;
//     }

//     // ✅ เพิ่มจำนวนการแก้ไข
//     auction.editCount = auction.editCount + 1;

//     await auction.save(); // ✅ บันทึกข้อมูลลงฐานข้อมูล

//     res.status(200).send({ status: "success", data: auction });
//   } catch (err) {
//     console.error("❌ Error editing auction:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

// exports.editAuction = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, startingPrice, minimumBidIncrement, category } = req.body;

//     const auction = await Auction.findById(id).populate("bids");
//     if (!auction) {
//       return res.status(404).send({ status: "error", message: "Auction not found" });
//     }

//     // ตรวจสอบสิทธิ์ว่าเป็นเจ้าของการประมูลหรือไม่
//     if (auction.owner.toString() !== req.user.userId) {
//       return res.status(403).send({ status: "error", message: "Unauthorized to edit this auction" });
//     }

//     // ตรวจสอบจำนวนครั้งที่สามารถแก้ไขได้ (สูงสุด 2 ครั้ง)
//     if (auction.editCount <= 0) {
//       return res.status(400).send({ status: "error", message: "คุณได้ทำการแก้ไขการประมูลนี้แล้ว 2 ครั้ง ไม่สามารถแก้ไขได้อีก" });
//     }

//     // อัปเดตข้อมูลที่แก้ไข
//     auction.name = name || auction.name;
//     auction.description = description || auction.description;
//     auction.startingPrice = startingPrice || auction.startingPrice;
//     auction.minimumBidIncrement = minimumBidIncrement || auction.minimumBidIncrement;
//     auction.category = category || auction.category;

//     // คำนวณ `currentPrice` ตามเงื่อนไข
//     if (auction.bids.length === 0) {
//       auction.currentPrice = auction.startingPrice; // ถ้ายังไม่มีคนบิด ให้ราคาปัจจุบันเท่ากับราคาเริ่มต้น
//     } else {
//       const highestBid = Math.max(...auction.bids.map(bid => bid.amount));
//       auction.currentPrice = highestBid >= auction.startingPrice ? highestBid : auction.startingPrice;
//     }

//     // ล้างข้อมูลของผู้ชนะ (ชื่อและอีเมล)
//     auction.highestBidderEmail = null;
//     auction.highestBidderName = null;

//     // ลดจำนวนการแก้ไข (ครั้งละ 1)
//     auction.editCount = auction.editCount - 1;

//     await auction.save(); // บันทึกข้อมูลลงฐานข้อมูล

//     res.status(200).send({ status: "success", data: auction });
//   } catch (err) {
//     console.error("❌ Error editing auction:", err);
//     res.status(500).send({ status: "error", message: err.message });
//   }
// };

exports.editAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startingPrice, minimumBidIncrement, category } = req.body;

    const auction = await Auction.findById(id).populate("bids");
    if (!auction) {
      return res.status(404).send({ status: "error", message: "Auction not found" });
    }

    // ตรวจสอบสิทธิ์ว่าเป็นเจ้าของการประมูลหรือไม่
    if (auction.owner.toString() !== req.user.userId) {
      return res.status(403).send({ status: "error", message: "Unauthorized to edit this auction" });
    }

    // ตรวจสอบจำนวนครั้งที่สามารถแก้ไขได้ (สูงสุด 2 ครั้ง)
    if (auction.editCount <= 0) {
      return res.status(400).send({ status: "error", message: "คุณได้ทำการแก้ไขการประมูลนี้แล้ว 2 ครั้ง ไม่สามารถแก้ไขได้อีก" });
    }

    // อัปเดตข้อมูลที่แก้ไข
    auction.name = name || auction.name;
    auction.description = description || auction.description;
    auction.startingPrice = startingPrice || auction.startingPrice;
    auction.minimumBidIncrement = minimumBidIncrement || auction.minimumBidIncrement;
    auction.category = category || auction.category;

    // คำนวณ `currentPrice` ตามเงื่อนไข
    if (auction.bids.length === 0) {
      auction.currentPrice = auction.startingPrice; // ถ้ายังไม่มีคนบิด ให้ราคาปัจจุบันเท่ากับราคาเริ่มต้น
    } else {
      const highestBid = Math.max(...auction.bids.map(bid => bid.amount));
      auction.currentPrice = highestBid >= auction.startingPrice ? highestBid : auction.startingPrice;
    }

    // ล้างข้อมูลของผู้ชนะ (ชื่อและอีเมล) หลังการแก้ไข
    auction.highestBidderEmail = null;
    auction.highestBidderName = null;

    // ลดจำนวนการแก้ไข (ครั้งละ 1)
    auction.editCount = auction.editCount - 1;

    await auction.save(); // บันทึกข้อมูลลงฐานข้อมูล

    res.status(200).send({ status: "success", data: auction });
  } catch (err) {
    console.error("❌ Error editing auction:", err);
    res.status(500).send({ status: "error", message: err.message });
  }
};
