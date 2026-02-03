import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
import { findUserByEmail } from "../../model/userModel.js";
import { createAccessToken, createRefreshToken } from "./tokenController.js";
import { saveRefreshToken } from "../../model/tokenModel.js";

// Decryption function - FIXED VERSION
const decryptData = (encryptedData) => {
  try {
    // Check if it's a string
    if (typeof encryptedData !== 'string') {
      console.log('Not a string, returning as-is');
      return encryptedData;
    }
    
    // Check if it's encrypted (CryptoJS format starts with U2FsdGVkX1)
    if (!encryptedData.startsWith('U2FsdGVkX1')) {
      console.log('Not encrypted format, returning as-is');
      return encryptedData;
    }
    
    // Get encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY is not set in environment variables');
      console.log('Please set ENCRYPTION_KEY in .env file');
      return encryptedData;
    }
    
    // Trim key to 32 bytes (256 bits) - same as frontend
    const key = encryptionKey.substring(0, 64); // 64 hex chars = 32 bytes
    
    console.log('🔐 Decrypting with key:', key.substring(0, 10) + '...');
    console.log('Encrypted data:', encryptedData.substring(0, 50) + '...');
    
    // Method 1: Try direct decryption
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decrypted && decrypted.trim().length > 0) {
        console.log('✅ Decryption successful (Method 1)');
        console.log('Decrypted value:', decrypted);
        return decrypted;
      }
    } catch (e1) {
      console.log('Method 1 failed:', e1.message);
    }
    
    // Method 2: Try with UTF8 parsed key
    try {
      const keyBytes = CryptoJS.enc.Hex.parse(key);
      const bytes = CryptoJS.AES.decrypt(encryptedData, keyBytes);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decrypted && decrypted.trim().length > 0) {
        console.log('✅ Decryption successful (Method 2)');
        console.log('Decrypted value:', decrypted);
        return decrypted;
      }
    } catch (e2) {
      console.log('Method 2 failed:', e2.message);
    }
    
    // Method 3: Try with raw key (no parsing)
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decrypted && decrypted.trim().length > 0) {
        console.log('✅ Decryption successful (Method 3)');
        console.log('Decrypted value:', decrypted);
        return decrypted;
      }
    } catch (e3) {
      console.log('Method 3 failed:', e3.message);
    }
    
    console.error('❌ All decryption methods failed');
    console.log('Returning original encrypted data');
    return encryptedData;
    
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    return encryptedData;
  }
};

export const login = async (req, res) => {
  try {
    let { email, password, timestamp } = req.body;

    console.log('\n🔍 === LOGIN REQUEST RECEIVED ===');
    console.log('Timestamp:', new Date(timestamp).toLocaleString());
    console.log('Raw email length:', email?.length);
    console.log('Raw password length:', password?.length);
    
    // Step 1: Attempt to decrypt
    console.log('\n🔓 ATTEMPTING DECRYPTION...');
    
    const originalEmail = email;
    const originalPassword = password;
    
    email = decryptData(email);
    password = decryptData(password);
    
    console.log('\n📊 DECRYPTION RESULTS:');
    console.log('Email decrypted?', email !== originalEmail ? '✅ YES' : '❌ NO');
    console.log('Password decrypted?', password !== originalPassword ? '✅ YES' : '❌ NO');
    
    // Step 2: Check if data is still encrypted
    const isEmailEncrypted = email.startsWith('U2FsdGVkX1');
    const isPasswordEncrypted = password.startsWith('U2FsdGVkX1');
    
    if (isEmailEncrypted || isPasswordEncrypted) {
      console.error('\n❌ DECRYPTION FAILED!');
      console.error('Data is still encrypted. Possible issues:');
      console.error('1. Frontend and backend encryption keys do not match');
      console.error('2. Key format issue');
      console.error('3. CryptoJS version mismatch');
      
      // Provide helpful error message
      return res.status(400).json({ 
        message: "Authentication failed",
        hint: "Encryption/decryption mismatch. Please contact administrator."
      });
    }
    
    // Step 3: Validate decrypted data
    if (!email || !password) {
      console.error('Email or password missing after decryption');
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }
    
    // Step 4: Clean and validate email
    email = email.trim().toLowerCase();
    
    if (!email.includes('@')) {
      console.error('Invalid email format after decryption:', email);
      return res.status(400).json({ 
        message: "Invalid email format" 
      });
    }
    
    console.log('\n📧 PROCESSING LOGIN FOR:', email);
    console.log('Password length:', password.length);
    
    // Step 5: Find user in database
    const user = await findUserByEmail(email);

    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ 
        message: "Invalid credentials" 
      });
    }

    console.log('✅ User found:', user.email);
    console.log('User ID:', user.id);
    
    // Step 6: Verify password
    console.log('🔑 Verifying password...');
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('❌ Password does not match');
      console.log('Stored hash starts with:', user.password.substring(0, 20) + '...');
      return res.status(401).json({ 
        message: "Invalid credentials" 
      });
    }

    console.log('✅ Password verified successfully');
    
    // Step 7: Generate tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Step 8: Store refresh token
    await saveRefreshToken(user.id, refreshToken);

    // Step 9: Set HTTP-only cookie for refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log('🎉 LOGIN SUCCESSFUL!');
    console.log('Generated access token');
    
    // Step 10: Send success response
    res.status(200).json({
      status: {
        message: "Login successful",
        accessToken,
      },
      userDetails: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        department_id: user.department_id,
        department_name: user.department_name,
        user_level_id: user.user_level_id,
        level_name: user.level_name,
        designation_id: user.designation_id,
        designation_name: user.designation_name,
        role_id: user.role_id,
        role_name: user.role_name,
        zone_id: user.zone_id,
        zone_name: user.zone_name,
        circle_id: user.circle_id,
        circle_name: user.circle_name,
        division_id: user.division_id,
        division_name: user.division_name,
        district_id: user.district_id,
        district_name: user.district_name,
        is_super_admin: user.is_super_admin,
        is_system_role: user.is_system_role,
        permissions: user.permissions ? user.permissions.split(',') : []
      },
    });
    
  } catch (error) {
    console.error('\n❌ LOGIN ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};