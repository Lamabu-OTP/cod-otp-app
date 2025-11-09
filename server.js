import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// ডেমো database (production এ Redis বা Mongo ব্যবহার করা ভালো)
const otpStore = new Map();

// ✅ OTP পাঠানো
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).send("Phone number required");

  // Random 6-digit OTP তৈরি
  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore.set(phone, otp);

  try {
    // SMS Provider API কল
    await axios.post("https://YOUR_SMS_PROVIDER_API_URL", {
      to: phone,
      message: `Your verification code is ${otp}`,
      api_key: "YOUR_SMS_API_KEY",
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "SMS sending failed" });
  }
});

// ✅ OTP verify করা
app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const storedOtp = otpStore.get(phone);

  if (storedOtp && parseInt(otp) === storedOtp) {
    otpStore.delete(phone);
    res.json({ success: true, message: "OTP verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid OTP" });
  }
});

// ✅ Shopify থেকে order create হলে trigger
app.post("/webhook/orders-create", async (req, res) => {
  const order = req.body;
  const phone = order?.shipping_address?.phone;

  if (phone) {
    // Shopify order তৈরি হলে customer কে OTP পাঠাও
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(phone, otp);

    await axios.post("https://YOUR_SMS_PROVIDER_API_URL", {
      to: phone,
      message: `Confirm your COD order with OTP: ${otp}`,
      api_key: "YOUR_SMS_API_KEY",
    });
  }

  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
