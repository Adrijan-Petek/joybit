# Database Schema

## Overview

Joybit uses Turso (SQLite) as its primary database for storing user data, game statistics, achievements, and security information. The database is designed for high performance and reliability.

## Database Configuration

### Connection Setup

```javascript
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
```

### Environment Variables

```env
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token
```

## Core Tables

### User Sessions & Profiles

#### user_sessions

```sql
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_games INTEGER DEFAULT 0,
  total_earnings TEXT DEFAULT '0', -- Wei as string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_user_sessions_address ON user_sessions(address);
CREATE INDEX idx_user_sessions_last_login ON user_sessions(last_login);
```

### Game Statistics

#### match3_games

```sql
CREATE TABLE match3_games (
  id INTEGER PRIMARY KEY,
  player_address TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  moves INTEGER NOT NULL,
  time_spent INTEGER NOT NULL, -- seconds
  reward_amount TEXT NOT NULL, -- Wei as string
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (player_address) REFERENCES user_sessions(address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_match3_games_player ON match3_games(player_address);
CREATE INDEX idx_match3_games_score ON match3_games(score DESC);
CREATE INDEX idx_match3_games_completed ON match3_games(completed_at DESC);
```

#### card_games

```sql
CREATE TABLE card_games (
  id INTEGER PRIMARY KEY,
  player_address TEXT NOT NULL,
  bet_amount TEXT NOT NULL, -- Wei as string
  card_selected INTEGER NOT NULL, -- 1, 2, or 3
  winning_card INTEGER NOT NULL,
  is_win BOOLEAN NOT NULL,
  reward_amount TEXT DEFAULT '0', -- Wei as string
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (player_address) REFERENCES user_sessions(address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_card_games_player ON card_games(player_address);
CREATE INDEX idx_card_games_played ON card_games(played_at DESC);
CREATE INDEX idx_card_games_win ON card_games(is_win);
```

#### daily_claims

```sql
CREATE TABLE daily_claims (
  id INTEGER PRIMARY KEY,
  player_address TEXT NOT NULL,
  streak_count INTEGER DEFAULT 1,
  reward_amount TEXT NOT NULL, -- Wei as string
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_claim_available DATETIME NOT NULL,

  FOREIGN KEY (player_address) REFERENCES user_sessions(address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_daily_claims_player ON daily_claims(player_address);
CREATE INDEX idx_daily_claims_claimed ON daily_claims(claimed_at DESC);
CREATE UNIQUE INDEX idx_daily_claims_player_next ON daily_claims(player_address, next_claim_available);
```

### Achievement System

#### achievements

```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY,
  achievement_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'match3', 'card', 'daily', 'general'
  rarity TEXT NOT NULL, -- 'common', 'rare', 'epic', 'legendary', 'mythic'
  requirements TEXT NOT NULL, -- JSON string of requirements
  reward_type TEXT, -- 'nft', 'token', 'badge'
  reward_amount TEXT, -- Wei as string or NFT token ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### player_achievements

```sql
CREATE TABLE player_achievements (
  id INTEGER PRIMARY KEY,
  player_address TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 100, -- percentage
  nft_token_id TEXT, -- if NFT reward

  FOREIGN KEY (player_address) REFERENCES user_sessions(address),
  FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id),
  UNIQUE(player_address, achievement_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_player_achievements_player ON player_achievements(player_address);
CREATE INDEX idx_player_achievements_unlocked ON player_achievements(unlocked_at DESC);
```

### Security System

#### security_alerts

```sql
CREATE TABLE security_alerts (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL, -- 'sql_injection', 'xss', 'suspicious'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  ip TEXT NOT NULL,
  user_agent TEXT,
  url TEXT,
  method TEXT,
  request_body TEXT, -- truncated for security
  details TEXT, -- additional threat information
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME,
  resolved_by TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_ip ON security_alerts(ip);
CREATE INDEX idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);
```

#### blocked_ips

```sql
CREATE TABLE blocked_ips (
  id INTEGER PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_by TEXT NOT NULL, -- 'auto' or admin address
  expires_at DATETIME, -- NULL for permanent blocks
  unblocked_at DATETIME,
  unblocked_by TEXT
);
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_blocked_ips_ip ON blocked_ips(ip);
CREATE INDEX idx_blocked_ips_blocked_at ON blocked_ips(blocked_at DESC);
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at);
```

#### security_logs

```sql
CREATE TABLE security_logs (
  id INTEGER PRIMARY KEY,
  action TEXT NOT NULL, -- 'threat_detected', 'ip_blocked', 'ip_unblocked', etc.
  type TEXT NOT NULL, -- 'security', 'admin', 'system'
  ip TEXT,
  user_agent TEXT,
  user TEXT, -- admin address if applicable
  details TEXT, -- JSON string with additional data
  success BOOLEAN DEFAULT TRUE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_security_logs_action ON security_logs(action);
CREATE INDEX idx_security_logs_type ON security_logs(type);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_ip ON security_logs(ip);
```

#### security_settings

```sql
CREATE TABLE security_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  max_requests_per_minute INTEGER DEFAULT 60,
  max_requests_per_hour INTEGER DEFAULT 1000,
  block_duration_minutes INTEGER DEFAULT 15,
  sql_injection_detection BOOLEAN DEFAULT TRUE,
  xss_detection BOOLEAN DEFAULT TRUE,
  csrf_protection BOOLEAN DEFAULT TRUE,
  input_validation BOOLEAN DEFAULT TRUE,
  session_monitoring BOOLEAN DEFAULT TRUE,
  audit_logging BOOLEAN DEFAULT TRUE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);
