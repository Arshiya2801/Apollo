# Phase 6: Authentication, Security & Database Architecture

> **What this phase covers:** The end-to-end authentication lifecycle in Apollo, the cryptographic design behind the **Passwordless OTP verification flow**, JWT token issuance and client storage, dual email delivery architecture (Brevo HTTP API vs Nodemailer SMTP fallback), database indexing, and a complete security audit answering common production vulnerability challenges.

---

## 1. Authentication Strategy: Why Passwordless OTP over Standard Auth?

In developer tooling and technical interview platforms, friction kills conversion. Standard password-only authentication requires password confirmation, complex validation rules, and forgotten-password reset workflows.

### Apollo 2-Step OTP Architecture:
1. **Signup Phase:** User submits username, email, and password. Apollo hashes the password with bcrypt, generates a cryptographically secure 6-digit OTP, saves the user as isVerified: false, and emails the OTP.
2. **Verification Phase:** The user enters the OTP. Apollo verifies code match and timestamp validity (otpExpiry < Date.now()). On success, the user is marked isVerified: true, the OTP fields are purged from MongoDB, and a 7-day signed JWT is issued.

`
User Submits (Email, Password)
             |
             v
   Generate 6-Digit OTP
   crypto.randomInt(100000, 999999)
             |
             v
   Bcrypt Hash Password
   bcrypt.hash(password, 10)
             |
             v
   Save to MongoDB
   { isVerified: false, otp: 582194, otpExpiry: now + 10m }
             |
             v
   Dispatch Email via Brevo API
   (Fallback to Nodemailer SMTP on error)
             |
             v
   User Enters OTP
             |
      +------+------+
      |             |
   [Invalid]     [Valid & Unexpired]
   Return 400       |
                    v
             Mark isVerified: true
             Clear otp & otpExpiry
             Issue JWT (expiresIn: 7d)
`

---

## 2. Cryptographic Implementation Details

### A. Cryptographically Secure OTP Generation
- Uses crypto.randomInt(100000, 999999).toString() instead of Math.random().
- Math.random() is a PRNG with predictable state; crypto.randomInt uses the OS entropy pool (CSPRNG).

### B. Password Hashing with Bcrypt
- Salt rounds = 10 (1024 hashing rounds).
- Automatically salts each password to prevent rainbow table attacks.

### C. JWT Issuance
- Signs user ID and email using jsonwebtoken with a 7-day expiration (expiresIn: 7d).

---

## 3. Resilient Dual-Layer Email Dispatch (Brevo HTTP API + Nodemailer SMTP)

On cloud hosts (like Render free tier), outbound SMTP connections on port 25 or 587 are frequently blocked or throttled by cloud firewalls.

### Apollo Dual Delivery Pattern in authController.js:
1. **Primary Route:** Direct HTTPS POST to Brevo API over Port 443 (never blocked by cloud firewalls).
2. **Secondary Fallback:** Nodemailer SMTP with family: 4 (forced IPv4 routing) in case Brevo API credentials are unavailable or return an error.

---

## 4. The Unverified User Edge Case

### The Problem:
A user signs up, receives an OTP, but accidentally closes the browser tab before entering it. If they later try to sign in via the login endpoint, a naive backend might return Invalid credentials or permanently lock them out.

### Apollo Solution:
When login() detects !user.isVerified:
1. Generates a fresh OTP and new 10-minute expiry window.
2. Dispatches a new OTP email.
3. Returns HTTP 403 Forbidden with an explicit flag: { error: Account not verified, unverified: true }.
4. The frontend catches unverified: true and automatically switches to the OTP verification screen.

---

## 5. MongoDB Data Modeling and Indexing (User.js)

### Key Schema Design Decisions:
1. **Unique Email Index:** email: { type: String, unique: true } creates a MongoDB B-Tree index, enabling O(log N) lookups.
2. **Ephemeral OTP Fields:** otp and otpExpiry are unset upon verification to prevent stale replay.
3. **Automated Audit Timestamps:** timestamps: true auto-manages createdAt and updatedAt.

---

## 6. Client-Side Authentication State Management (AuthContext.jsx)

1. **Session Hydration:** On app boot, useEffect reads the token from localStorage and restores user state.
2. **Route Protection:** ProtectedRoute checks useAuth().user. If null, redirects to /auth.
3. **Already-Authenticated Guard:** Visiting /auth when already logged in automatically redirects to /workspace.

---

## 7. Security Audit and Production Hardening

| Security Vector | Current Implementation | Production Hardening Recommendation |
|:---|:---|:---|
| Token Storage | localStorage (vulnerable to XSS) | Store JWT in an HttpOnly, SameSite=Strict, Secure cookie |
| Route Protection | Frontend ProtectedRoute guard | Add a verifyToken Express middleware on all backend routes |
| CORS Policy | Permissive cors() | Restrict origin strictly: cors({ origin: process.env.CLIENT_URL, credentials: true }) |
| Rate Limiting | Open endpoints | Add express-rate-limit (max 5 OTP requests per 15 min; max 20 AI requests/min) |
| Brute Force Protection | Unlimited OTP attempts within 10 min | Track failed attempts; lock account after 5 consecutive incorrect attempts |