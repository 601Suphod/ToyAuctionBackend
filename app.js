require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const chalk = require("chalk");
const cors = require("cors");
const passport = require("passport");
const sessions = require("express-session");
const { RedisStore } = require("connect-redis");

//? Databases 3
const connectMongoDB = require("./modules/database/mongodb");
const redis = require("./modules/database/redis");

connectMongoDB();
(async () => {
  await redis.connect();
})();

redis.on("connect", () => console.log(chalk.green("Redis Connected")));
redis.on("ready", () => console.log(chalk.green("Redis Ready")));
redis.on("error", (err) => console.log("Redis Client Error", err));

module.exports = redis;

//? Modules
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

let redisStore = new RedisStore({
  client: redis,
  prefix: "hdgtest:",
});

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", false);

//? Sessions
app.use(
  sessions({
    secret: "secretkey",
    store: redisStore, // กำหนด RedisStore
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: false, // ใช้ true ถ้ารัน HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // อายุ session 1 วัน
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:3000", // ✅ กำหนด Origin ตรงๆ แทน "*"
    credentials: true, // ✅ สำคัญ! เพื่อให้ Cookies และ Session ทำงาน
    methods: "GET,POST,PUT,PATCH,DELETE",
    optionsSuccessStatus: 200,
  })
);

// sessions แบบไม่ store
// app.use(
//   sessions({
//     secret: "secretkey",
//     saveUninitialized: true,
//     resave: false,
//   })
// );

//? PassportJS
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

// Cross Origin Resource Sharing
const whitelist = [
  "http://localhost:5173",
];
/*const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      //console.log("Postman failed to pass origin");
      return callback(null, true);
    }

    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST,PUT,PATCH,DELETE",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));*/

const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("joinActivity", (chatRoomId) => {
    socket.join(chatRoomId);
    console.log(`${socket.id} joined activity ${chatRoomId}`);
  });

  socket.on("message", ({ activityId, message }) => {});

  socket.on("leaveActivity", (chatRoomId) => {
    socket.leave(chatRoomId);
    console.log(`${socket.id} left activity ${chatRoomId}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });

  socket.on("reaction", (data) => {
    io.to(data.chatRoomId).emit("reaction", data);
  });
});

const cron = require("node-cron");
const { endAuctions } = require("./controllers/auctionController");

// รันทุกๆ 1 นาที
//cron.schedule("*/1 * * * *", async () => {
  //console.log("🔄 Checking for expired auctions...");
  //await endAuctions();
//});
const { handleAuctionNotifications } = require("./controllers/auctionController");
const { checkAndEndAuctions } = require("./controllers/auctionController");

// ✅ ให้ `checkAndEndAuctions()` ทำงานทุกๆ 10 วินาที
setInterval(checkAndEndAuctions, 10000);
setInterval(handleAuctionNotifications, 10000);

// ให้ Express ให้บริการไฟล์รูปจากโฟลเดอร์ 'uploads'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));




app.use(express.json()); // ✅ รองรับ JSON body
app.use(express.urlencoded({ extended: true })); // ✅ รองรับ Form Data

const v1AdminRouter = require("./routes/v1/adminRoutes");
app.use("/api/v1/admin", v1AdminRouter);

const v1PaymentRoutes = require("./routes/v1/paymentRoutes");
app.use("/api/v1/payment", v1PaymentRoutes);

//? Profile Endpoints
const v1ProfileRouter = require("./routes/v1/profileRoutes");
app.use("/api/v1/profile", v1ProfileRouter);

//! V1 Endpoints
const v1AuctionRouter = require("./routes/v1/auctionRoutes");
app.use("/api/v1/auction", v1AuctionRouter);

const v1OrderRouter = require("./routes/v1/orderRoutes");
app.use("/api/v1/order", v1OrderRouter);

const v1ProductRouter = require("./routes/v1/productRoutes");
app.use("/api/v1/products", v1ProductRouter);

const v1IndexRouter = require("./routes/v1/indexRoutes");
app.use("/api/v1", v1IndexRouter);

const v1IndexRouter2 = require("./routes/v1/indexRoutes");
app.use("/", v1IndexRouter2);

//? Auth Endpoints
const v1AuthRouter = require("./routes/v1/authRoutes");
app.use("/api/v1/auth", v1AuthRouter);

//? Chat Endpoints
const v1ChatRouter = require("./routes/v1/chatRoutes")(io);
app.use("/api/v1/chat", v1ChatRouter);

//? Account Endpoints
const v1AccountRouter = require("./routes/v1/accountsRoutes");
app.use("/api/v1/accounts", v1AccountRouter);

//? OSS Endpoints
const v1FileUploadRouter = require("./routes/v1/fileUploadRoutes");
app.use("/api/v1/fileupload", v1FileUploadRouter);

//? Post Endpoint
const v1PostRouter = require("./routes/v1/postRoutes");
app.use("/api/v1/post", v1PostRouter);

//? Post Endpoint
const activityRoutes = require("./routes/v1/activityRoutes");
const v1ActivityRouter = activityRoutes(io);
app.use("/api/v1/activity", v1ActivityRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


module.exports = { app, server, io };
