// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/campusconnect";
const JWT_SECRET = process.env.JWT_SECRET || "please_set_a_real_secret_in_prod";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// ---------------- MODELS ----------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "club_admin"], default: "student" },
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }],
});
const User = mongoose.model("User", userSchema);

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
});
const Club = mongoose.model("Club", clubSchema);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
    date: Date,
    location: String,
    maxAttendees: { type: Number, default: 0 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
const Event = mongoose.model("Event", eventSchema);

const recruitmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    positions: { type: Number, default: 1 },
    open: { type: Boolean, default: true },
    applicants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        name: String,
        email: String,
        statement: String,
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
const Recruitment = mongoose.model("Recruitment", recruitmentSchema);

// ---------------- AUTH MIDDLEWARE ----------------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No Authorization header" });

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ message: "Bad auth header" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ---------------- AUTH ROUTES ----------------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, clubName, clubDescription, joinClubId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const clubsToAttach = [];

    if (role === "club_admin") {
      if (!clubName) return res.status(400).json({ message: "clubName required for club_admin" });
      let club = await Club.findOne({ name: clubName });
      if (!club) club = await Club.create({ name: clubName, description: clubDescription || "" });
      clubsToAttach.push(club._id);
    }

    if (joinClubId) {
      const clubExists = await Club.findById(joinClubId);
      if (clubExists) clubsToAttach.push(clubExists._id);
    }

    const user = await User.create({
      name,
      email,
      password: hash,
      role: role || "student",
      clubs: clubsToAttach,
    });

    const userSafe = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clubs: user.clubs,
    };
    res.json({ message: "User created", user: userSafe });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password, clubId } = req.body;
    const user = await User.findOne({ email }).populate("clubs", "name");
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    if (clubId) {
      const isMember = user.clubs.some((c) => String(c._id) === String(clubId));
      if (!isMember) return res.status(403).json({ message: "Not a member of this club" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    const userSafe = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clubs: user.clubs,
    };
    res.json({ message: "Login successful", token, user: userSafe });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- CLUB ROUTES ----------------
app.get("/api/clubs", async (req, res) => {
  try {
    const clubs = await Club.find();
    res.json(clubs);
  } catch (err) {
    console.error("GET /api/clubs error:", err);
    res.status(500).json({ message: "Server error fetching clubs" });
  }
});

// POST /api/clubs -> create club and attach an admin by email (no password input)
app.post("/api/clubs", async (req, res) => {
  try {
    const { name, description, adminEmail } = req.body;
    if (!name) return res.status(400).json({ message: "Club name required" });
    const existing = await Club.findOne({ name });
    if (existing) return res.status(400).json({ message: "Club already exists" });

    const club = await Club.create({ name, description: description || "" });

    let adminInfo = null;
    if (adminEmail) {
      // try to find user by email
      let user = await User.findOne({ email: adminEmail });
      if (user) {
        // attach club and make admin
        if (!user.clubs.some((c) => String(c) === String(club._id))) user.clubs.push(club._id);
        user.role = "club_admin";
        await user.save();
        adminInfo = { type: "attached_existing_user", userId: user._id, email: user.email };
      } else {
        // create a user with a random password (hashed) and mark as club_admin
        const randomPassword = crypto.randomBytes(10).toString("hex");
        const hash = await bcrypt.hash(randomPassword, 10);
        user = await User.create({
          name: null,
          email: adminEmail,
          password: hash,
          role: "club_admin",
          clubs: [club._id],
        });
        // NOTE: we do NOT send the random password in the response for security.
        // In production you should trigger an email to the user with a password-reset or set-password link.
        adminInfo = { type: "created_new_user", userId: user._id, email: user.email };
      }
    }

    res.json({ message: "Club created", club, adminInfo });
  } catch (err) {
    console.error("POST /api/clubs error:", err);
    res.status(500).json({ message: "Server error creating club" });
  }
});

app.post("/api/clubs/:id/join", auth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.clubs.some((c) => String(c) === String(club._id))) {
      return res.status(400).json({ message: "Already a member of this club" });
    }

    user.clubs.push(club._id);
    await user.save();
    res.json({ message: "Joined club", club });
  } catch (err) {
    console.error("Join club error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- EVENT ROUTES ----------------
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }).populate("club", "name description");
    res.json(events);
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ message: "Server error fetching events" });
  }
});

app.post("/api/events", auth, async (req, res) => {
  try {
    const { title, description, date, location, maxAttendees, club: clubFromBody } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const user = await User.findById(req.userId);
    let clubToUse = clubFromBody || null;
    if (user.role === "club_admin") {
      if (!user.clubs || user.clubs.length === 0) {
        return res.status(400).json({ message: "Club admin has no club assigned." });
      }
      clubToUse = clubFromBody || user.clubs[0];
    }

    const ev = await Event.create({
      title,
      description,
      date: date ? new Date(date) : undefined,
      location,
      maxAttendees: maxAttendees || 0,
      createdBy: req.userId,
      club: clubToUse || undefined,
      attendees: [],
    });

    res.json({ message: "Event created", event: ev });
  } catch (err) {
    console.error("POST /api/events error:", err);
    res.status(500).json({ message: "Server error creating event" });
  }
});

