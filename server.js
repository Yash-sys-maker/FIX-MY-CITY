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

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);

const complaintSchema = new mongoose.Schema({
  imageUrl: String,
  latitude: Number,
  longitude: Number,
  areaName: String,
  damageType: String,
  severity: String,
  complaintText: String,
  contractorName: String,
  status: {
    type: String,
    default: "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

app.get("/", (req, res) => {
  res.send("Fix My Cut Backend Running");
});

app.post("/complaint", upload.single("image"), async (req, res) => {
  try {
   console.log("Incoming complaint:", req.body);
console.log("File:", req.file);
    const { latitude, longitude, areaName, damageType, severity } = req.body;

    // Basic complaint text generator (Hackathon version)
    const complaintText = `
This is to formally report a ${severity} ${damageType} issue located at ${areaName}.
The problem is at coordinates (${latitude}, ${longitude}) and poses potential public risk.
Immediate inspection and necessary repair action is requested.
`;

    // Dummy contractor mapping (Hackathon demo)
    const contractorName = "ABC Infra Pvt Ltd";

    const newComplaint = new Complaint({
      imageUrl: req.file ? req.file.path : null,
      latitude,
      longitude,
      areaName,
      damageType,
      severity,
      complaintText,
      contractorName
    });

    await newComplaint.save();

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint: newComplaint
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error submitting complaint" });
  }
});

app.get("/complaint", async (req, res) => {
  try {
    const complaints = await Complaint.find();
    res.status(200).json(complaints);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching complaints" });
  }
});

app.patch("/complaint/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.status(200).json(updatedComplaint);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating status" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    res.status(201).json({ message: "Registration successful" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});