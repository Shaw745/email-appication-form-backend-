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

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// === Multer for file upload ===
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// === Email Transport ===
const transporter = nodemailer.createTransport({
  host: "smtp.yourdomain.com", // Change this to your mail provider's SMTP
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// === Form Route ===
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

    const mailOptions = {
      from: `"Job Application" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
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
        Message: ${message || "N/A"}
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

    // Send email
    await transporter.sendMail(mailOptions);

    // Delete the uploaded file after sending
    if (resumePath) fs.unlinkSync(resumePath);

    res.status(200).send("Application sent successfully!");
  } catch (err) {
    console.error("Error sending application:", err);
    res.status(500).send("Failed to send application.");
  }
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
