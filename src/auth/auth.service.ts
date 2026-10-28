
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  private cleanEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validateEmailAndPassword(email: string, password: string) {
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      throw new BadRequestException({
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = this.cleanEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new BadRequestException({
        message: 'Please enter a valid email address.',
      });
    }

    return cleanEmail;
  }

  private validateStudentPassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException({
        message: 'Password must contain at least 8 characters.',
      });
    }

    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new BadRequestException({
        message:
          'Password must include uppercase, lowercase, number, and special character.',
      });
    }
  }

  async register(email: string, password: string) {
    const cleanEmail = this.validateEmailAndPassword(email, password);
    this.validateStudentPassword(password);

    const existingUsers = await this.db.query(
      'SELECT id FROM users WHERE email = ?',
      [cleanEmail],
    );

    if (existingUsers.length > 0) {
      throw new ConflictException({
        message: 'An account with this email already exists.',
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      await this.db.query(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES (?, ?, 'user', 'active')`,
        [cleanEmail, passwordHash],
      );

      return {
        message: 'Registration successful. You can now log in.',
      };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException({
          message: 'An account with this email already exists.',
        });
      }

      console.error('Student registration error:', error);
      throw new InternalServerErrorException({
        message: 'Registration failed. Please try again.',
      });
    }
  }

  async login(email: string, password: string) {
    const cleanEmail = this.validateEmailAndPassword(email, password);

    const users = await this.db.query(
      `SELECT id, email, password_hash, role, status
       FROM users
       WHERE email = ?`,
      [cleanEmail],
    );

    if (users.length === 0) {
      throw new UnauthorizedException({
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException({
        message: 'Invalid email or password.',
      });
    }

    if (user.role !== 'user') {
      throw new ForbiddenException({
        message: 'Please use the admin login page.',
      });
    }

    if (user.status !== 'active') {
      throw new ForbiddenException({
        message: 'Your account is inactive. Contact the administrator.',
      });
    }

    try {
      await this.db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [
        user.id,
      ]);
    } catch (error) {
      console.error('Student login update error:', error);
      throw new InternalServerErrorException({
        message: 'Login failed. Please try again.',
      });
    }

    return {
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getSession(userId: number) {
    const rows = await this.db.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         up.first_name AS firstName,
         up.last_name AS lastName
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      throw new UnauthorizedException({
        authenticated: false,
        message: 'User account not found.',
      });
    }

    const user = rows[0];

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      },
    };
  }

  async registerAdmin(email: string, password: string) {
    const cleanEmail = this.validateEmailAndPassword(email, password);

    if (password.length < 8) {
      throw new BadRequestException({
        message: 'Password must contain at least 8 characters.',
      });
    }

    const admins = await this.db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'",
    );

    if (Number(admins[0].total) >= 3) {
      throw new ForbiddenException({
        message: 'The maximum number of admin accounts has been reached.',
      });
    }

    const existingUsers = await this.db.query(
      'SELECT id FROM users WHERE email = ?',
      [cleanEmail],
    );

    if (existingUsers.length > 0) {
      throw new ConflictException({
        message: 'An account with this email already exists.',
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await this.db.query(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES (?, ?, 'admin', 'active')`,
        [cleanEmail, passwordHash],
      );

      return {
        message: 'Admin registered successfully.',
        admin: {
          id: result.insertId,
          email: cleanEmail,
          role: 'admin',
        },
      };
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException({
          message: 'An account with this email already exists.',
        });
      }

      console.error('Admin registration error:', error);
      throw new InternalServerErrorException({
        message: 'Admin registration failed.',
      });
    }
  }

  async loginAdmin(email: string, password: string) {
    const cleanEmail = this.validateEmailAndPassword(email, password);

    const admins = await this.db.query(
      `SELECT id, email, password_hash, role, status
       FROM users
       WHERE email = ? AND role = 'admin'`,
      [cleanEmail],
    );

    if (admins.length === 0) {
      throw new UnauthorizedException({
        message: 'Invalid admin email or password.',
      });
    }

    const admin = admins[0];
    const passwordMatches = await bcrypt.compare(
      password,
      admin.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException({
        message: 'Invalid admin email or password.',
      });
    }

    if (admin.status !== 'active') {
      throw new ForbiddenException({
        message: 'This admin account is inactive.',
      });
    }

    return {
      message: 'Admin login successful.',
      admin: {
        id: admin.id,
        email: admin.email,
        role: 'admin',
      },
    };
  }
}
