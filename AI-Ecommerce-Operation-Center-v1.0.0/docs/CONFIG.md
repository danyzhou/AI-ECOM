# Configuration Guide

Environment variables are defined in `.env` or `config/production.env.example`:

| Key | Description | Default |
| --- | --- | --- |
| `DOMAIN_NAME` | Primary domain name | `ai.yourdomain.com` |
| `PORT` | App server internal port | `3000` |
| `POSTGRES_DB` | Database name | `ai_ecommerce` |
| `POSTGRES_USER` | Database user | `ai_admin` |
| `POSTGRES_PASSWORD` | Database password | (Auto-generated) |
| `JWT_SECRET` | Token encryption secret | (Auto-generated) |
| `OPENAI_API_KEY` | OpenAI API key for vision processing | Optional |
| `GEMINI_API_KEY` | Gemini API key for copywriting | Optional |
