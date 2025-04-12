const jwt = require('jsonwebtoken');

// ✅ ตรวจสอบ token และแนบ user เข้า req
const checkLogin = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ status: "error", message: "Unauthorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ status: "error", message: "Unauthorized, invalid token" });
  }
};

// ✅ ตรวจสอบสิทธิ์แอดมิน
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ status: "error", message: "ต้องเป็นแอดมินเท่านั้น" });
  }
  next();
};

module.exports = { checkLogin, isAdmin };
