# Database Setup

Requirements:
- MySQL Server 8.0 or later
- MySQL Workbench (optional)

## 1. Create the database

Log in to MySQL and run:

CREATE DATABASE student_management_db;

## 2. Import the schema

From the backend repository root, run:

mysql -u YOUR_MYSQL_USER -p student_management_db < database/schema.sql

## 3. Configure the backend

Copy `.env.example` to `.env` and set your own MySQL credentials.

Do not commit `.env` or share database passwords.
