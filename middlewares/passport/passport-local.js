const bcrypt = require("bcrypt");
const crypto = require("crypto");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const redis = require("../../app");
const sendEmail = require("../../modules/email/sendVerifyEmail");
const User = require("../../schemas/v1/user.schema");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
      session: false,
    },
    async (req, email, password, cb) => {
      try {
        // ✅ ลบการใช้ businessId

        const existingUser = await User.findOne({
          "user.email": email.toLowerCase(),
        }).select("+user.password");

        if (!existingUser) {
          return cb(null, false, {
            statusCode: 404,
            message: "User not found.",
          });
        }

        if (!existingUser.user.password) {
          return cb(null, false, {
            statusCode: 403,
            message: "Incorrect credentials.",
          });
        }

        const isMatch = await bcrypt.compare(password, existingUser.user.password);
        if (!isMatch) {
          return cb(null, false, {
            statusCode: 403,
            message: "Incorrect credentials.",
          });
        }

        if (existingUser.user.activated === false) {
          let activationToken = crypto.randomBytes(32).toString("hex");
          let refKey = crypto.randomBytes(2).toString("hex").toUpperCase();

          await redis.hSet(email, { token: activationToken, ref: refKey }, { EX: 600 });
          await redis.expire(email, 600);

          const link = `${process.env.BASE_URL}/api/v1/accounts/verify/email?email=${email}&ref=${refKey}&token=${activationToken}`;
          await sendEmail(email, "Verify Email For JaideePOS", link);

          return cb(null, false, {
            statusCode: 406,
            message: "Email not activated. Verification email has been sent.",
          });
        }

        const checkResetPassword = await redis.get(`${email}-resetPassword`);
        if (checkResetPassword) {
          return cb(null, false, {
            statusCode: 200,
            message: "Please change your password.",
          });
        }

        return cb(null, existingUser);
      } catch (error) {
        console.error("❌ Error in passport-local authentication:", error);
        return cb(error);
      }
    }
  )
);
