
import Auths from "../models/auth.models.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const generateAccessToken = (user) => {
  return jwt.sign({ email: user.email }, process.env.ACCESS_JWT_SECRET, {
    expiresIn: "6h",
  });
};


const generateRefreshToken = (user) => {
  return jwt.sign({ email: user.email }, process.env.REFRESH_JWT_SECRET, {
    expiresIn: "7d",
  });
};


export const registerUser = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await Auths.findOne({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const newUser = await Auths.create({ userName, email, password });
    res.json({ message: "User registered successfully", data: newUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await Auths.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "No user found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Incorrect password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    res.json({
      message: "User logged in successfully",
      accessToken,
      refreshToken,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const logoutUser = (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "User logged out successfully" });
};


export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token found!" });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);
    const user = await Auths.findOne({ where: { email: decoded.email } });

    if (!user) return res.status(404).json({ message: "Invalid token" });

    const newAccessToken = generateAccessToken(user);
    res.json({
      message: "Access token generated",
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};
