# Database Migration to Turso

This guide helps you migrate your data from the old Upstash Redis database to the new Turso database.

## Step 1: Export Data from Old Redis Database

Since the Redis dump file has compatibility issues, you need to export your data from the old Upstash Redis instance. You can do this by:

### Option A: Use Upstash Console (Recommended)
1. Go to your old Upstash Redis database dashboard
2. Use the built-in data browser to export your data
3. Or use the REST API to fetch data

### Option B: Create Export Script
If you still have access to the old Redis instance, create JSON files with this structure:

#### `match3-stats.json`
```json
{
  "0x123...": {
    "gamesPlayed": 10,
    "highScore": 5000,
    "highScoreLevel": 5,
    "lastPlayed": 1700000000000
  },
  "0x456...": {
    "gamesPlayed": 25,
    "highScore": 8000,
    "highScoreLevel": 8,
    "lastPlayed": 1700000000000
  }
}
```

#### `leaderboard.json`
```json
[
  {
    "address": "0x123...",
    "score": 5000,
    "username": "Player1",
    "pfp": "https://..."
  },
  {
    "address": "0x456...",
    "score": 8000,
    "username": "Player2",
    "pfp": "https://..."
  }
]
```

#### `token-metadata.json`
```json
{
  "0x789...": {
    "image": "https://...",
    "symbol": "JOYBIT"
  }
}
```

## Step 2: Place Files in Migration Directory

Put your exported JSON files in the `migration-data/` directory:
- `migration-data/match3-stats.json`
- `migration-data/leaderboard.json`
- `migration-data/token-metadata.json`

## Step 3: Run Migration

```bash
node scripts/migrate-to-turso.js
```

## Step 4: Verify Migration

The script will:
- Create all necessary tables in Turso
- Import your data from JSON files
- Show migration statistics

## Troubleshooting

- If you don't have JSON exports, the script will still create empty tables
- Make sure your `.env.local` has the correct TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
- Check the console output for any errors during migration

## Alternative: Manual Data Entry

If you don't have exports, you can manually add data through your application after migration, or directly insert into the Turso database using their web interface.