const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const bodyParser = require("body-parser");
const { OAuth2Client } = require("google-auth-library");
const Joi = require('joi');

require("../middlewares/passport/passport-local");
require('../middlewares/passport/passport-jwt');
require("../middlewares/passport/passport-google");
require("../middlewares/passport/passport-line");

require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

const redis = require("../app");

const sendEmail = require("../modules/email/sendVerifyEmail");

const User = require("../schemas/v1/user.schema");
const user = require("../schemas/v1/user.schema");
const { validateHeaders, validateBody, generateToken } = require("../schemas/v1/auth.schema");
const regularUserData = require("../schemas/v1/userData/regularUserData.schema");
const organizationUserData = require("../schemas/v1/userData/organizationUserData.schema");
const contactInfoSchema = require("../schemas/v1/contact.schema");
const addressSchema = require("../schemas/v1/address.schema");
const Profile = require("../schemas/v1/profile.schema"); // ✅ เพิ่มการนำเข้า Profile


const MAX_DEVICES = 50;

const register = async (req, res) => {
  if (!req.body) {
    res
      .status(400)
      .send({ status: "error", message: "Body can not be empty!" });
    return;
  }

  if (!req.body.name) {
    res
      .status(400)
      .send({ status: "error", message: "Name can not be empty!" });
    return;
  }

  if (!req.body.email) {
    res
      .status(400)
      .send({ status: "error", message: "Email can not be empty!" });
    return;
  }

  if (!req.body.password) {
    res
      .status(400)
      .send({ status: "error", message: "Password can not be empty!" });
    return;
  }

  const businessId = req.headers["businessid"];
  if (!businessId) {
    res
      .status(400)
      .send({ status: "error", message: "Business ID can not be empty!" });
    return;
  }

  try {
    let findUser = await user.findOne({
      "user.email": req.body.email,
      businessId: businessId,
    });

    let rawPassword = req.body.password;
    let hashedPassword = await bcrypt.hash(rawPassword, 10);

    let generatedUserId = uuidv4();

    let email = req.body.email;

    let userType = req.body.userType ? req.body.userType : "regular";
    let userData = req.body.userData ? req.body.userData : {};

    if (!findUser) {
      let userDataDocument;
      let userTypeDataValue =
        userType === "regular" ? "RegularUserData" : "OrganizationUserData";

      if (userType === "regular") {
        userDataDocument = new regularUserData(userData);
      } else if (userType === "Organization") {
        userDataDocument = new organizationUserData(userData);
      }
      await userDataDocument.save(); // บันทึก userData

      new user({
        user: {
          name: req.body.name,
          email: req.body.email,
          password: hashedPassword,
        },
        userType: userType,
        userData: userDataDocument._id,
        userTypeData: userTypeDataValue,
        businessId: businessId,
      })
        .save()
        .then(async (user) => {
          let activationToken = crypto.randomBytes(32).toString("hex");
          let refKey = crypto.randomBytes(2).toString("hex").toUpperCase();

          await redis.hSet(
            email,
            {
              token: activationToken,
              ref: refKey,
            },
            { EX: 600 }
          );
          await redis.expire(email, 600);

          const link = `${process.env.BASE_URL}/api/v1/accounts/verify/email?email=${email}&ref=${refKey}&token=${activationToken}`;

          await sendEmail(email, "Verify Email For Healworld.me", link);

          res.status(201).send({
            status: "success",
            message: "Successfully Registered! Please confirm email address.",
            data: {
              ...user.toObject(),
              userId: user._id,
            },
          });
        })
        .catch((err) =>
          res.status(500).send({
            status: "error",
            message:
              err.message || "Some error occurred while registering user.",
          })
        );
    } else {
      res.status(409).send({
        status: "error",
        message: "User already existed. Please Login instead",
      });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ status: "error", message: "Internal server error." });
  }
};

