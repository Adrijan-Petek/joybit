# Security Dashboard

## Overview

The Joybit Security Dashboard provides comprehensive monitoring and control over platform security. It features real-time threat detection, IP blocking capabilities, and detailed audit logging.

## 🖥️ Dashboard Interface

### Access Requirements

- Admin wallet address must be configured in `.env.local`
- Navigate to `/admin` route
- Security tab provides access to all security features

### Main Dashboard

The security dashboard consists of 5 main tabs:

## 📊 Dashboard Tab

### Real-time Metrics

- **Active Threats**: Current number of unresolved security threats
- **Total Threats**: All-time threat count
- **Blocked IPs**: Number of currently blocked IP addresses
- **System Status**: Overall security health indicator

### Recent Activity

- Latest security events
- Threat detection alerts
- System status updates
- Performance metrics

## 🚨 Threats Tab

### Threat Monitoring

- **Live Feed**: Real-time threat detection
- **Threat Types**:
  - SQL Injection attempts
  - XSS (Cross-Site Scripting) attacks
  - Suspicious patterns
  - Directory traversal attempts

### Threat Details

Each threat entry includes:
- **Timestamp**: When the threat was detected
- **IP Address**: Source of the threat
- **Type**: Classification of the threat
- **Details**: Specific information about the threat
- **Status**: Resolved/Unresolved
- **Actions**: Manual resolution options

### Threat Classification

```javascript
const THREAT_TYPES = {
  sql_injection: "SQL injection attempts",
  xss: "Cross-site scripting attacks",
  suspicious: "Suspicious patterns (eval, system calls, etc.)",
  directory_traversal: "Directory traversal attempts"
}
```

## 🛡️ Firewall Tab

### IP Management

- **Block IP**: Manually block specific IP addresses
- **Unblock IP**: Remove IP from blocked list
- **Bulk Actions**: Block multiple IPs simultaneously

### Blocked IPs Table

| IP Address | Reason | Blocked At | Blocked By | Actions |
|------------|--------|------------|-----------|---------|
| 192.168.1.1 | SQL Injection | 2025-12-30 10:30 | Auto | Unblock |
| 10.0.0.5 | XSS Attempt | 2025-12-30 09:15 | Admin | Unblock |

### Automatic Blocking

The system automatically blocks IPs based on:
- Multiple threat detections within time window
- Rate limiting violations
- Suspicious pattern matches
- Configurable thresholds

## 📋 Logs Tab

### Audit Logging

- **Security Events**: All security-related activities
- **Admin Actions**: Administrative operations
- **System Events**: Platform status changes
- **User Activities**: Important user interactions

### Log Categories

- **Threat Detection**: Automated security alerts
- **IP Blocking**: Block/unblock operations
- **Rate Limiting**: Request throttling events
- **Authentication**: Login and access attempts
- **Configuration**: Settings changes

### Log Export

- **CSV Export**: Download logs in CSV format
- **JSON Export**: Structured data export
- **Date Range**: Filter logs by time period
- **Search**: Full-text search capabilities

## ⚙️ Settings Tab

### Security Configuration

#### Rate Limiting Settings

```javascript
{
  maxRequestsPerMinute: 60,      // Requests per minute
  maxRequestsPerHour: 1000,      // Requests per hour
  blockDurationMinutes: 15       // Block duration in minutes
}
```

#### Threat Detection Settings

```javascript
{
  sqlInjectionDetection: true,   // Enable SQL injection detection
  xssDetection: true,           // Enable XSS detection
  inputValidation: true,        // Enable input validation
  auditLogging: true           // Enable comprehensive logging
}
```

### Emergency Controls

- **Lockdown Mode**: Temporarily disable all user interactions
- **Maintenance Mode**: Display maintenance message
- **Emergency Reset**: Clear all active blocks and threats

## 🔧 Technical Implementation

### Security Proxy (Edge Runtime)

The security system runs at the edge using Next.js 16 proxy:

```typescript
// proxy.ts - Main security implementation
export async function proxy(request: NextRequest) {
  const ip = getClientIP(request)

  // Rate limiting check
  if (isRateLimited(ip)) {
    return blockResponse("Rate limit exceeded")
  }

  // Threat detection
  if (detectThreats(request)) {
    logThreat(ip, threatType, details)
    return blockResponse("Security threat detected")
  }

  // IP blocking check
  if (isBlockedIP(ip)) {
    return blockResponse("IP address blocked")
  }

  return NextResponse.next()
}
```

### Database Schema

#### Security Tables

```sql
-- Security alerts
CREATE TABLE security_alerts (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  ip TEXT NOT NULL,
  details TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blocked IPs
CREATE TABLE blocked_ips (
  id INTEGER PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_by TEXT
);

-- Security logs
CREATE TABLE security_logs (
  id INTEGER PRIMARY KEY,
  action TEXT NOT NULL,
  type TEXT NOT NULL,
  ip TEXT,
  user TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Security Dashboard API

```
GET /api/admin/security
- Returns dashboard metrics and statistics

GET /api/admin/security/threats
- Returns list of active threats

POST /api/admin/security/block-ip
- Blocks an IP address

POST /api/admin/security/unblock-ip
- Unblocks an IP address

GET /api/admin/security/logs
- Returns security audit logs
```

## 📊 Monitoring & Analytics

### Real-time Metrics

- **Threat Detection Rate**: Threats per minute/hour
- **False Positive Rate**: Accuracy of threat detection
- **Response Time**: System response latency
- **Block Effectiveness**: Reduction in malicious activity

### Performance Monitoring

- **CPU Usage**: Security processing overhead
- **Memory Usage**: Database and cache usage
- **Network I/O**: API call patterns
- **Error Rates**: System reliability metrics

## 🚨 Alert System

### Notification Types

- **Email Alerts**: Critical security events
- **Dashboard Alerts**: Real-time UI notifications
- **Log Alerts**: Automated log analysis
- **Admin Notifications**: Direct admin alerts

### Alert Thresholds

```javascript
const ALERT_THRESHOLDS = {
  threatsPerMinute: 10,      // Alert if > 10 threats/minute
  blockedIPs: 50,           // Alert if > 50 blocked IPs
  failedRequests: 100,      // Alert on high error rates
  responseTime: 5000        // Alert on slow responses (ms)
}
```

## 🔒 Best Practices

### Security Maintenance

1. **Regular Monitoring**: Check dashboard daily
2. **Log Review**: Analyze security logs weekly
3. **Threshold Tuning**: Adjust settings based on traffic patterns
4. **IP Management**: Regularly review and clean blocked IPs
5. **Backup Security**: Maintain security configuration backups

### Incident Response

1. **Detection**: Monitor dashboard for alerts
2. **Assessment**: Review threat details and logs
3. **Containment**: Block malicious IPs if needed
4. **Recovery**: Unblock legitimate users
5. **Analysis**: Review incident for prevention

## 📞 Support & Resources

- **Documentation**: [Security Guide](Security/Threat-Detection.md)
- **API Reference**: [Technical Docs](Technical/API-Reference.md)
- **Issues**: [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues)
- **Discussions**: [Security Discussions](https://github.com/Adrijan-Petek/joybit/discussions)</content>
<parameter name="filePath">/home/mobb/Downloads/Joybit/wiki/Security/Security-Dashboard.md