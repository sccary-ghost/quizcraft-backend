# Backup and Restore Strategy

This document outlines the backup and restore procedures for QuizCraft. Since the application handles critical examination data, maintaining robust data integrity is paramount.

## 1. Automated Backups

### PostgreSQL Database
If deploying via Docker Compose, a backup cron job can be configured, or you can rely on managed database backups (e.g., AWS RDS, Neon) which perform daily automated snapshots.

For manual automated scripting, a `pg_dump` cron job can be established:
```bash
0 2 * * * docker exec -t postgres-db pg_dumpall -c -U postgres > /backups/dump_`date +\%Y-\%m-\%d`.sql
```

### Media Library
User uploads (images, PDFs) stored in `/uploads` or on S3 should be backed up regularly. 
- **Local Storage**: Use `rsync` or a cloud sync tool (like AWS CLI) to mirror the `/uploads` directory to a safe external bucket daily.
- **S3 Storage**: Enable bucket versioning and cross-region replication.

## 2. Manual Backup (Admin Panel)

Administrators have access to a **Backup** tab in the Admin Dashboard.
- **Export Questions**: Admins can export all questions in a specific folder or the entire Question Bank to CSV/JSON format.
- **Export Analytics**: Candidate performance reports can be exported to CSV.

## 3. Restoration Procedures

### Database Restoration
In the event of catastrophic data loss, the database can be restored from the daily SQL dump:

1. Stop the backend server to prevent writes.
2. Drop the corrupted database (or start with a fresh one).
3. Restore using `psql`:
   ```bash
   cat dump_2026-07-05.sql | docker exec -i postgres-db psql -U postgres
   ```
4. Restart the backend service.

### Media Restoration
If local media is lost, restore the `/uploads` folder from the latest `rsync` backup or S3 bucket prior to starting the application server.

## 4. Disaster Recovery (DR)
- **RPO (Recovery Point Objective)**: Maximum 24 hours (based on daily backups).
- **RTO (Recovery Time Objective)**: Target < 1 hour to spin up fresh infrastructure and restore the SQL dump.

> [!WARNING]
> Always test your restoration procedure in a staging environment quarterly to ensure backups are valid and not corrupted.
