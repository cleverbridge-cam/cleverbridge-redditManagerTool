# Environment Configuration

This application requires environment variables to be set for authentication and API access.

## Setup Instructions

### 1. Frontend Environment Variables

Copy the template and fill in your values:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
```bash
VITE_AUTH_USERNAME=your_chosen_username
VITE_AUTH_PASSWORD=your_secure_password
```

### 2. Backend Environment Variables

Copy the template and fill in your values:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure all required variables.

### 3. Production Deployment

For production deployments (Railway, Vercel, etc.), set these environment variables in your deployment platform:

**Frontend:**
- `VITE_AUTH_USERNAME`
- `VITE_AUTH_PASSWORD`

**Backend:**
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SESSION_SECRET_KEY`

## Security Notes

- Never commit `.env` or `.env.local` files to version control
- Use strong, unique passwords for production
- Rotate credentials regularly
- Environment variables are already excluded in `.gitignore`