```

### Notifications & Communication

#### notifications

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  recipient_address TEXT NOT NULL,
  type TEXT NOT NULL, -- 'achievement', 'game_result', 'system', 'security'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON string with additional data
  read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- auto-delete after expiration

  FOREIGN KEY (recipient_address) REFERENCES user_sessions(address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_notifications_recipient ON notifications(recipient_address);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
```

#### notification_tokens

```sql
CREATE TABLE notification_tokens (
  id INTEGER PRIMARY KEY,
  player_address TEXT UNIQUE NOT NULL,
  fcm_token TEXT, -- Firebase Cloud Messaging
  email TEXT,
  telegram_id TEXT,
  discord_id TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (player_address) REFERENCES user_sessions(address)
);
```

### Themes & Customization

#### user_themes

```sql
CREATE TABLE user_themes (
  id INTEGER PRIMARY KEY,
  user_address TEXT UNIQUE,
  theme_id TEXT DEFAULT 'default',
  custom_colors TEXT, -- JSON string of color overrides
  custom_settings TEXT, -- JSON string of setting overrides
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_address) REFERENCES user_sessions(address)
);
```

### Analytics & Statistics

#### game_stats

```sql
CREATE TABLE game_stats (
  id INTEGER PRIMARY KEY,
  date DATE NOT NULL,
  game_type TEXT NOT NULL, -- 'match3', 'card', 'daily'
  total_games INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  total_volume TEXT DEFAULT '0', -- Wei as string
  average_score REAL,
  completion_rate REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(date, game_type)
);
```

**Indexes:**
```sql
CREATE INDEX idx_game_stats_date ON game_stats(date DESC);
CREATE INDEX idx_game_stats_type ON game_stats(game_type);
```

#### player_stats

```sql
CREATE TABLE player_stats (
  id INTEGER PRIMARY KEY,
  player_address TEXT UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_earnings TEXT DEFAULT '0', -- Wei as string
  highest_score INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (player_address) REFERENCES user_sessions(address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_player_stats_games ON player_stats(total_games DESC);
CREATE INDEX idx_player_stats_earnings ON player_stats(total_earnings DESC);
CREATE INDEX idx_player_stats_active ON player_stats(last_active DESC);
```

### Seasons & Events

#### seasons

