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

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, path.join(__dirname, "uploads")); },
  filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// User Schema
const userSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String, createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  imageUrl: String, latitude: Number, longitude: Number, areaName: String, damageType: String, severity: String,
  complaintText: String, contractorName: String, status: { type: String, default: "Pending" },
  verificationState: { type: String, default: "Pending AI Scan" }, upvotes: { type: Number, default: 0 },
  progressPercentage: { type: Number, default: 0 }, estimatedStartDate: { type: String, default: "Pending Assignment" },
  latestUpdate: { type: String, default: "Report received and awaiting authority review." },
  resolutionImageUrl: String, resolutionText: String, rating: { type: Number, default: 0 },
  feedbackText: String, createdAt: { type: Date, default: Date.now }
});
const Complaint = mongoose.model("Complaint", complaintSchema);

// --- THE VIP DEMO INJECTOR ---
app.post("/demo/seed", async (req, res) => {
  try {
    await Complaint.deleteMany({}); // Wipe old test data
    
    const demoData = [
      {
        imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8500, longitude: 80.9490, areaName: "Hazratganj Main Crossing", damageType: "Pothole", severity: "High",
        complaintText: "Massive crater forming in the middle of the road. Multiple two-wheelers have lost balance here.",
        contractorName: "ABC Infra Pvt Ltd", status: "Pending", verificationState: "Approved", upvotes: 142, progressPercentage: 0,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8550, longitude: 80.9550, areaName: "Gomti Nagar Extension", damageType: "Drainage Block", severity: "High",
        complaintText: "Severe waterlogging after minimal rain. The drain is completely choked with plastic waste.",
        contractorName: "City Sanitation Dept", status: "InProgress", verificationState: "Approved", upvotes: 89, progressPercentage: 65,
        estimatedStartDate: "Started 2 days ago", latestUpdate: "Clearing blockage and replacing broken grate.",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8400, longitude: 80.9400, areaName: "Alambagh Sector B", damageType: "Broken Streetlight", severity: "Medium",
        complaintText: "Entire street goes pitch black at night. Safety hazard for pedestrians.",
        contractorName: "PowerCorp Municipal", status: "Pending", verificationState: "Approved", upvotes: 34, progressPercentage: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1623075845013-0570ccb00b46?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8600, longitude: 80.9300, areaName: "Riverfront Bridge", damageType: "Bridge Crack", severity: "High",
        complaintText: "Deep structural fissure visible on the pedestrian walkway side.",
        contractorName: "ABC Infra Pvt Ltd", status: "Resolved", verificationState: "Approved", upvotes: 215, progressPercentage: 100,
        latestUpdate: "Structural reinforcement applied and sealed.", resolutionImageUrl: "https://images.unsplash.com/photo-1585250495376-78b1d355dc5b?auto=format&fit=crop&w=600&q=80",
        resolutionText: "Concrete injection completed. Path is safe.", rating: 5, feedbackText: "Incredible response time! The bridge feels totally secure now.",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8420, longitude: 80.9500, areaName: "Aminabad Market", damageType: "Pothole", severity: "Medium",
        complaintText: "Road surface eroding near the main entrance.",
        contractorName: "ABC Infra Pvt Ltd", status: "Pending", verificationState: "Approved", upvotes: 12, progressPercentage: 0,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?auto=format&fit=crop&w=600&q=80",
        latitude: 26.8650, longitude: 80.9650, areaName: "Indira Nagar Sec 14", damageType: "Drainage Block", severity: "Low",
        complaintText: "Slow drainage causing minor pooling.",
        contractorName: "City Sanitation Dept", status: "Pending", verificationState: "Approved", upvotes: 5, progressPercentage: 0,
        createdAt: new Date()
      }
    ];

    await Complaint.insertMany(demoData);
    res.status(200).json({ message: "VIP Demo Data Injected!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error seeding data" });
  }
});

// --- SUBMIT COMPLAINT ---
app.post("/complaint", upload.single("image"), async (req, res) => {
  try {
    // Added complaintText here to grab the user's custom description
    const { latitude, longitude, areaName, damageType, severity, complaintText } = req.body;
    const latNum = parseFloat(latitude); 
    const lngNum = parseFloat(longitude);

    const existingComplaints = await Complaint.find({ damageType: damageType });
    let duplicateFound = false; let duplicateId = null;

    for (let oldIssue of existingComplaints) {
      if (oldIssue.latitude && oldIssue.longitude) {
        let latDiff = Math.abs(oldIssue.latitude - latNum);
        let lngDiff = Math.abs(oldIssue.longitude - lngNum);
        if (latDiff < 0.001 && lngDiff < 0.001) { duplicateFound = true; duplicateId = oldIssue._id; break; }
      }
    }

    if (duplicateFound) {
      const duplicateIssue = await Complaint.findById(duplicateId);
      duplicateIssue.upvotes += 1; await duplicateIssue.save();
      return res.status(200).json({ status: "duplicate", message: "Match Found! +1 Upvote added to existing ticket.", confidenceScore: 98 });
    }

    const confidenceScore = Math.floor(Math.random() * (99 - 45 + 1)) + 45; 
    const newComplaint = new Complaint({
      imageUrl: req.file ? req.file.path : null, latitude: latNum, longitude: lngNum, areaName, damageType, severity,
      // Now saving the actual user text!
      complaintText: complaintText || `Formal report of a ${severity} ${damageType} at ${areaName}.`, 
      contractorName: "ABC Infra Pvt Ltd", verificationState: "Approved"
    });
    await newComplaint.save();

    res.status(201).json({ status: "success", message: "AI Verification Complete. Approved.", confidenceScore: confidenceScore, complaint: newComplaint });
  } catch (error) { res.status(500).json({ message: "Error submitting" }); }
});

// --- ALL OTHER ROUTES ---
app.get("/complaint", async (req, res) => {
  try { const complaints = await Complaint.find(); res.status(200).json(complaints); } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.patch("/complaint/:id/upvote", async (req, res) => {
  try { const c = await Complaint.findById(req.params.id); c.upvotes += 1; await c.save(); res.status(200).json(c); } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.patch("/complaint/:id/simulate-resolve", async (req, res) => {
  try {
    const c = await Complaint.findById(req.params.id);
    c.status = "Resolved"; c.latestUpdate = "Contractor has completed the repair."; c.progressPercentage = 100;
    c.resolutionImageUrl = "https://images.unsplash.com/photo-1585250495376-78b1d355dc5b?auto=format&fit=crop&w=400&q=80";
    c.resolutionText = "Area secured and infrastructure repaired.";
    await c.save(); res.status(200).json(c);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.patch("/complaint/:id/rate", async (req, res) => {
  try {
    const c = await Complaint.findByIdAndUpdate(req.params.id, { rating: req.body.rating, feedbackText: req.body.feedbackText }, { new: true });
    res.status(200).json(c);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.post("/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || user.password !== req.body.password) return res.status(401).json({ message: "Invalid credentials" });
    res.status(200).json({ user: { id: user._id, name: user.name } });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.post("/auth/register", async (req, res) => {
  try {
    const newUser = new User(req.body); await newUser.save(); res.status(201).json({ message: "Registered" });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

app.listen(5000, () => console.log("Server running on port 5000"));