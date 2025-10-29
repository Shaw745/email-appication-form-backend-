// server.js
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
const app = express();

// === CORS Setup ===
app.use(
  cors({
    origin: "https://pflegeexperten-mannheim.org", // frontend URL
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// === Multer File Upload Config ===
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// === Nodemailer Transport ===
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.yourdomain.com", // e.g. smtp.strato.de, smtp.gmail.com
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// === Application Route ===
app.post("/apply", upload.single("resume"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      availability,
      qualification,
      message,
      consent,
    } = req.body;

    const resumePath = req.file ? path.resolve(req.file.path) : null;

    // === Email Content ===
    const mailOptions = {
      from: `"Job Application" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO, // main HR mailbox
      subject: `New Application from ${firstName} ${lastName}`,
      text: `
New Job Application Received:

Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Role: ${role}
Availability: ${availability}
Qualification: ${qualification}
Consent: ${consent ? "Yes" : "No"}

Message:
${message || "(No message provided)"}
      `,
      attachments: resumePath
        ? [
            {
              filename: req.file.originalname,
              path: resumePath,
            },
          ]
        : [],
    };

    // === Send Email ===
    await transporter.sendMail(mailOptions);

    // === Cleanup Uploaded File ===
    if (resumePath)
      fs.unlink(
        resumePath,
        (err) => err && console.error("File cleanup error:", err)
      );

    // === Send Response ===
    res
      .status(200)
      .json({ success: true, message: "Application submitted successfully!" });
  } catch (error) {
    console.error("Error handling /apply:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send application." });
  }
});

// === Health Check Route ===
app.get("/", (req, res) => {
  res.send("✅ Application server running.");
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