app.post("/api/events/:id/register", auth, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const userId = req.userId;

    if (ev.attendees.some((a) => String(a) === String(userId))) {
      return res.status(400).json({ message: "Already registered" });
    }

    if (ev.maxAttendees && ev.attendees.length >= ev.maxAttendees) {
      return res.status(400).json({ message: "Event is full" });
    }

    ev.attendees.push(userId);
    await ev.save();

    res.json({ message: "Registration successful", eventId: ev._id });
  } catch (err) {
    console.error("POST /api/events/:id/register error:", err);
    res.status(500).json({ message: "Server error registering" });
  }
});

app.get("/api/myclubs/events", auth, async (req, res) => {
  try {
    const u = await User.findById(req.userId).populate("clubs");
    if (!u) return res.status(404).json({ message: "User not found" });
    if (!u.clubs || u.clubs.length === 0) return res.json([]);

    const clubIds = u.clubs.map((c) => c._id);
    const events = await Event.find({ club: { $in: clubIds } }).sort({ date: 1 }).populate("club", "name");
    res.json(events);
  } catch (err) {
    console.error("GET /api/myclubs/events error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- RECRUITMENT ROUTES ----------------
app.post("/api/recruitments", auth, async (req, res) => {
  try {
    const { title, description, positions, club: clubFromBody, open } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let clubToUse = clubFromBody || (user.clubs && user.clubs.length ? user.clubs[0] : null);
    if (!clubToUse) return res.status(400).json({ message: "Club required" });

    const isMember = user.clubs.some((c) => String(c) === String(clubToUse));
    if (!isMember) return res.status(403).json({ message: "You are not a member of this club" });

    if (user.role !== "club_admin") return res.status(403).json({ message: "Only club admins can create recruitments" });

    const rec = await Recruitment.create({
      title,
      description,
      positions: positions || 1,
      club: clubToUse,
      open: open === undefined ? true : !!open,
      createdBy: req.userId,
    });

    res.json({ message: "Recruitment created", recruitment: rec });
  } catch (err) {
    console.error("POST /api/recruitments error:", err);
    res.status(500).json({ message: "Server error creating recruitment" });
  }
});

app.get("/api/recruitments", async (req, res) => {
  try {
    const onlyOpen = req.query.open === "true";
    const q = onlyOpen ? { open: true } : {};
    const recs = await Recruitment.find(q).sort({ createdAt: -1 }).populate("club", "name description");
    res.json(recs);
  } catch (err) {
    console.error("GET /api/recruitments error:", err);
    res.status(500).json({ message: "Server error fetching recruitments" });
  }
});

app.get("/api/clubs/recruiting", async (req, res) => {
  try {
    const recs = await Recruitment.find({ open: true }).distinct("club");
    const clubs = await Club.find({ _id: { $in: recs } });
    res.json(clubs);
  } catch (err) {
    console.error("GET /api/clubs/recruiting error:", err);
    res.status(500).json({ message: "Server error fetching recruiting clubs" });
  }
});

app.post("/api/recruitments/:id/apply", async (req, res) => {
  try {
    const rec = await Recruitment.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: "Recruitment not found" });
    if (!rec.open) return res.status(400).json({ message: "Recruitment is closed" });

    const { name, email, statement } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email required" });

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const [type, token] = authHeader.split(" ");
        if (type === "Bearer" && token) {
          const payload = jwt.verify(token, JWT_SECRET);
          userId = payload.id;
        }
      } catch (err) { }
    }

    rec.applicants.push({ userId: userId || null, name, email, statement, status: "pending" });
    await rec.save();

    res.json({ message: "Application submitted" });
  } catch (err) {
    console.error("POST /api/recruitments/:id/apply error:", err);
    res.status(500).json({ message: "Server error applying" });
  }
});

app.get("/api/recruitments/:id/applicants", auth, async (req, res) => {
  try {
    const rec = await Recruitment.findById(req.params.id).populate("club", "name");
    if (!rec) return res.status(404).json({ message: "Recruitment not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMember = user.clubs.some((c) => String(c) === String(rec.club._id));
    if (!isMember) return res.status(403).json({ message: "Not authorized to view applicants" });

    res.json(rec.applicants);
  } catch (err) {
    console.error("GET applicants error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/recruitments/:id/applicants/:applicantIndex/review", auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Bad status" });

    const rec = await Recruitment.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: "Recruitment not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMember = user.clubs.some((c) => String(c) === String(rec.club));
    if (!isMember) return res.status(403).json({ message: "Not authorized to review applicants" });

    if (user.role !== "club_admin") return res.status(403).json({ message: "Only club admins can review applicants" });

    const idx = parseInt(req.params.applicantIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= rec.applicants.length) {
      return res.status(400).json({ message: "Invalid applicant index" });
    }

    rec.applicants[idx].status = status;
    await rec.save();

    if (status === "accepted" && rec.applicants[idx].userId) {
      const applicantUser = await User.findById(rec.applicants[idx].userId);
      if (applicantUser && !applicantUser.clubs.some((c) => String(c) === String(rec.club))) {
        applicantUser.clubs.push(rec.club);
        await applicantUser.save();
      }
    }

    res.json({ message: "Applicant reviewed", applicant: rec.applicants[idx] });
  } catch (err) {
    console.error("Review applicant error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- ROOT ----------------
app.get("/", (req, res) => res.send("CampusConnect backend running 🚀"));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
