// controllers/adminController.js
const User = require("../schemas/v1/user.schema");
const Auction = require("../schemas/v1/auction.schema");
const Payment = require("../schemas/v1/payment.shema");
const Profile = require("../schemas/v1/profile.schema");

exports.getMembers = async (req, res) => {
  try {
    const members = await User.find({ role: "user" })
      .select("user.name user.email user.activated createdAt")
      .sort({ createdAt: 1 });

    const formatted = members.map((member) => ({
      id: member._id.toString(),
      name: member.user.name,
      email: member.user.email,
      status: member.user.activated ? "Active" : "Inactive",
      registeredAt: member.createdAt.toISOString().split("T")[0],
    }));

    res.status(200).json({ users: formatted });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.findByIdAndDelete(id); 
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.getAllAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find().sort({ createdAt: -1 });
    res.status(200).json({ auctions });
  } catch (err) {
    res.status(500).json({ error: "ไม่สามารถดึงรายการประมูลได้", details: err.message });
  }
};

exports.deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAuction = await Auction.findByIdAndDelete(id);
    if (!deletedAuction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    res.status(200).json({ message: "Auction deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate({
        path: 'userId',
        model: 'User',
        select: 'user.email',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'name email phone'
        }
      })
      .populate({
        path: 'auctionId',
        model: 'Auction',
        select: 'name title description'
      })
      .sort({ createdAt: -1 });

    const sanitized = payments.map(p => ({
      ...p._doc,
      userId: p.userId || null,
      auctionId: p.auctionId || null
    }));

    res.status(200).json({ payments: sanitized });
  } catch (err) {
    console.error("Error in getAllPayments:", err);
    res.status(500).json({
      error: "ไม่สามารถดึงรายการการชำระเงินได้",
      details: err.message,
    });
  }
};
