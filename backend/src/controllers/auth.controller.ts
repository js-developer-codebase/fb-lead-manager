import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/environment.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class AuthController {
  /**
   * Admin Login endpoint (POST /api/auth/login)
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      let user = await User.findOne({ email: email.toLowerCase().trim() });

      // If database is empty, seed default admin user for ease of initial login
      if (!user && (await User.countDocuments()) === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        user = await User.create({
          email: 'admin@homestore.com',
          passwordHash: hashedPassword,
          role: 'ADMIN',
          isActive: true
        });
      }

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        config.security.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Login failed', message: err.message });
    }
  }

  /**
   * Get current authenticated user profile
   */
  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      res.json({ success: true, user: req.user });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user profile', message: err.message });
    }
  }
}
