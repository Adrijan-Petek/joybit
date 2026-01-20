# Security

Joybit includes multiple layers of security controls (frontend, API routes, and administrative tooling). This page is a high-level map; use the code and config in your deployment as the final reference.

## Application Controls

Common controls include:

- Rate limiting / abuse prevention
- Input validation and sanitization
- Audit/event logging for sensitive operations
- Admin-only routes for operational actions

## On-Chain Considerations

- Game contracts are `Ownable` and expose admin setters for fees and rewards.
- Funds flow:
  - ETH fees are forwarded to the treasury
  - JOYB rewards are credited as pending balances and claimed by users

## Admin Operations

If the admin UI is enabled in your deployment, use it to:

- Inspect game fees and reward configuration
- Review security logs / suspicious activity
- Manage operational parameters (where implemented)
