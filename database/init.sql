-- ============================================================
-- LINE Lottery & Wheel Spin System - MySQL 8 Schema
-- Executed automatically on first `docker compose up` via
-- /docker-entrypoint-initdb.d/init.sql
--
-- NOTE: The backend also runs `sequelize.sync()` on startup which
-- creates the same tables (IF NOT EXISTS semantics), so running
-- this script is safe and idempotent.
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- ------------------------------------------------------------
-- users (Admin accounts - JWT auth)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)     NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  display_name  VARCHAR(255)    NOT NULL,
  role          ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- groups (LINE groups the OA has been invited to)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  line_group_id VARCHAR(64)     NOT NULL,
  name          VARCHAR(255)    NOT NULL DEFAULT '',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_groups_line_group_id (line_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- participants (members who registered to join the draw)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id       BIGINT UNSIGNED NOT NULL,
  user_id        VARCHAR(64)     NOT NULL,
  display_name   VARCHAR(255)    NOT NULL,
  is_group_admin TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_participants_group_user (group_id, user_id),
  KEY idx_participants_group (group_id),
  KEY idx_participants_user (user_id),
  CONSTRAINT fk_participants_group FOREIGN KEY (group_id)
    REFERENCES groups (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- winners (draw history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS winners (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id       BIGINT UNSIGNED NOT NULL,
  winner_user_id VARCHAR(64)     NOT NULL,
  winner_name    VARCHAR(255)    NOT NULL,
  draw_time      DATETIME        NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_winners_group_draw (group_id, draw_time),
  KEY idx_winners_name (winner_name),
  CONSTRAINT fk_winners_group FOREIGN KEY (group_id)
    REFERENCES groups (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- events (activities / campaigns, used for dashboard stats)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id    BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255)    NOT NULL,
  description TEXT            NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_group (group_id),
  CONSTRAINT fk_events_group FOREIGN KEY (group_id)
    REFERENCES groups (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- settings (key/value system settings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`       VARCHAR(64) NOT NULL,
  value       TEXT        NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
