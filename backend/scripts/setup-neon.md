# Neon PostgreSQL Setup for FinWise

## Step 1: Create Neon Account
1. Go to https://neon.tech
2. Sign up with your GitHub/Google account
3. Create a new project named "finwise-app"

## Step 2: Get Connection Details
After creating the project, you'll get a connection string like:
```
postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 3: Update .env File
Copy the connection string and update your `.env` file:
```env
DATABASE_URL=postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 4: Run Database Setup
After updating the .env file, run:
```bash
npm run setup-db
```

This will create all the necessary tables and indexes for the FinWise app.

## Free Tier Limits
- 10 GB storage
- 100 GB data transfer
- No time limit
- Perfect for development and small production apps