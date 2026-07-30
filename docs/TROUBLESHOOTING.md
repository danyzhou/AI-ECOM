# Troubleshooting Guide

### Issue: WooCommerce 401 Unauthorized
- Ensure Consumer Key/Secret have Read/Write permissions.
- Ensure your WordPress site has Permalinks enabled (Settings -> Permalinks -> Post name). WooCommerce REST API requires rewrite rules.

### Issue: OpenAI / Gemini Connection Timeout
- Verify VPS has outbound network access to `api.openai.com` and `generativelanguage.googleapis.com`.
- Check System Logs tab under Settings for exact HTTP error codes and latency.
