# Full-Stack Mobile App Setup Guide

Complete step-by-step instructions to set up and run the full-stack mobile application.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **MySQL Server** (v8+) - [Download](https://dev.mysql.com/downloads/)
- **Expo CLI** - Install with `npm install -g expo-cli`
- **Expo Go app** on your mobile device (from App Store/Play Store)

## 1. Database Setup

### Option A: Using MySQL Directly

1. Start your MySQL server
2. Create the database and tables:

```bash
# Navigate to project root
cd School

# Run the SQL schema
mysql -u root -p < database/schema.sql
```

3. Verify the database was created:
```sql
SHOW DATABASES;
USE fullstack_app;
SHOW TABLES;
```

### Option B: Using Supabase (Alternative)

If you prefer Supabase over MySQL:

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Update the backend `.env` file with your Supabase connection string

## 2. Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your database credentials:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://root:your_password@localhost:3306/fullstack_app"
JWT_SECRET="your-random-secret-key-here"
JWT_EXPIRES_IN=7d
FRONTEND_URL="http://localhost:19006"
BCRYPT_SALT_ROUNDS=10
```

**Important:** 
- Replace `your_password` with your MySQL root password
- Generate a strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Initialize Prisma

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### Start Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Connected to database successfully
🚀 Server running on port 3000
📱 API available at http://localhost:3000/api
🏥 Health check at http://localhost:3000/health
```

## 3. Frontend Setup

### Install Dependencies

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your API URL:

**For iOS Simulator:**
```env
API_URL=http://localhost:3000/api
```

**For Android Emulator:**
```env
API_URL=http://10.0.2.2:3000/api
```

**For Physical Device:**
```env
API_URL=http://YOUR_COMPUTER_IP:3000/api
```

To find your computer's IP address:
- **Windows:** Run `ipconfig` in terminal
- **Mac/Linux:** Run `ifconfig` or `ip addr`
- Look for your local network IP (usually starts with 192.168.x.x)

### Start Expo Development Server

```bash
npm start
# or
expo start
```

You'll see a QR code in the terminal.

### Run on Your Device

**Option 1: Using Expo Go App (Recommended)**
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Scan the QR code with the Expo Go app
3. The app will load on your device

**Option 2: Using Simulator/Emulator**
- Press `i` for iOS simulator
- Press `a` for Android emulator

**Option 3: Web Browser**
- Press `w` to run in web browser

## 4. Testing the Application

### Test Authentication

1. Open the app - you should see the Login screen
2. Tap "Sign Up" to create a new account
3. Enter your details and register
4. You should be automatically logged in and see the Home screen

### Test CRUD Operations

1. **Create Post:** Tap the "+" button on Home screen
2. **View Posts:** Posts appear on the Home screen
3. **View Details:** Tap any post to see full content
4. **Edit Post:** On post detail screen (if you're the owner), tap "Edit"
5. **Delete Post:** On post detail screen, tap "Delete"
6. **Search:** Use the search bar to filter posts
7. **Pull to Refresh:** Pull down on the posts list to refresh

### Test Logout

1. Tap "Logout" button in the header
2. You should be redirected to the Login screen

## 5. Troubleshooting

### Backend Issues

**Cannot connect to database:**
- Verify MySQL is running: `mysql -u root -p`
- Check DATABASE_URL in `.env` matches your credentials
- Ensure database `fullstack_app` exists

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

**Prisma errors:**
```bash
# Reset Prisma
npx prisma migrate reset
npx prisma generate
```

### Frontend Issues

**Cannot connect to API:**
- Verify backend is running on port 3000
- Check API_URL in `.env` matches your setup
- For physical device, ensure computer and phone are on same WiFi network
- Check firewall settings - port 3000 must be accessible

**Expo errors:**
```bash
# Clear Expo cache
expo start -c

# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install
```

**TypeScript errors:**
These are normal before installing dependencies. After `npm install`, most errors should resolve.

### Network Issues

**Cannot reach backend from mobile device:**
1. Ensure both devices are on the same WiFi network
2. Use your computer's local IP (not localhost or 127.0.0.1)
3. Check if firewall is blocking port 3000
4. Try accessing `http://YOUR_IP:3000/health` from your phone's browser

## 6. Development Tips

### Backend Development

- Server auto-reloads on file changes (nodemon)
- View API logs in the backend terminal
- Use Prisma Studio (`npx prisma studio`) to view/edit database visually

### Frontend Development

- Changes auto-reload in the app
- Use `console.log()` for debugging (view in Expo DevTools)
- Press `d` in Expo terminal to open DevTools
- Use React DevTools for component inspection

### Testing with Postman/Insomnia

You can test API endpoints directly:

**Register:**
```
POST http://localhost:3000/api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Login:**
```
POST http://localhost:3000/api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Create Post (requires token):**
```
POST http://localhost:3000/api/posts
Headers: Authorization: Bearer <your_token>
{
  "title": "My First Post",
  "content": "Hello World!"
}
```

## 7. Production Build

### Backend

```bash
# Set NODE_ENV=production in .env
# Start with production settings
npm start
```

### Frontend

**Build for Android:**
```bash
expo build:android
```

**Build for iOS:**
```bash
expo build:ios
```

**Build for Web:**
```bash
expo build:web
```

## 8. Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)

## 9. Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages carefully
3. Search for specific error messages online
4. Check that all prerequisites are met
5. Verify environment variables are set correctly

## Summary

✅ **Database:** MySQL running with `fullstack_app` database  
✅ **Backend:** Node.js server running on `http://localhost:3000`  
✅ **Frontend:** Expo app running on your device/simulator  
✅ **Connection:** Frontend can reach backend API  

You're all set! Happy coding! 🚀