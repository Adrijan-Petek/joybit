# Farcaster Mini App Notifications

This document explains how the notification system works when users add the Joybit app.

## Features Implemented

### 1. **Add App Button with Notification**
- Located on the main page (`app/page.tsx`)
- When users click "⭐ Add App", it triggers `sdk.actions.addMiniApp()`
- Shows a success notification toast when the app is added
- Shows a cancellation message if user declines

### 2. **Welcome Notification**
- Automatically shown when a user first adds the app
- Only displays once per user (tracked via localStorage)
- Shows: "🎉 Welcome to Joybit! Thanks for adding the app!"
- Auto-dismisses after 5 seconds

### 3. **Event Listener**
- Listens for the `miniappAdded` event from Farcaster SDK
- Displays notification when event fires
- Message: "✅ App added successfully! You can now receive notifications."

### 4. **Webhook Endpoint**
- API route: `/api/farcaster-webhook`
- Handles server-side events from Farcaster:
  - `miniapp_added` - User adds the app
  - `miniapp_removed` - User removes the app
  - `notifications_enabled` - User enables notifications
  - `notifications_disabled` - User disables notifications

## Notification Toast UI

The notification appears as an animated toast at the top center of the screen:
- **Design**: Gradient purple-to-blue background with white border
- **Content**: Game controller emoji, message, and dismiss button
- **Animation**: Slides down from top, fades out after 5 seconds
- **Responsive**: Adapts to mobile and desktop screens

## Configuration

### Farcaster Manifest (`public/.well-known/farcaster.json`)

Added `webhookUrl` to receive server-side events:

```json
{
  "miniapp": {
    "webhookUrl": "https://your-domain.vercel.app/api/farcaster-webhook"
  }
}
```

**Important**: Replace `https://your-domain.vercel.app` with your actual deployment URL.

## How It Works

### Client-Side Flow:

1. User visits the main page
2. SDK initializes and checks if app was just added via `context.client.added`
3. If added and first visit, shows welcome notification
4. User clicks "Add App" button
5. `sdk.actions.addMiniApp()` is called
6. On success, notification toast appears
7. SDK emits `miniappAdded` event
8. Event listener shows confirmation notification

### Server-Side Flow:

1. Farcaster sends webhook POST to `/api/farcaster-webhook`
2. Endpoint receives event payload
3. Event type is extracted and logged
4. For `miniapp_added`: 
   - Notification token is included in payload
   - Can be stored in database for future notifications
   - Can send welcome notification back to user
5. Returns 200 OK to acknowledge

## Database Integration (Future Enhancement)

To implement full notification tracking, you would:

```typescript
// Store notification tokens
await db.notificationTokens.create({
  fid: userFid,
  token: eventData.notificationDetails?.token,
  url: eventData.notificationDetails?.url,
  createdAt: new Date()
})

// Send notifications later
const tokens = await db.notificationTokens.findByFid(userFid)
await fetch(tokens.url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokens: [tokens.token],
    notification: {
      notificationId: 'unique-id',
      title: 'Daily Reward Available!',
      body: 'Claim your free JOYB tokens now!',
      targetUrl: 'https://your-domain.vercel.app/daily-claim'
    }
  })
})
```

## Testing

1. **Local Development**: The webhook won't receive events from Farcaster in local dev
2. **Production**: After deploying to Vercel:
   - Update manifest with production URL
   - Test "Add App" button
   - Check Vercel logs for webhook events
   - Verify notification toast appears

## Next Steps

1. **Deploy to Vercel** and update manifest URLs
2. **Sign the manifest** using Farcaster developer tools
3. **Set up database** to store notification tokens
4. **Implement notification campaigns**:
   - Daily reward reminders
   - Leaderboard position updates
   - New feature announcements
5. **Add analytics** to track notification engagement

## Rate Limits

According to Farcaster specs:
- 1 notification per 30 seconds per token
- 100 notifications per day per token

## Resources

- [Farcaster Mini Apps Docs](https://miniapps.farcaster.xyz/docs/guides/notifications)
- [SDK Actions: addMiniApp](https://miniapps.farcaster.xyz/docs/sdk/actions/add-miniapp)
- [Webhook Events Spec](https://miniapps.farcaster.xyz/docs/specification#adding-mini-apps)
