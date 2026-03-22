# Wow Aquatics Free Deploy

This app is prepared for free deployment with:

- Render free web service
- Neon free PostgreSQL

## 1. Create a free Neon database

1. Sign in at https://neon.com/
2. Create a project
3. Copy the connection string

## 2. Push this project to GitHub

Initialize git if needed, commit, and push to your GitHub repository.

## 3. Deploy on Render

1. Sign in at https://render.com/
2. Create a new Web Service from your GitHub repo
3. Render will detect `render.yaml`
4. Add the `DATABASE_URL` value from Neon
5. Deploy

## 4. Use the live URL

After deploy completes, Render gives you a public URL like:

`https://wow-aquatics.onrender.com`

## Notes

- Render free services can sleep when idle
- Neon stores your shared products and orders
- The server auto-creates tables and seed products on first boot
