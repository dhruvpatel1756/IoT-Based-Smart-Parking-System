# Supabase Account Migration Guide

**Created by Bhagya**

This guide will walk you through the process of migrating your ParkEase project to a new Supabase account step-by-step.

## Step 1: Create a New Supabase Project

1. Log in to your **NEW** Supabase account at [supabase.com](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Select your organization.
4. Fill in the project details:
   - **Name**: `ParkEase` (or any name you prefer).
   - **Database Password**: Generate a strong password and **copy it to a safe place**.
   - **Region**: Select the region closest to you (e.g., Mumbai, Singapore).
5. **Security Settings** (Important):
   - [x] **Enable Data API**: Checks this box (Required).
   - [x] **Enable automatic RLS**: Check this box (Recommended for security).
6. Click **"Create new project"**.

## Step 2: Get Your API Credentials

Once the project is created (it may take a few minutes):

1. Go to **Project Settings** (Cog icon at the bottom left) -> **API**.
2. **Project URL**: At the very top of `API Settings`, look for the **Project URL**. Copy this value.
3. **Anon/Public Key**: Scroll down to the **Project API keys** or **Publishable key** section. Copy the key labeled `anon` or `default`. This is your public key (safe for the browser).

## Step 3: Update Local Environment Variables

1. Open your project in VS Code.
2. Open the `.env` file in the root directory.
3. Update the following variables with your NEW credentials from Step 2:

```env
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
```

4. Save the file.

## Step 4: Set Up the Database Schema

1. In your Supabase Dashboard, go to the **SQL Editor** (icon looking like a terminal `>_`).
2. Click **"New Query"**.
3. Copy the **ENTIRE** content of the `full_schema.sql` file provided in this project's root directory.
4. Paste it into the SQL Editor.
5. Click **"Run"** (bottom right).

*This will recreate all your tables (profiles, parking_spots, bookings) and security policies in the new project.*

## Step 5: Enable Storage (Optional)

If your app uses image uploads (e.g., for Parking Spots):

1. Go to **Storage** (Folder icon).
2. Click **"New Bucket"**.
3. Name it `parking_spots` (or whatever your code uses).
4. Make it **Public**.
5. Click **Save**.
6. Repeat for `avatars` if needed.

## Step 6: Restart and Test

1. In your VS Code terminal, stop the running server (Ctrl+C).
2. Run `npm run dev` to restart it with the new `.env` settings.
3. detailed verification:
   - Sign up a new user (since the old users are in the old account).
   - Try to create a parking spot.
   - Verify data appears in your new Supabase dashboard.

**Migration Complete!** 🚀