```sql
CREATE TABLE seasons (
  id INTEGER PRIMARY KEY,
  season_name TEXT NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  theme TEXT, -- JSON string with season theme
  rewards_multiplier REAL DEFAULT 1.0,
  special_events TEXT, -- JSON string with special events
  is_active BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### season_leaderboards

```sql
CREATE TABLE season_leaderboards (
  id INTEGER PRIMARY KEY,
  season_id INTEGER NOT NULL,
  player_address TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  reward_earned TEXT DEFAULT '0', -- Wei as string
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (player_address) REFERENCES user_sessions(address),
  UNIQUE(season_id, player_address)
);
```

**Indexes:**
```sql
CREATE INDEX idx_season_leaderboards_season ON season_leaderboards(season_id);
CREATE INDEX idx_season_leaderboards_rank ON season_leaderboards(season_id, rank);
```

## Database Maintenance

### Initialization Script

```javascript
// Initialize all tables
async function initDatabase() {
  const tables = [
    'user_sessions',
    'match3_games',
    'card_games',
    'daily_claims',
    'achievements',
    'player_achievements',
    'security_alerts',
    'blocked_ips',
    'security_logs',
    'security_settings',
    'notifications',
    'notification_tokens',
    'user_themes',
    'game_stats',
    'player_stats',
    'seasons',
    'season_leaderboards'
  ];

  for (const table of tables) {
    await createTable(table);
  }
}
```

### Backup Strategy

```bash
# Turso database backup
turso db shell joybit-production ".backup /tmp/joybit-backup.db"

# Automated backups (cron job)
0 2 * * * turso db shell joybit-production ".backup /backups/joybit-$(date +\%Y\%m\%d).db"
```

### Performance Optimization

#### Query Optimization

```sql
-- Use EXPLAIN QUERY PLAN for analysis
EXPLAIN QUERY PLAN
SELECT * FROM match3_games
WHERE player_address = ?
ORDER BY score DESC
LIMIT 10;

-- Add composite indexes for common queries
CREATE INDEX idx_match3_player_score ON match3_games(player_address, score DESC);
```

#### Connection Pooling

```javascript
// Turso handles connection pooling automatically
// Configure based on your usage patterns
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Turso manages connection pooling internally
});
```

### Data Retention Policies

```sql
-- Archive old game data (keep last 1 year)
DELETE FROM match3_games
WHERE completed_at < datetime('now', '-1 year');

-- Archive old security logs (keep last 6 months)
DELETE FROM security_logs
WHERE timestamp < datetime('now', '-6 months');

-- Compress old notifications (keep last 30 days)
DELETE FROM notifications
WHERE created_at < datetime('now', '-30 days');
```

## Migration Scripts

### Version Control

```javascript
// Migration system
const migrations = {
  '001_initial_schema': async (client) => {
    // Create initial tables
  },
  '002_add_security_tables': async (client) => {
    // Add security-related tables
  },
  '003_add_analytics': async (client) => {
    // Add analytics tables
  }
};
```

### Rollback Procedures

```javascript
// Rollback functions for each migration
const rollbacks = {
  '001_initial_schema': async (client) => {
    // Drop all tables in reverse order
  }
};
```

## Monitoring & Alerts

### Database Health Checks

```javascript
async function healthCheck() {
  try {
    const result = await client.execute('SELECT 1 as health_check');
    return result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

### Performance Metrics

```sql
-- Query performance analysis
SELECT
  type,
  name,
  tbl_name,
  sql
FROM sqlite_master
WHERE type = 'index';

-- Table sizes
SELECT
  name,
  SUM(pgsize) as size_bytes
FROM dbstat
GROUP BY name
ORDER BY size_bytes DESC;
```

## Security Considerations

### Data Encryption

- Sensitive data is encrypted at rest
- TLS 1.3 for data in transit
- API keys and tokens are hashed

### Access Control

```sql
-- Row Level Security (RLS) equivalent
-- Implement in application layer
function canAccessUserData(userAddress, requestingAddress) {
  return userAddress === requestingAddress || isAdmin(requestingAddress);
}
```

### Audit Trail

All database operations are logged:

```javascript
async function auditedExecute(query, params) {
  const startTime = Date.now();

  try {
    const result = await client.execute(query, params);

    // Log successful operation
    await logOperation('db_query', {
      query: query.substring(0, 100), // Truncate for security
      duration: Date.now() - startTime,
      success: true
    });

    return result;
  } catch (error) {
    // Log failed operation
    await logOperation('db_query', {
      query: query.substring(0, 100),
      duration: Date.now() - startTime,
      success: false,
      error: error.message
    });

    throw error;
  }
}
```</content>
<parameter name="filePath">/home/mobb/Downloads/Joybit/wiki/Technical/Database-Schema.md