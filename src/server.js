import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import validateEnv from "./config/validateEnv.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import registerRoutes from "./routes/registrationRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import affiliateRoutes from "./routes/affiliateRoutes.js";

dotenv.config();
validateEnv();

const allowedOrigins = ["http://localhost:5173","https://sms-lg.netlify.app", process.env.CLIENT_URL];

const app = express();

// app.use(cors({ origin: true, credentials: true }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors());

app.use(cookieParser());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/affiliate", affiliateRoutes);

app.get("/api", (req, res) => {
  res.json({ message: "MERN backend is running" });
});

app.get("/test", (req, res) => {
  res.send("Api is running.......");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
