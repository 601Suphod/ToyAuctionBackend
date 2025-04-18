const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: [String], required: true, default: ["https://example.com/default.jpg"] },
  startingPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  minimumBidIncrement: { type: Number, required: true, default: 10 },
  expiresAt: { 
    type: Date, 
    required: true, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)  
  },
  status: { type: String, enum: ["active", "ended"], default: "active" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  highestBidderEmail: { type: String },
  highestBidderName: { type: String },
  finalPrice: { type: Number },
  paymentDeadline: { type: Date, default: null },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  winnerName: { type: String },
  bids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bid" }],
  history: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: { type: String, enum: ["BID", "UPDATE", "END"] },
      amount: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  category: { 
    type: String, 
    enum: [
      "designer_toys", "vinyl_figures", "resin_figures", "blind_box",
      "anime_figures", "movie_game_collectibles", "robot_mecha",
      "soft_vinyl", "kaiju_monsters", "diy_custom", "retro_vintage",
      "limited_edition", "gunpla_models", "plastic_models"
    ], 
    required: true 
  }, 

   // ✅ **เพิ่ม `phone` เข้าไปในข้อมูลผู้ขาย**
   seller: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },  // ✅ เพิ่มฟิลด์ `phone`
    profileImage: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  editCount: {
    type: Number,
    default: 0, // จำนวนเริ่มต้นเป็น 0
  },
});

module.exports = mongoose.models.Auction || mongoose.model("Auction", auctionSchema);
