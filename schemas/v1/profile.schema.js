const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true },            
  fullAddress: { type: String, required: true },       
  name: { type: String, required: true },             
  phone: { type: String, required: true },              
  isDefault: { type: Boolean, default: true },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  }
});

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },
    birthday: { type: Date },
    addresses: [addressSchema],
    profileImage: {
      data: Buffer,
      contentType: String
    },
    winningBids: [
      {
        auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction" },
        finalPrice: { type: Number },
        wonAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
