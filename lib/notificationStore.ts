import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export interface NotificationToken {
  fid: number
  token: string
  url: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface ScheduledNotification {
  id?: number
  fid?: number // null for broadcast notifications
  title: string
  body: string
  targetUrl?: string
  scheduledTime: string // ISO date string
  isRecurring: boolean
  recurrencePattern?: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  lastSent?: string
  created_at?: string
  updated_at?: string
}

/**
 * Database-backed notification token store
 * Replaces the in-memory Map with persistent storage
 */
export class DatabaseNotificationStore {
  private initialized = false

  private async ensureInitialized() {
    if (this.initialized) return

    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS notification_tokens (
          fid INTEGER PRIMARY KEY,
          token TEXT,
          url TEXT,
          enabled BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await client.execute(`
        CREATE TABLE IF NOT EXISTS scheduled_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fid INTEGER, -- NULL for broadcast notifications
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          target_url TEXT,
          scheduled_time DATETIME NOT NULL,
          is_recurring BOOLEAN DEFAULT 0,
          recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
          enabled BOOLEAN DEFAULT 1,
          last_sent DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      this.initialized = true
      console.log('✅ Notification tables initialized')
    } catch (error) {
      console.error('❌ Failed to initialize notification tables:', error)
      // Don't set initialized to true if it failed
      throw error
    }
  }

  async get(fid: number): Promise<NotificationToken | undefined> {
    await this.ensureInitialized()

    try {
      const result = await client.execute({
        sql: 'SELECT * FROM notification_tokens WHERE fid = ?',
        args: [fid]
      })

      if (result.rows.length === 0) {
        console.log(`ℹ️ No notification token found for FID ${fid}`)
        return undefined
      }

      const row = result.rows[0]
      const token = {
        fid: row.fid as number,
        token: row.token as string,
        url: row.url as string,
        enabled: Boolean(row.enabled),
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }
      console.log(`✅ Found notification token for FID ${fid}:`, { enabled: token.enabled, hasToken: !!token.token, hasUrl: !!token.url })
      return token
    } catch (error) {
      console.error('❌ Failed to get notification token:', error)
      return undefined
    }
  }

  async set(fid: number, data: Omit<NotificationToken, 'fid' | 'created_at' | 'updated_at'>): Promise<void> {
    await this.ensureInitialized()

    try {
      await client.execute({
        sql: `
          INSERT OR REPLACE INTO notification_tokens (fid, token, url, enabled, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [fid, data.token, data.url, data.enabled ? 1 : 0]
      })
      console.log(`✅ Notification token ${data.token ? 'updated' : 'marked enabled'} for FID ${fid}`)
    } catch (error) {
      console.error('❌ Failed to set notification token:', error)
    }
  }

  async delete(fid: number): Promise<void> {
    await this.ensureInitialized()

    try {
      await client.execute({
        sql: 'DELETE FROM notification_tokens WHERE fid = ?',
        args: [fid]
      })
      console.log(`✅ Notification token deleted for FID ${fid}`)
    } catch (error) {
      console.error('❌ Failed to delete notification token:', error)
    }
  }

  async getAll(): Promise<NotificationToken[]> {
    await this.ensureInitialized()

    try {
      const result = await client.execute('SELECT * FROM notification_tokens ORDER BY updated_at DESC')

      return result.rows.map(row => ({
        fid: row.fid as number,
        token: row.token as string,
        url: row.url as string,
        enabled: Boolean(row.enabled),
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }))
    } catch (error) {
      console.error('❌ Failed to get all notification tokens:', error)
      return []
    }
  }

  async getEnabledCount(): Promise<number> {
    await this.ensureInitialized()

    try {
      const result = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM notification_tokens WHERE enabled = 1',
        args: []
      })

      return result.rows[0].count as number
    } catch (error) {
      console.error('❌ Failed to get enabled count:', error)
      return 0
    }
  }

  async size(): Promise<number> {
    await this.ensureInitialized()

    try {
      const result = await client.execute('SELECT COUNT(*) as count FROM notification_tokens')

      return result.rows[0].count as number
    } catch (error) {
      console.error('❌ Failed to get size:', error)
      return 0
    }
  }

  // Scheduled notification methods
  async createScheduledNotification(notification: Omit<ScheduledNotification, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    await this.ensureInitialized()

    try {
      const result = await client.execute({
        sql: `
          INSERT INTO scheduled_notifications (fid, title, body, target_url, scheduled_time, is_recurring, recurrence_pattern, enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          notification.fid || null,
          notification.title,
          notification.body,
          notification.targetUrl || null,
          notification.scheduledTime,
          notification.isRecurring ? 1 : 0,
          notification.recurrencePattern || null,
          notification.enabled ? 1 : 0
        ]
      })

      console.log(`✅ Scheduled notification created: ${notification.title}`)
      return Number(result.lastInsertRowid)
    } catch (error) {
      console.error('❌ Failed to create scheduled notification:', error)
      throw error
    }
  }

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    await this.ensureInitialized()

    try {
      const result = await client.execute('SELECT * FROM scheduled_notifications ORDER BY scheduled_time ASC')

      return result.rows.map(row => ({
        id: row.id as number,
        fid: row.fid as number | undefined,
        title: row.title as string,
        body: row.body as string,
        targetUrl: row.target_url as string,
        scheduledTime: row.scheduled_time as string,
        isRecurring: Boolean(row.is_recurring),
        recurrencePattern: row.recurrence_pattern as 'daily' | 'weekly' | 'monthly' | undefined,
        enabled: Boolean(row.enabled),
        lastSent: row.last_sent as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }))
    } catch (error) {
      console.error('❌ Failed to get scheduled notifications:', error)
      return []
    }
  }

  async getDueNotifications(): Promise<ScheduledNotification[]> {
    await this.ensureInitialized()

    try {
      const now = new Date().toISOString()
      const result = await client.execute({
        sql: 'SELECT * FROM scheduled_notifications WHERE enabled = 1 AND scheduled_time <= ? ORDER BY scheduled_time ASC',
        args: [now]
      })

      return result.rows.map(row => ({
        id: row.id as number,
        fid: row.fid as number | undefined,
        title: row.title as string,
        body: row.body as string,
        targetUrl: row.target_url as string,
        scheduledTime: row.scheduled_time as string,
        isRecurring: Boolean(row.is_recurring),
        recurrencePattern: row.recurrence_pattern as 'daily' | 'weekly' | 'monthly' | undefined,
        enabled: Boolean(row.enabled),
        lastSent: row.last_sent as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }))
    } catch (error) {
      console.error('❌ Failed to get due notifications:', error)
      return []
    }
  }

  async updateScheduledNotification(id: number, updates: Partial<ScheduledNotification>): Promise<void> {
    await this.ensureInitialized()

    try {
      const setParts = []
      const args = []

      if (updates.title !== undefined) {
        setParts.push('title = ?')
        args.push(updates.title)
      }
      if (updates.body !== undefined) {
        setParts.push('body = ?')
        args.push(updates.body)
      }
      if (updates.targetUrl !== undefined) {
        setParts.push('target_url = ?')
        args.push(updates.targetUrl)
      }
      if (updates.scheduledTime !== undefined) {
        setParts.push('scheduled_time = ?')
        args.push(updates.scheduledTime)
      }
      if (updates.isRecurring !== undefined) {
        setParts.push('is_recurring = ?')
        args.push(updates.isRecurring ? 1 : 0)
      }
      if (updates.recurrencePattern !== undefined) {
        setParts.push('recurrence_pattern = ?')
        args.push(updates.recurrencePattern)
      }
      if (updates.enabled !== undefined) {
        setParts.push('enabled = ?')
        args.push(updates.enabled ? 1 : 0)
      }
      if (updates.lastSent !== undefined) {
        setParts.push('last_sent = ?')
        args.push(updates.lastSent)
      }

      if (setParts.length === 0) return

      setParts.push('updated_at = CURRENT_TIMESTAMP')
      args.push(id)

      await client.execute({
        sql: `UPDATE scheduled_notifications SET ${setParts.join(', ')} WHERE id = ?`,
        args
      })

      console.log(`✅ Scheduled notification ${id} updated`)
    } catch (error) {
      console.error('❌ Failed to update scheduled notification:', error)
      throw error
    }
  }

  async deleteScheduledNotification(id: number): Promise<void> {
    await this.ensureInitialized()

    try {
      await client.execute({
        sql: 'DELETE FROM scheduled_notifications WHERE id = ?',
        args: [id]
      })
      console.log(`✅ Scheduled notification ${id} deleted`)
    } catch (error) {
      console.error('❌ Failed to delete scheduled notification:', error)
      throw error
    }
  }

  async rescheduleRecurringNotification(id: number): Promise<void> {
    await this.ensureInitialized()

    try {
      // Get the notification
      const result = await client.execute({
        sql: 'SELECT * FROM scheduled_notifications WHERE id = ?',
        args: [id]
      })

      if (result.rows.length === 0) return

      const notification = result.rows[0]
      const scheduledTime = new Date(notification.scheduled_time as string)
      let nextTime: Date

      switch (notification.recurrence_pattern) {
        case 'daily':
          nextTime = new Date(scheduledTime.getTime() + 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          nextTime = new Date(scheduledTime.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          nextTime = new Date(scheduledTime)
          nextTime.setMonth(nextTime.getMonth() + 1)
          break
        default:
          return // No recurrence pattern
      }

      await client.execute({
        sql: 'UPDATE scheduled_notifications SET scheduled_time = ?, last_sent = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [nextTime.toISOString(), id]
      })

      console.log(`✅ Recurring notification ${id} rescheduled to ${nextTime.toISOString()}`)
    } catch (error) {
      console.error('❌ Failed to reschedule recurring notification:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const notificationTokens = new DatabaseNotificationStore()