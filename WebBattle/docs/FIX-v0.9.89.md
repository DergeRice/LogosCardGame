# v0.9.89 — reduce Cloudflare storage writes

- Keep committed game state, reconnect sessions, accounts, rewards and community data.
- Do not persist routine request, judgment, UI activity, connection or AI audit traces. Keep human submission results and actionable errors/audio failures, up to 1,000 audit records per UTC day. This is a diagnostic log budget, not a limit on games or submissions. Sentence observation only runs for retained human submission records; historical counts remain unchanged.
- Throttle repeated failures with the same player/event/code/reason to one per minute. Restore the daily budget from stored logs after restarts.
- UI telemetry does not touch player activity, run game ticks or checkpoint all game state. Gameplay deadlines continue to use Durable Object alarms.
- Avoid rescheduling an unchanged alarm; connection expiry cleanup runs at most once per minute.
- Health and administrator log GET requests no longer trigger state persistence or log deletion. Include aggregate saved-record counts in the existing log response.
- Do not bulk-delete historical accounts, sentences, logs or audio resources. Existing log retention cleanup still runs when new diagnostic logs are inserted.

Validation: Cloudflare TypeScript and real Miniflare four-player/restart integration; persistence and audit tests; dedicated SQL test for routine/AI suppression, error deduplication and restart-safe daily budget.