const login = async (req, res, next) => {
  try {
    console.log("📌 Request Headers:", req.headers);

    passport.authenticate("local", { session: false }, async (err, foundUser, info) => {
      if (err) return next(err);
      if (!foundUser) return res.status(401).json({ status: "error", message: info?.message || "Unauthorized" });

      const accessToken = generateToken(
        { userId: foundUser._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        process.env.ACCESS_TOKEN_EXPIRES
      );

      const refreshToken = generateToken(
        { userId: foundUser._id },
        process.env.JWT_REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRES
      );

      await redis.set(`RefreshToken_${foundUser._id}`, refreshToken, "EX", 7 * 24 * 60 * 60); // หมดอายุใน 7 วัน

// ตั้งค่าคุกกี้สำหรับ accessToken ใน backend
      res.cookie('accessToken', accessToken, {
        httpOnly: true, // เพื่อไม่ให้เข้าถึงจาก JavaScript
        secure: process.env.NODE_ENV !== 'development', // ใช้เฉพาะใน HTTPS
        sameSite: 'Strict', // สำหรับการส่ง cookies ใน cross-origin requests
        maxAge: 1000 * 60 * 60, // 1 ชั่วโมง
      });


      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: process.env.NODE_ENV !== "development" ? "None" : "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 วัน
      });

      res.cookie("email", foundUser.user?.email || foundUser.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "Lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 วัน
      });

      console.log("📌 Cookies ที่ถูกตั้งค่า:", res.getHeaders()["set-cookie"]);

      // บันทึกประวัติการเข้าสู่ระบบ
      await Profile.findOneAndUpdate(
        { user: foundUser._id },
        {
          $push: {
            loginHistory: {
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
              timestamp: new Date(),
            }
          }
        },
        { new: true, upsert: true }
      );

      // ส่ง response ก่อนที่จะตั้งค่าคุกกี้
      return res.status(200).json({
        status: "success",
        message: "Login successful",
        user: { id: foundUser._id, email: foundUser.user?.email || foundUser.email },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    })(req, res, next);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  console.log("📌 Logout function triggered");

  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).send({ status: "error", message: "Refresh token is required!" });
    }

    // ✅ ตรวจสอบว่า Refresh Token ถูกต้องหรือไม่
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).send({ status: "error", message: "Invalid refresh token!" });
    }

    const userId = decoded?.userId;
    if (!userId) {
      return res.status(401).send({ status: "error", message: "Unauthorized user!" });
    }

    // ✅ ลบ Refresh Token ออกจาก Redis
    await redis.del(`RefreshToken_${userId}`);

    // ✅ ลบ Secure Cookies
    res.clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "strict" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "strict" });

    return res.status(200).send({ status: "success", message: "Successfully logged out." });
  } catch (err) {
    console.error("🚨 Logout Error:", err);
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ status: "error", message: "Refresh token is required!" });
    }

    // ✅ ตรวจสอบว่า Refresh Token ตรงกับที่อยู่ใน Redis หรือไม่
    const storedToken = await redis.get(`RefreshToken_${req.user.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(403).json({ status: "error", message: "Invalid refresh token!" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ status: "error", message: "Invalid refresh token!" });
    }

    // ✅ ออก Access Token ใหม่
    const newAccessToken = generateToken(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      process.env.ACCESS_TOKEN_EXPIRES
    );

    // ✅ ตั้งค่า Access Token ใหม่ใน Cookies
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: process.env.NODE_ENV !== "development" ? "None" : "Lax",
      maxAge: 1000 * 60 * 60, // 1 ชั่วโมง
    });

    return res.status(200).json({
      status: "success",
      message: "New access token has been generated",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("🚨 Refresh Token Error:", error);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};


const googleCallback = async (req, res, next) => {
  res
    .status(200)
    .send({ status: "success", message: req.authInfo, user: req.user });
};

/*User.findOne({ 'socials.google.userId': profile.id }).then(existingUser => {

    if (existingUser) {
        return cb(null, existingUser, { status: 'success', message: 'Existing user authenticated via Google.'});
    } else {
        
        new User({
            userId: uuidv4(),
            user: {
                name: profile.displayName,
                email: profile._json.email,
                verified: {
                    email: profile._json.email_verified
                },
                activated: true
            },
            socials: {
                google: {
                    userId: profile.id,
                    name: profile.displayName,
                    email: profile._json.email,
                    imageUrl: profile._json.picture
                }
            } 
        }).save().then(async newUser => {

            return cb(null, newUser, { message: 'New user authenticated via Google.'});
        })
    }
    
})  */

const googleFlutterLogin = async (req, res) => {
  //return res.status(200).send({ status: 'success', message: 'Line Authenticated', user: req.user })
  let macAddressRegex = new RegExp(
    /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}.[0-9a-fA-F]{4}.[0-9a-fA-F]{4})$/
  );

  if (!req.headers["mac-address"])
    return res
      .status(401)
      .send({ status: "error", message: "MAC address is required!" });

  if (!req.headers["hardware-id"])
    return res
      .status(401)
      .send({ status: "error", message: "Hardware ID is required!" });

  if (macAddressRegex.test(req.headers["mac-address"]) === false)
    return res
      .status(401)
      .send({ status: "error", message: "MAC address is invalid!" });

  const hardwareId = req.headers["hardware-id"];

  const { token } = req.body;
  console.log("token = " + token);
  console.log("CLIENT_ID = " + CLIENT_ID);
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    console.log("....... about to payload");
    const payload = ticket.getPayload();

    console.log("payload = " + JSON.stringify(payload, null, 2));

    let newUserId = uuidv4();
    let foundUser;
    let email = payload["email"];

    user.findOne({ "user.email": email }).then((existingUser) => {
      if (existingUser) {
        console.log(existingUser);
        if (existingUser.user.activated === false) {
          let activationToken = crypto.randomBytes(32).toString("hex");
          let refKey = crypto.randomBytes(2).toString("hex").toUpperCase();
          redis.hSet(
            email,
            {
              token: activationToken,
              ref: refKey,
            },
            { EX: 600 }
          );
          redis.expire(email, 600);

          const link = `${process.env.BASE_URL}/api/v1/accounts/verify/email?email=${email}&ref=${refKey}&token=${activationToken}`;

          sendEmail(email, "Verify Email For Healworld.me", link);

          //return res.status(406).send(null, false, { statusCode: 406, message: 'Email has not been activated. Email activation has been sent to your email. Please activate your email first.' })

          return res.status(406).send({
            message:
              "Email has not been activated. Email activation has been sent to your email. Please activate your email first.",
          });
        } else {
          const foundUser = existingUser;
          const foundUserEmail = foundUser.user.email;
          const foundUserId = foundUser.userId;

          //? JWT
          const accessToken = jwt.sign(
            {
              userId: foundUserId,
              name: foundUser.user.name,
              email: foundUserEmail,
            },
            process.env.JWT_ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
          );
          const refreshToken = jwt.sign(
            {
              userId: foundUserId,
              name: foundUser.user.name,
              email: foundUserEmail,
            },
            process.env.JWT_REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
          );
          redis.sAdd(`Mac_Address_${foundUserId}`, req.headers["mac-address"]);
          redis.sAdd(`Hardware_ID_${foundUserId}`, req.headers["hardware-id"]);

          //? Add Last Login Date to Redis
          redis.set(`Last_Login_${foundUserId}_${hardwareId}`, Date.now());

          //? Add Refresh Token OTP to Redis

          let length = 6,
            charset = "0123456789",
            refreshTokenOTP = "";
          for (let i = 0, n = charset.length; i < length; ++i) {
            refreshTokenOTP += charset.charAt(Math.floor(Math.random() * n));
          }

          redis.set(
            `Last_Refresh_Token_OTP_${foundUserId}_${hardwareId}`,
            refreshTokenOTP
          );
          redis.set(
            `Last_Refresh_Token_${foundUserId}_${hardwareId}`,
            refreshToken
          );
          redis.set(
            `Last_Access_Token_${foundUserId}_${hardwareId}`,
            accessToken
          );

          res.status(200).send({
            status: "success",
            message: "Successfully Login",
            data: {
              userId: foundUser._id,
              user: {
                name: foundUser.user.name,
                email: foundUserEmail,
                phone: foundUser.user.phone,
                activated: foundUser.user.activated,
                verified: {
                  email: foundUser.user.verified.email,
                  phone: foundUser.user.verified.phone,
                },
              },
              imageURL: foundUser.user.imageURL,
              tokens: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                refreshTokenOTP: refreshTokenOTP,
              },
            },
          });
        }
      } else {
        
        let userType = req.body.userType ? req.body.userType : "regular";
        let userData = req.body.userData ? req.body.userData : {};

        let userDataDocument;
        let userTypeDataValue =
          userType === "regular" ? "RegularUserData" : "OrganizationUserData";

        if (userType === "regular") {
          userDataDocument = new regularUserData(userData);
        } else if (userType === "Organization") {
          userDataDocument = new organizationUserData(userData);
        }
        userDataDocument.save(); // บันทึก userData

        
        new user({
          user: {
            name: payload["name"],
            email: payload["email"],
            password: uuidv4(),
          },
          userType: "regular",
          userData: userDataDocument._id,
          userTypeData: userTypeDataValue,
          businessId: "1",
        })
          .save()
          .then(async (user) => {
            let activationToken = crypto.randomBytes(32).toString("hex");
            let refKey = crypto.randomBytes(2).toString("hex").toUpperCase();

            await redis.hSet(
              email,
              {
                token: activationToken,
                ref: refKey,
              },
              { EX: 600 }
            );
            await redis.expire(email, 600);

            const link = `${process.env.BASE_URL}/api/v1/accounts/verify/email?email=${email}&ref=${refKey}&token=${activationToken}`;

            await sendEmail(email, "Verify Email For Healworld.me", link);

            res.status(201).send({
              status: "success",
              message: "Successfully Registered! Please confirm email address.",
              data: {
                ...user.toObject(),
                userId: user._id,
              },
            });
          })
          .catch((err) =>
            res.status(500).send({
              status: "error",
              message:
                err.message || "Some error occurred while registering user.",
            })
          );
      }
    });
  } catch (error) {
    console.log(error);
    res.status(401).send("Invalid token");
  }
};

const lineCallback = async (req, res) => {
  //console.log('Request Profile',req.user)
  res
    .status(200)
    .send({ status: "success", message: "Line Authenticated", user: req.user });
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  googleCallback,
  lineCallback,
  googleFlutterLogin,
};
