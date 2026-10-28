
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { PoolConnection } from 'mysql2/promise';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  private formatProfile(row: any) {
    if (!row) return null;

    return {
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
      createdAt: row.createdAt,
      lastLogin: row.lastLogin,
    };
  }

  async getStudents(searchValue?: string) {
    try {
      const search = (searchValue || '').trim();
      const pattern = `%${search}%`;

      const students = await this.db.query(
        `SELECT
           u.id AS id,
           u.email AS email,
           u.status AS accountStatus,
           u.created_at AS createdAt,
           u.last_login AS lastLogin,
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
         WHERE u.role = 'user'
           AND (
             ? = ''
             OR u.email LIKE ?
             OR up.first_name LIKE ?
             OR up.last_name LIKE ?
             OR CONCAT(
               COALESCE(up.first_name, ''),
               ' ',
               COALESCE(up.last_name, '')
             ) LIKE ?
           )
         ORDER BY u.id DESC`,
        [search, pattern, pattern, pattern, pattern],
      );

      return {
        students: students.map((student: any) =>
          this.formatProfile(student),
        ),
      };
    } catch (error) {
      console.error('Get students error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to load students.',
      });
    }
  }

  async getStudent(id: string) {
    try {
      const students = await this.db.query(
        `SELECT
           u.id AS id,
           u.id AS userId,
           u.email AS email,
           u.status AS accountStatus,
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
         WHERE u.id = ? AND u.role = 'user'`,
        [id],
      );

      if (students.length === 0) {
        throw new NotFoundException({ message: 'Student not found.' });
      }

      return {
        student: this.formatProfile(students[0]),
      };
    } catch (error: any) {
      if (error?.status === 404) throw error;

      console.error('Get student error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to load student details.',
      });
    }
  }

  async updateStudent(id: string, body: any) {
    let connection: PoolConnection | undefined;
    let transactionStarted = false;

    try {
      connection = await this.db.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      const {
        email,
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
        accountStatus,
      } = body;

      const users = await connection.query(
        'SELECT id FROM users WHERE id = ? AND role = ? FOR UPDATE',
        [id, 'user'],
      );
      const userRows = users[0] as any[];

      if (userRows.length === 0) {
        throw new NotFoundException({ message: 'Student not found.' });
      }

      if (email) {
        const cleanEmail = String(email).trim().toLowerCase();

        const [duplicates] = await connection.query(
          'SELECT id FROM users WHERE email = ? AND id <> ?',
          [cleanEmail, id],
        );

        if ((duplicates as any[]).length > 0) {
          throw new ConflictException({
            message: 'That email is already in use.',
          });
        }

        await connection.query('UPDATE users SET email = ? WHERE id = ?', [
          cleanEmail,
          id,
        ]);
      }

      const profileStatus = status || 'active';
      const profileSemester =
        profileStatus === 'graduated' ? 'completed' : semester || null;

      await connection.query(
        `INSERT INTO user_profiles (
           user_id, first_name, last_name, father_name, phone,
           date_of_birth, gender, city, department, semester,
           enrollment_date, status, cgpa, address
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
          id,
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

      if (['active', 'inactive'].includes(accountStatus)) {
        await connection.query(
          `UPDATE users
           SET status = ?
           WHERE id = ? AND role = 'user'`,
          [accountStatus, id],
        );
      }

      await connection.commit();
      transactionStarted = false;

      return { message: 'Student updated successfully.' };
    } catch (error: any) {
      if (connection && transactionStarted) {
        await connection.rollback();
      }

      if ([404, 409].includes(error?.status)) throw error;

      console.error('Update student error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to update student.',
      });
    } finally {
      connection?.release();
    }
  }

  async updateStudentStatus(idValue: string, status: string) {
    const studentId = Number(idValue);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      throw new BadRequestException({ message: 'Invalid student ID.' });
    }

    if (!['active', 'inactive'].includes(status)) {
      throw new BadRequestException({
        message: 'Status must be active or inactive.',
      });
    }

    try {
      const students = await this.db.query(
        `SELECT
           u.id,
           u.status AS accountStatus,
           up.status AS academicStatus
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.id = ? AND u.role = 'user'`,
        [studentId],
      );

      if (students.length === 0) {
        throw new NotFoundException({
          message: 'Student account not found.',
        });
      }

      const student = students[0];

      if (
        student.academicStatus === 'graduated' &&
        status === 'active'
      ) {
        throw new BadRequestException({
          message: 'Graduated students must remain inactive.',
        });
      }

      await this.db.query(
        "UPDATE users SET status = ? WHERE id = ? AND role = 'user'",
        [status, studentId],
      );

      const updatedRows = await this.db.query(
        `SELECT id, email, status AS accountStatus
         FROM users
         WHERE id = ? AND role = 'user'`,
        [studentId],
      );

      if (
        updatedRows.length === 0 ||
        updatedRows[0].accountStatus !== status
      ) {
        throw new InternalServerErrorException({
          message: 'The account status could not be verified.',
        });
      }

      return {
        message: `Student account ${
          status === 'active' ? 'activated' : 'deactivated'
        } successfully.`,
        student: updatedRows[0],
      };
    } catch (error: any) {
      if ([400, 404].includes(error?.status)) throw error;

      console.error('Change student account status error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to change student account status.',
      });
    }
  }

  async deleteStudent(id: string) {
    let connection: PoolConnection | undefined;
    let transactionStarted = false;

    try {
      connection = await this.db.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      const [students] = await connection.query(
        'SELECT id FROM users WHERE id = ? AND role = ? FOR UPDATE',
        [id, 'user'],
      );

      if ((students as any[]).length === 0) {
        throw new NotFoundException({ message: 'Student not found.' });
      }

      await connection.query(
        'DELETE FROM user_profiles WHERE user_id = ?',
        [id],
      );

      await connection.query(
        'DELETE FROM users WHERE id = ? AND role = ?',
        [id, 'user'],
      );

      await connection.commit();
      transactionStarted = false;

      return { message: 'Student deleted successfully.' };
    } catch (error: any) {
      if (connection && transactionStarted) {
        await connection.rollback();
      }

      if (error?.status === 404) throw error;

      console.error('Delete student error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to delete student.',
      });
    } finally {
      connection?.release();
    }
  }

  async getStats() {
    try {
      const rows = await this.db.query(`
        SELECT
          COUNT(*) AS totalStudents,
          SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END)
            AS activeAccounts,
          SUM(CASE WHEN u.status = 'inactive' THEN 1 ELSE 0 END)
            AS inactiveAccounts,
          SUM(CASE WHEN up.status = 'graduated' THEN 1 ELSE 0 END)
            AS graduatedStudents
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.role = 'user'
      `);

      const stats = rows[0];

      return {
        stats: {
          totalStudents: Number(stats.totalStudents || 0),
          activeAccounts: Number(stats.activeAccounts || 0),
          inactiveAccounts: Number(stats.inactiveAccounts || 0),
          graduatedStudents: Number(stats.graduatedStudents || 0),
        },
      };
    } catch (error) {
      console.error('Admin statistics error:', error);
      throw new InternalServerErrorException({
        message: 'Unable to load dashboard statistics.',
      });
    }
  }
}
