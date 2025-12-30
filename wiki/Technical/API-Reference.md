# API Reference

## Overview

Joybit provides RESTful API endpoints for game interactions, user management, and administrative functions. All endpoints return JSON responses.

## Base URL

```
https://yourdomain.com/api
```

## Authentication

### Admin Endpoints

Admin endpoints require authentication via admin wallet address:

```javascript
// Check admin status
const isAdmin = walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
```

## 🎮 Game APIs

### Match-3 Game

#### Get Game State

```http
GET /api/game-stats/match3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalGames": 1250,
    "averageScore": 2450,
    "highestScore": 8900,
    "completionRate": 0.78
  }
}
```

#### Submit Game Result

```http
POST /api/game-stats/match3
```

**Request Body:**
```json
{
  "playerAddress": "0x1234...",
  "score": 2450,
  "level": 5,
  "moves": 25,
  "timeSpent": 180
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "game_12345",
    "reward": "1000000000000000000",
    "achievement": "High Scorer"
  }
}
```

### Card Game

#### Get Game Statistics

```http
GET /api/card-game/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalGames": 890,
    "winRate": 0.33,
    "totalPayout": "45000000000000000000"
  }
}
```

#### Play Card Game

```http
POST /api/card-game/play
```

**Request Body:**
```json
{
  "playerAddress": "0x1234...",
  "betAmount": "2000000000000000000"
}
```

### Daily Claim

#### Get Claim Status

```http
GET /api/daily-claim/status?address=0x1234...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canClaim": true,
    "currentStreak": 5,
    "nextClaimTime": "2025-12-31T00:00:00Z",
    "rewardAmount": "1000000000000000000"
  }
}
```

#### Claim Daily Reward

```http
POST /api/daily-claim/claim
```

**Request Body:**
```json
{
  "playerAddress": "0x1234...",
  "signature": "0xabcdef..."
}
```

## 🏆 Achievement APIs

### Get Player Achievements

```http
GET /api/achievements?address=0x1234...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "first_win",
        "name": "First Victory",
        "description": "Win your first game",
        "rarity": "common",
        "unlockedAt": "2025-12-30T10:30:00Z",
        "nftTokenId": "123"
      }
    ],
    "totalUnlocked": 12,
    "completionRate": 0.4
  }
}
```

### Sync Achievements

```http
POST /api/sync-achievements
```

**Request Body:**
```json
{
  "playerAddress": "0x1234...",
  "gameType": "match3",
  "stats": {
    "gamesPlayed": 50,
    "wins": 35,
    "highestScore": 8900
  }
}
```

## 🛡️ Security APIs

### Get Security Dashboard

```http
GET /api/admin/security
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeThreats": 3,
    "totalThreats": 156,
    "blockedIPs": 12,
    "recentEvents": [
      {
        "id": 1,
        "type": "sql_injection",
        "ip": "192.168.1.1",
        "timestamp": "2025-12-30T14:30:00Z",
        "resolved": false
      }
    ]
  }
}
```

### Get Threats

```http
GET /api/admin/security/threats
```

**Query Parameters:**
- `status`: `resolved` | `unresolved` | `all` (default: `all`)
- `type`: `sql_injection` | `xss` | `suspicious` | `all` (default: `all`)
- `limit`: number (default: 50)
- `offset`: number (default: 0)

### Block IP Address

```http
POST /api/admin/security/block-ip
```

**Request Body:**
```json
{
  "ip": "192.168.1.1",
  "reason": "SQL injection attempts",
  "duration": 15
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ip": "192.168.1.1",
    "blocked": true,
    "expiresAt": "2025-12-30T15:45:00Z"
  }
}
```

### Unblock IP Address

```http
POST /api/admin/security/unblock-ip
```

**Request Body:**
```json
{
  "ip": "192.168.1.1"
}
```

### Get Security Logs

```http
GET /api/admin/security/logs
```

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `type`: log type filter
- `ip`: IP address filter
- `limit`: number (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "action": "threat_detected",
        "type": "sql_injection",
        "ip": "192.168.1.1",
        "details": "Suspicious query pattern detected",
        "timestamp": "2025-12-30T14:30:00Z"
      }
    ],
    "total": 156,
    "hasMore": true
  }
}
```

### Update Security Settings

```http
POST /api/admin/security/settings
```

**Request Body:**
```json
{
  "maxRequestsPerMinute": 60,
  "maxRequestsPerHour": 1000,
  "blockDurationMinutes": 15,
  "sqlInjectionDetection": true,
  "xssDetection": true,
  "inputValidation": true
}
```

## 📊 Analytics APIs

### Get Game Statistics

```http
GET /api/analytics/games
```

**Query Parameters:**
- `gameType`: `match3` | `card` | `daily` | `all`
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "match3": {
      "totalGames": 1250,
      "uniquePlayers": 89,
      "averageScore": 2450,
      "revenue": "2500000000000000000"
    },
    "card": {
      "totalGames": 890,
      "uniquePlayers": 67,
      "winRate": 0.33,
      "revenue": "1780000000000000000"
    }
  }
}
```

