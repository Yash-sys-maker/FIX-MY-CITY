const multer = require("multer");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// Connect to Database
mongoose.connect("mongodb://localhost:27017/FixMyCut")
  .then(() => console.log("Database connected"))
  .catch(err => console.log(err));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// Complete Complaint Schema
const complaintSchema = new mongoose.Schema({
  imageUrl: String,
  latitude: Number,
  longitude: Number,
  areaName: String,
  damageType: String,
  severity: String,
  complaintText: String,
  contractorName: String,
  status: { type: String, default: "Pending" },
  verificationState: { type: String, default: "Pending AI Scan" },
  upvotes: { type: Number, default: 0 },
  progressPercentage: { type: Number, default: 0 },
  estimatedStartDate: { type: String, default: "Pending Assignment" },
  latestUpdate: { type: String, default: "Report received and awaiting authority review." },
  resolutionImageUrl: String,
  resolutionText: String,
  rating: { type: Number, default: 0 },
  feedbackText: String,
  createdAt: { type: Date, default: Date.now }
});
const Complaint = mongoose.model("Complaint", complaintSchema);

app.get("/", (req, res) => {
  res.send("FixMyCity Backend Running");
});

// --- SUBMIT COMPLAINT (WITH AI & DUPLICATE SIMULATION) ---
app.post("/complaint", upload.single("image"), async (req, res) => {
  try {
    const { latitude, longitude, areaName, damageType, severity } = req.body;
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    // STEP 1: DUPLICATE DETECTION
    const existingComplaints = await Complaint.find({ damageType: damageType });
    let duplicateFound = false;
    let duplicateId = null;

    for (let oldIssue of existingComplaints) {
      if (oldIssue.latitude && oldIssue.longitude) {
        let latDiff = Math.abs(oldIssue.latitude - latNum);
        let lngDiff = Math.abs(oldIssue.longitude - lngNum);
        if (latDiff < 0.001 && lngDiff < 0.001) { // roughly 100m radius
          duplicateFound = true;
          duplicateId = oldIssue._id;
          break;
        }
      }
    }

    if (duplicateFound) {
      const duplicateIssue = await Complaint.findById(duplicateId);
      duplicateIssue.upvotes += 1;
      await duplicateIssue.save();
      return res.status(200).json({
        status: "duplicate",
        message: "We found an identical issue already reported at this location. We have added your +1 Upvote to escalate the existing ticket!",
        confidenceScore: 98
      });
    }

    // STEP 2: AI VISION SIMULATION
    const confidenceScore = Math.floor(Math.random() * (99 - 20 + 1)) + 20;
    let verificationState = "Approved";
    let finalStatus = "success";
    let finalMessage = "AI Verification Complete. Issue approved and routed to authorities.";

    if (confidenceScore < 45) {
      return res.status(200).json({
        status: "rejected",
        message: `Upload Rejected (Score: ${confidenceScore}%). The image does not clearly match a ${damageType}.`,
        confidenceScore: confidenceScore
      });
    } else if (confidenceScore >= 45 && confidenceScore < 75) {
      verificationState = "Manual Review";
      finalStatus = "review";
      finalMessage = `Confidence is medium (${confidenceScore}%). Sent to Admin Queue for manual human verification.`;
    }

    // STEP 3: SAVE TO DATABASE
    const complaintText = `Formal report of a ${severity} ${damageType} at ${areaName}. Coordinates verified.`;
    const newComplaint = new Complaint({
      imageUrl: req.file ? req.file.path : null,
      latitude: latNum,
      longitude: lngNum,
      areaName,
      damageType,
      severity,
      complaintText,
      contractorName: "ABC Infra Pvt Ltd",
      verificationState: verificationState
    });

    await newComplaint.save();

    res.status(201).json({
      status: finalStatus,
      message: finalMessage,
      confidenceScore: confidenceScore,
      complaint: newComplaint
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error submitting complaint" });
  }
});

// --- FETCH ALL COMPLAINTS ---
app.get("/complaint", async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaints" });
  }
});

// --- UPVOTE ISSUE ---
app.patch("/complaint/:id/upvote", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    complaint.upvotes += 1;
    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: "Error upvoting" });
  }
});

// --- DEMO: SIMULATE CONTRACTOR FIX ---
app.patch("/complaint/:id/simulate-resolve", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    complaint.status = "Resolved";
    complaint.latestUpdate = "Contractor has completed the repair.";
    complaint.resolutionImageUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80";
    complaint.resolutionText = "Pothole filled, surface leveled, and area cleared of debris.";
    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: "Error simulating resolution" });
  }
});

// --- USER LEAVES RATING ---
app.patch("/complaint/:id/rate", async (req, res) => {
  try {
    const { rating, feedbackText } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id, 
      { rating, feedbackText }, 
      { new: true }
    );
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: "Error rating" });
  }
});

// --- AUTHENTICATION ---
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password !== password) return res.status(401).json({ message: "Invalid password" });
    res.status(200).json({ message: "Login successful", user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});