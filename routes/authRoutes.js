import express from "express";
import { login } from "../controllers/Auth/loginController.js";
import { refreshAccessToken } from "../controllers/Auth/refreashTokenController.js";
import { logout } from "../controllers/Auth/logoutController.js";
import {forgotPassword,resetPassword, testToken} from "../controllers/Auth/passwordController.js";
import { changePassword } from "../controllers/UserManagement/userController.js";
import { auth } from "../middleware/authMiddleware.js";    
const router = express.Router();

// Login
router.post("/login", login);
router.post("/refreshToken", refreshAccessToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/test-token", testToken);
router.post("/change-password", auth, changePassword);


export default router;
