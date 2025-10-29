// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import sgMail from "@sendgrid/mail";

dotenv.config();
const app = express();

// === CORS Setup ===
app.use(
  cors({
    origin: "https://pflegeexperten-mannheim.org", // your frontend domain
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// === Multer File Upload Config ===
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// === Configure SendGrid ===
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

    // === Build email ===
    const msg = {
      from: `"Job Application" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO, // HR inbox
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
              content: fs.readFileSync(resumePath).toString("base64"),
              filename: req.file.originalname,
              type: req.file.mimetype,
              disposition: "attachment",
            },
          ]
        : [],
    };

    // === Send Email ===
    await sgMail.send(msg);

    // === Cleanup Uploaded File ===
    if (resumePath) {
      fs.unlink(resumePath, (err) => {
        if (err) console.error("File cleanup error:", err);
      });
    }

    // === Respond to frontend ===
    res.status(200).json({
      success: true,
      message: "Application submitted successfully!",
    });
  } catch (error) {
    console.error("Error handling /apply:", error);
    if (error.response) {
      console.error("SendGrid response error:", error.response.body);
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to send application." });
  }
});

// === Health Check ===
app.get("/", (req, res) => {
  res.send("✅ Application server running.");
});

// === Start Server (for local testing) ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running locally on port ${PORT}`)
);
