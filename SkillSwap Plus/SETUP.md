# SkillSwap+ Setup & Running Guide

## Prerequisites

- **Node.js**: v14+ (check with `node -v`)
- **npm**: v6+ (check with `npm -v`)
- **MongoDB**: 
  - Local: `mongodb://localhost:27017`
  - Or MongoDB Atlas (cloud): Get connection string from Atlas dashboard

## Quick Start (5 minutes)

### 1. Clone & Install Dependencies

```bash
cd /Users/vihagaviboshana/Desktop/untitled\ folder/ITPM/SkillSwap-Plus

# Install all dependencies
npm run install-all

# Or manually:
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment Files

**Create server/.env:**
```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set:
```
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb+srv://your-user:your-pass@your-cluster.mongodb.net/skillswap-plus
JWT_SECRET=any-random-string-for-development
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

**Create client/.env:**
```bash
cp client/.env.example client/.env
```

Edit `client/.env` and ensure:
```
REACT_APP_PORT=5001
REACT_APP_API_URL=http://localhost:5001
```

### 3. Seed Database (Create Test Data)

```bash
cd server
npm run seed
```

**Test credentials created:**
- Admin: `admin@skillswap.edu` / `Admin@123`
- Mentor: `mentor@example.com` / `Password123`
- Learner: `learner@example.com` / `Password123`

### 4. Start the Application

**Terminal 1 - Start Backend:**
```bash
cd server
PORT=5001 npm run dev
```

Expected output:
```
✅ MongoDB Connected: [connection-string]
🚀 Server running in development mode on port 5001
📍 API: http://localhost:5001
```

**Terminal 2 - Start Frontend:**
```bash
cd client
REACT_APP_PORT=5001 npm start
```

Expected output:
```
Compiled successfully!
On Your Network: http://192.168.x.x:3000
```

### 5. Open in Browser

Visit: **http://localhost:3000**

You should see the SkillSwap+ landing page.

---

## Manual Testing Workflow

### Test 1: User Registration & Login

1. Click "Register" on landing page
2. Fill in:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@example.com`
   - Password: `TestPass123` (min 6 chars)
   - Role: Select "Learner"
3. Click "Create Account"
4. Should redirect to Learner Dashboard
5. Click your name in navbar → "Logout"
6. Login with registered credentials

### Test 2: View Test Data

1. Login with: `mentor@example.com` / `Password123`
2. You should see Mentor Dashboard
3. Logout
4. Login with: `admin@skillswap.edu` / `Admin@123`
5. You should see Admin Dashboard

### Test 3: API Health Check

In browser console:
```javascript
fetch('http://localhost:5001/health').then(r => r.json()).then(console.log)
```

Expected response:
```json
{
  "success": true,
  "message": "SkillSwap+ API is running",
  "timestamp": "2026-02-27T...",
  "environment": "development"
}
```

---

## Common Issues & Solutions

### Issue: Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5001`

**Solution**:
```bash
# Find process using port
lsof -i :5001

# Kill it
kill -9 <PID>

# Or use different port
PORT=5002 npm run dev
```

### Issue: MongoDB Connection Failed

**Problem**: `MongooseError: Cannot connect to MongoDB`

**Solutions**:
1. Check MongoDB is running (for local): `mongosh` or `mongo`
2. Verify connection string in `.env`
3. Check IP whitelist in MongoDB Atlas (if using cloud)
4. Ensure network access is allowed

### Issue: CORS Error in Browser