### Get Player Statistics

```http
GET /api/analytics/players
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 156,
    "activePlayers": 89,
    "newPlayersToday": 12,
    "retentionRate": 0.67,
    "topPlayers": [
      {
        "address": "0x1234...",
        "totalGames": 45,
        "totalEarnings": "5000000000000000000",
        "rank": 1
      }
    ]
  }
}
```

## 🎨 Theme APIs

### Get Available Themes

```http
GET /api/themes
```

**Response:**
```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "id": "default",
        "name": "Default",
        "colors": {
          "primary": "#6366f1",
          "secondary": "#8b5cf6",
          "background": "#0f0f23"
        }
      }
    ],
    "currentTheme": "default"
  }
}
```

### Update Theme Settings

```http
POST /api/themes/update
```

**Request Body:**
```json
{
  "themeId": "custom",
  "colors": {
    "primary": "#ff6b6b",
    "secondary": "#4ecdc4",
    "background": "#2c3e50"
  },
  "typography": {
    "fontFamily": "Inter",
    "fontSize": "16px"
  }
}
```

## 🔔 Notification APIs

### Get Notifications

```http
GET /api/notifications?address=0x1234...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "achievement",
        "title": "New Achievement Unlocked!",
        "message": "You earned 'High Scorer' achievement",
        "read": false,
        "createdAt": "2025-12-30T10:30:00Z"
      }
    ]
  }
}
```

### Mark Notification Read

```http
POST /api/notifications/read
```

**Request Body:**
```json
{
  "notificationId": 1
}
```

### Send Notification

```http
POST /api/send-notification
```

**Request Body:**
```json
{
  "type": "achievement",
  "recipient": "0x1234...",
  "title": "Achievement Unlocked!",
  "message": "Congratulations on your new achievement",
  "data": {
    "achievementId": "high_scorer"
  }
}
```

## 📋 Leaderboard APIs

### Get Leaderboard

```http
GET /api/leaderboard
```

**Query Parameters:**
- `gameType`: `match3` | `card` | `daily` | `all` (default: `all`)
- `timeframe`: `daily` | `weekly` | `monthly` | `alltime` (default: `alltime`)
- `limit`: number (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "address": "0x1234...",
        "score": 8900,
        "gamesPlayed": 45,
        "winRate": 0.8,
        "totalEarnings": "5000000000000000000"
      }
    ],
    "totalEntries": 156,
    "lastUpdated": "2025-12-30T15:00:00Z"
  }
}
```

## 🔄 Webhook APIs

### Farcaster Webhook

```http
POST /api/farcaster-webhook
```

**Request Body:**
```json
{
  "type": "frame",
  "frame": {
    "timestamp": "2025-12-30T10:00:00Z",
    "frameActionBody": {
      "buttonIndex": 1,
      "inputText": "play",
      "castId": {
        "fid": 123,
        "hash": "0x..."
      }
    }
  }
}
```

## 📊 Token APIs

### Get Token Metadata

```http
GET /api/token-metadata
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "0xf348930442f3afB04F1f1bbE473C5F57De7b26eb": {
        "image": "https://...",
        "symbol": "JOYB",
        "decimals": 18,
        "totalSupply": "1000000000000000000000000"
      }
    }
  }
}
```

## Error Responses

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "playerAddress",
      "issue": "Invalid Ethereum address format"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request parameters
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- **Authenticated requests**: 1000/hour
- **Unauthenticated requests**: 100/hour
- **Admin requests**: 5000/hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Data Types

### Common Types

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

interface PaginationParams {
  limit?: number
  offset?: number
}

interface DateRangeParams {
  startDate?: string
  endDate?: string
}
```

## WebSocket Support

Real-time updates are available via WebSocket:

```javascript
const ws = new WebSocket('wss://yourdomain.com/api/ws')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle real-time updates
}
```

Supported events:
- `threat_detected`
- `game_completed`
- `achievement_unlocked`
- `leaderboard_updated`</content>
<parameter name="filePath">/home/mobb/Downloads/Joybit/wiki/Technical/API-Reference.md