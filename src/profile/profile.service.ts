
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async getProfile(userId: number) {
    try {
      const rows = await this.db.query(
        `SELECT
           u.id AS userId,
           u.email AS email,
           u.status AS accountStatus,
           up.id AS id,
           up.first_name AS firstName,
           up.last_name AS lastName,
           up.father_name AS fatherName,
           up.phone AS phone,
           up.date_of_birth AS dateOfBirth,
           up.gender AS gender,
           up.city AS city,
           up.department AS department,
           up.semester AS semester,
           up.enrollment_date AS enrollmentDate,
           up.status AS status,
           up.cgpa AS cgpa,
           up.address AS address
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.id = ?`,
        [userId],
      );

      if (rows.length === 0) {
        throw new NotFoundException({ message: 'User not found.' });
      }

      const row = rows[0];

      return {
        profile: {
          id: row.id,
          userId: row.userId,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          fatherName: row.fatherName,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth,
          gender: row.gender,
          city: row.city,
          department: row.department,
          semester: row.semester,
          enrollmentDate: row.enrollmentDate,
          status: row.status,
          cgpa: row.cgpa,
          address: row.address,
          accountStatus: row.accountStatus,
        },
      };
    } catch (error: any) {
      if (error?.status === 404) throw error;

      console.error('Get profile error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to load your profile.',
      });
    }
  }

  async saveProfile(userId: number, body: any, isUpdate = false) {
    try {
      const {
        firstName,
        lastName,
        fatherName,
        phone,
        dateOfBirth,
        gender,
        city,
        department,
        semester,
        enrollmentDate,
        status,
        cgpa,
        address,
      } = body;

      const profileStatus = status || 'active';
      const profileSemester =
        profileStatus === 'graduated' ? 'completed' : semester || null;

      await this.db.query(
        `INSERT INTO user_profiles (
           user_id,
           first_name,
           last_name,
           father_name,
           phone,
           date_of_birth,
           gender,
           city,
           department,
           semester,
           enrollment_date,
           status,
           cgpa,
           address
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           first_name = VALUES(first_name),
           last_name = VALUES(last_name),
           father_name = VALUES(father_name),
           phone = VALUES(phone),
           date_of_birth = VALUES(date_of_birth),
           gender = VALUES(gender),
           city = VALUES(city),
           department = VALUES(department),
           semester = VALUES(semester),
           enrollment_date = VALUES(enrollment_date),
           status = VALUES(status),
           cgpa = VALUES(cgpa),
           address = VALUES(address)`,
        [
          userId,
          firstName || null,
          lastName || null,
          fatherName || null,
          phone || null,
          dateOfBirth || null,
          gender || null,
          city || null,
          department || null,
          profileSemester,
          enrollmentDate || null,
          profileStatus,
          cgpa === '' || cgpa === undefined ? null : (cgpa ?? null),
          address || null,
        ],
      );

      // Saving a graduated profile deactivates the student's account.
      if (!isUpdate && profileStatus === 'graduated') {
        await this.db.query(
          "UPDATE users SET status = 'inactive' WHERE id = ?",
          [userId],
        );
      }

      return {
        message: isUpdate
          ? 'Profile updated successfully.'
          : 'Profile saved successfully.',
      };
    } catch (error) {
      console.error('Save/update profile error:', error);
      throw new InternalServerErrorException({
        message: isUpdate
          ? 'Unable to update your profile.'
          : 'Unable to save your profile.',
      });
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException({
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      throw new BadRequestException({
        message: 'New password must contain at least 8 characters.',
      });
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      throw new BadRequestException({
        message:
          'New password must include uppercase, lowercase, number, and special character.',
      });
    }

    try {
      const users = await this.db.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId],
      );

      if (users.length === 0) {
        throw new NotFoundException({ message: 'User not found.' });
      }

      const matches = await bcrypt.compare(
        currentPassword,
        users[0].password_hash,
      );

      if (!matches) {
        throw new BadRequestException({
          message: 'Current password is incorrect.',
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await this.db.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId],
      );

      return { message: 'Password changed successfully.' };
    } catch (error: any) {
      if ([400, 404].includes(error?.status)) throw error;

      console.error('Change password error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to change your password.',
      });
    }
  }
}
