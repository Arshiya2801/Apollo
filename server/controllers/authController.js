import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const mailPort = parseInt(process.env.MAIL_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: mailPort,
  secure: mailPort === 465, // true for 465, false for other ports
  family: 4, // Force IPv4 routing (Render free tier does not support IPv6)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Sends email via Brevo HTTP API (Port 443) with a fallback to Nodemailer SMTP
const sendEmail = async (toEmail, subject, textContent) => {
  const isBrevoAPI = process.env.EMAIL_PASS && (process.env.EMAIL_PASS.startsWith('xsmtpsib-') || process.env.EMAIL_PASS.startsWith('xkeysib-'));
  
  if (isBrevoAPI) {
    try {
      const senderEmail = process.env.SENDER_EMAIL || (process.env.EMAIL_USER.includes('@smtp-brevo.com') 
        ? '23308@iiitu.ac.in' // Fallback to registered sender email
        : process.env.EMAIL_USER);

      console.log(`Sending email via Brevo HTTP API to ${toEmail} from ${senderEmail}...`);
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.EMAIL_PASS,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: "Apollo", email: senderEmail },
          to: [{ email: toEmail }],
          subject: subject,
          textContent: textContent
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log('✅ Brevo HTTP Email sent successfully:', data);
        return true;
      } else {
        console.error('❌ Brevo HTTP API Error response:', data);
      }
    } catch (apiError) {
      console.error('❌ Failed to send via Brevo HTTP API:', apiError.message);
    }
  }

  // Fallback to Nodemailer SMTP
  console.log(`Falling back to Nodemailer SMTP for ${toEmail}...`);
  return new Promise((resolve) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: subject,
      text: textContent
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ SMTP Error sending email:', error);
        resolve(false);
      } else {
        console.log('✅ SMTP Email sent:', info.response);
        resolve(true);
      }
    });
  });
};

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user = new User({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      isVerified: false
    });
    
    await user.save();

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      sendEmail(email, 'Apollo - Verification OTP', `Your verification OTP is: ${otp}. It expires in 10 minutes.`);
      console.log(`[DEBUG] OTP for ${email} is: ${otp}`);
    } else {
      console.log(`⚠️ Email credentials missing. OTP for ${email} is ${otp}`);
    }

    res.status(201).json({ message: 'Signup successful. Please verify OTP.', email: user.email });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified' });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', {
      expiresIn: '7d'
    });

    res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      // Need to resend OTP
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        sendEmail(email, 'Apollo - New Verification OTP', `Your new verification OTP is: ${otp}. It expires in 10 minutes.`);
        console.log(`[DEBUG] New OTP for ${email} is: ${otp}`);
      } else {
        console.log(`⚠️ Email credentials missing. New OTP for ${email} is ${otp}`);
      }

      return res.status(403).json({ 
        message: 'Account not verified. A new OTP has been sent to your email.',
        unverified: true 
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', {
      expiresIn: '7d'
    });

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
