import express from "express";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import doaRoutes from "./routes/doaRoutes.js";
import programActivitiesRoutes from "./routes/programActivitiesRoutes.js"
import locationRoutes from "./routes/locationRoutes.js";
import workRoutes from "./routes/workRoutes.js";
import tenderRoutes from "./routes/tenderRoutes.js";
import workcomponentRoutes from "./routes/workcomponentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contractHistoryRoutes from "./routes/contractHistoryRoutes.js"
import contractRoutes from "./routes/contractRoutes.js";
import pimRoutes from "./routes/pimRoutes.js"; 
import wuaRoutes from "./routes/wuaRoutes.js";
import slcRoutes from "./routes/slcRoutes.js";
import farmersRoutes from "./routes/farmersRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dmsRoutes from "./routes/dms.js";
import lengthRoutes from "./routes/lengthRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import rddRoutes from "./routes/rddRoutes.js";
import reportRoutes from "./routes/reportRoutes.js"
dotenv.config();

const app = express();

// ======= CORS Middleware: Accept ALL origins and credentials =======
app.use((req, res, next) => {
  // Allow all origins dynamically
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ======= Body parsers =======
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ===============================
// Static File Serving
// ===============================
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// ======= Routes =======
app.use("/api/master", workcomponentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doa", doaRoutes);
app.use("/api/programActivities",programActivitiesRoutes)
app.use("/api/location", locationRoutes);
app.use("/api/works", workRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/contractHistory", contractHistoryRoutes);
app.use("/api/pim", pimRoutes); 
app.use("/api/wua", wuaRoutes);
app.use("/api/slc", slcRoutes);
app.use("/api/farmers", farmersRoutes);
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/dms", dmsRoutes);
app.use("/api/length", lengthRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/reports",reportRoutes);
// ✅ Add RDD routes - This is what's missing!




app.use("/api/rdd", rddRoutes);

// ======= Start server =======
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