**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: 
- Check `CLIENT_URL` in `server/.env` matches your frontend URL (http://localhost:3000)
- Restart backend server

### Issue: Frontend Shows Blank Page

**Problem**: Routes not working, blank white screen

**Solutions**:
1. Check browser console for errors (F12)
2. Verify `REACT_APP_PORT` and `REACT_APP_API_URL` in `.env`
3. Clear browser cache: Ctrl+Shift+Delete
4. Restart dev server: Ctrl+C and `npm start` again

### Issue: Can't Login After Registration

**Problem**: 400 error on login

**Solutions**:
1. Check email is correct (case-insensitive)
2. Ensure password is at least 6 characters
3. Check email didn't already exist
4. Verify backend is running

---

## Development Mode Tips

### Enable Verbose Logging

Edit `server/src/server.js`:
```javascript
// Set NODE_ENV=development to see request logs
if (config.NODE_ENV === 'development') {
    console.log('Request:', req.method, req.path, req.body);
}
```

### Auto-Reload on Code Changes

Both `npm run dev` (backend) and `npm start` (frontend) watch files automatically.

### Debug API Calls

Open browser DevTools (F12) → Network tab to see all HTTP requests/responses.

### Reset Database

```bash
# Delete all collections (careful!)
# In MongoDB shell:
db.dropDatabase()

# Then re-seed:
npm run seed
```

---

## Project Structure Reference

```
SkillSwap-Plus/
├── server/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── user/       # Auth, profiles, sessions
│   │   │   ├── quality/    # Ratings, feedback, reputation
│   │   │   ├── community/  # Q&A forum
│   │   │   └── admin/      # Governance, reports
│   │   ├── middleware/     # Auth, error handling
│   │   ├── config/         # Database, settings
│   │   └── utils/          # Helpers, seeding
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   ├── components/     # Reusable components
│   │   ├── context/        # State management
│   │   ├── services/       # API client
│   │   └── App.jsx         # Route definitions
│   └── package.json
│
├── IMPLEMENTATION_GUIDE.md  # Detailed architecture
├── SETUP.md                 # This file
└── README.md                # Project overview
```

---

## Available Scripts

### Backend (server/)
```bash
npm start          # Start server
npm run dev        # Start with auto-reload (development)
npm run seed       # Seed database with test data
npm test           # Run tests (if available)
npm run lint       # Check code quality (if available)
```

### Frontend (client/)
```bash
npm start          # Start dev server (port 3000)
npm run build      # Build for production
npm test           # Run tests (if available)
npm run eject      # Expose webpack config (not recommended)
```

### Root
```bash
npm run install-all # Install dependencies for both
```

---

## Next: Feature Implementation

This starter includes the core structure. To add features:

1. **Create Backend**: Add model → routes → controller → service
2. **Create Frontend**: Add page → integrate API → add forms

Example: Add new "Skill Tracker" module:
```
server/src/modules/tracker/
├── tracker.model.js        # Mongoose schema
├── tracker.controller.js    # Route handlers
├── tracker.routes.js        # Express routes
├── tracker.service.js       # Business logic
└── tracker.test.js          # Tests (optional)

client/src/
├── pages/SkillTracker.jsx   # Page component
├── components/TrackerCard.jsx
└── services/trackerApi.js   # API calls
```

---

## Production Deployment

### Backend Deployment (Heroku/Railway)

1. Create account on Heroku or Railway
2. Connect GitHub repo
3. Set environment variables in dashboard
4. Deploy with: `git push heroku main`

### Frontend Deployment (Vercel)

1. Create account on Vercel
2. Import GitHub repo
3. Set `REACT_APP_API_URL` to your backend URL
4. Vercel auto-deploys on push

### MongoDB Atlas (Cloud)

1. Create cluster at mongodb.com/atlas
2. Whitelist your IP
3. Generate connection string
4. Add to production `.env`

---

## Debugging Checklist

- [ ] Both servers running? (npm run dev + npm start)
- [ ] MongoDB connected? (check backend logs)
- [ ] Environment files correct? (check .env in both folders)
- [ ] API reachable? (visit http://localhost:5001/health)
- [ ] Frontend loads? (visit http://localhost:3000)
- [ ] Can login? (test with seed credentials)
- [ ] Browser console clear? (F12 → Console)
- [ ] Network tab shows 200 responses? (F12 → Network)

---

## Support Resources

- **Backend Issues**: Check `server/src/` logs
- **Frontend Issues**: Check browser DevTools (F12)
- **MongoDB Issues**: Check Atlas dashboard or local mongo status
- **API Issues**: Test with cURL or Postman:
  ```bash
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@skillswap.edu","password":"Admin@123"}'
  ```

---

**Ready to go!** 🚀 Enjoy building with SkillSwap+!
