# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/927b4acb-c16e-4d56-a65a-51a0751478fa

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/927b4acb-c16e-4d56-a65a-51a0751478fa) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- FastAPI (Python backend)
- Supabase (Database)
- Reddit API

## Environment Setup & Security

**⚠️ IMPORTANT: Never commit sensitive credentials to git!**

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual credentials in `.env`:
   - **Reddit API**: Get credentials from [Reddit Apps](https://www.reddit.com/prefs/apps)
   - **Supabase**: Get URL and key from your [Supabase Dashboard](https://supabase.com/dashboard)
   - **Session Secret**: Generate a secure random string using one of these methods:
     ```bash
     # Using Python (recommended)
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     
     # Using OpenSSL
     openssl rand -base64 32
     
     # Using Node.js
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

3. The `.env` file is already in `.gitignore` and should never be committed.

4. For production deployment, set environment variables in your hosting platform.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/927b4acb-c16e-4d56-a65a-51a0751478fa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
