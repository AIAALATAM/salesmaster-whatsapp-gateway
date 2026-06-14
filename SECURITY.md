# Security

Do not commit production secrets to this repository.

Rotate any credential that has ever appeared in local docs, compose files, screenshots, tickets or chat transcripts before production use.

Minimum production hardening checklist:

- Store GHL PITs, OAuth tokens, Evolution API keys and Meta tokens outside Git.
- Protect all gateway webhooks with HMAC or a shared secret.
- Validate Meta webhook signatures.
- Reject unknown tenants instead of falling back to a default account.
- Redact phone numbers and message bodies from logs by default.
- Add rate limits per tenant and per WhatsApp instance.
- Use persistent queues and idempotency keys for outbound messages.

