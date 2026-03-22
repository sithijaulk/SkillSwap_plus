## SkillSwap+ MERN Application - Complete Implementation Guide

### Project Structure

```
SkillSwap-Plus/
├── server/                      # Node.js/Express Backend
│   ├── src/
│   │   ├── app.js              # Express app configuration
│   │   ├── server.js           # Server entry point
│   │   ├── config/
│   │   │   ├── db.js          # MongoDB connection
│   │   │   └── index.js        # Configuration (PORT, JWT, CORS)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── role.middleware.js
│   │   ├── modules/
│   │   │   ├── user/           # Auth, User profiles, Skills
│   │   │   ├── community/      # Q&A, Questions, Answers
│   │   │   ├── quality/        # Ratings, Feedback, Improvements, Reputation
│   │   │   └── admin/          # Reports, Disputes, Analytics, AuditLog, SystemSettings
│   │   └── utils/
│   │       └── seed.js         # Database seeding
│   └── package.json
│
├── client/                      # React Frontend
│   ├── src/
│   │   ├── main.jsx            # Entry point with providers
│   │   ├── App.jsx             # Route definitions
│   │   ├── index.css           # Global styles (Tailwind)
│   │   ├── index.js            # React DOM render
│   │   ├── pages/
│   │   │   ├── Landing.jsx     # Public landing page
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── LearnerDashboard.jsx
│   │   │   │   ├── MentorDashboard.jsx
│   │   │   │   └── AdminDashboard.jsx
│   │   │   ├── profile/
│   │   │   │   └── UserProfile.jsx
│   │   │   ├── community/
│   │   │   │   ├── QuestionList.jsx
│   │   │   │   └── QuestionDetail.jsx
│   │   │   └── sessions/
│   │   │       ├── BookSession.jsx
│   │   │       └── MySessions.jsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   └── Modal.jsx
│   │   │   ├── forms/
│   │   │   │   └── Input.jsx
│   │   │   └── layout/
│   │   │       ├── Navbar.jsx
│   │   │       └── Footer.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state management
│   │   ├── routes/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── services/
│   │   │   └── api.js          # Axios instance with interceptors
│   │   └── utils/
│   │       └── helpers.js
│   └── package.json
│
├── README.md
├── package.json (root)
└── .env.example (template)
```

---

### Key Implementation Decisions & Business Rules

#### 1. Session Lifecycle (Module 1)
- **States**: `pending` → `accepted` → `scheduled` → `completed` / `cancelled`
- **Rules**:
  - Learner can only create session if mentor is verified
  - Paid sessions must have confirmed payment before moving to "scheduled"
  - Skill exchange sessions don't require payment verification
  - Session moves to "scheduled" once an availability slot is confirmed
  - Feedback/ratings allowed only after completion

#### 2. Mentor Verification (Module 1)
- Mentors can set skills, hourly rate, and availability
- Admin must verify mentors before they can accept sessions
- Only verified mentors appear in learner's mentor discovery

#### 3. Quality & Reputation (Module 2)
- **Reputation Score Formula**: `(avgRating * 0.5) + (completionRate * 0.3) + (responseTime * 0.2)`
- **One Rating Per Session**: Enforced at DB level with unique index
- **Feedback Tags**: Pre-defined categories (clear-explanations, on-time, patient, etc.)
- **Improvement Suggestions**: Rule-based (not AI-heavy):
  - If avgRating < 3.5 → suggest communication improvement
  - If completionRate < 80% → suggest reliability improvement
  - If responseTime > 24h → suggest availability improvement
- Mentors can mark suggestions as "applied"

#### 4. Community Q&A (Module 3)
- **Access**: Only verified users can post/answer
- **Moderation**:
  - Users can report content (flag)
  - Repeated reports (3+) auto-hide pending review
  - Admin can review and restore/remove
- **Answers**: Question owner can accept ONE answer as solution
- **Edits**: Require approval from answer author or admin

#### 5. Admin Governance (Module 4)
- **Audit Logging**: All admin actions (verifications, removals, dispute resolutions) logged
- **Disputes**: Session-specific complaints → Open → Investigating → Resolved/Rejected
- **Settings**: Centralized config system (cancellation windows, rate limits, etc.)
- **Reports**: Dashboard shows active users, sessions, popular skills, top mentors

---

### API Endpoints Summary

#### Authentication (Public)
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login
GET    /api/auth/me             # Get current user (private)
```

#### Users & Skills
```
GET    /api/users/profile/:id   # Get profile
PUT    /api/users/profile       # Update profile
GET    /api/users/mentors       # List mentors (with filters)
PUT    /api/users/skills        # Update skills (mentor only)
GET    /api/users/stats         # User statistics
```

#### Sessions & Availability
```
POST   /api/sessions            # Create session request
GET    /api/sessions/:id        # Get session details
GET    /api/sessions            # List user's sessions
PUT    /api/sessions/:id/status # Update status
PUT    /api/sessions/:id/cancel # Cancel session
PUT    /api/sessions/:id/payment # Update payment

POST   /api/availability        # Create availability
GET    /api/availability/mentor/:id # Get mentor's open slots
PUT    /api/availability/:id    # Update
DELETE /api/availability/:id    # Delete
```

#### Quality & Ratings
```
POST   /api/ratings             # Submit rating (post-session)
GET    /api/ratings/user/:id    # Get mentor's ratings
GET    /api/reputation/:id      # Get reputation metrics

POST   /api/feedback            # Submit feedback
GET    /api/feedback/user/:id   # Get feedback received
PUT    /api/feedback/:id/acknowledge

GET    /api/improvements        # List improvement suggestions
PUT    /api/improvements/:id    # Mark as applied
```

#### Community Q&A
```
GET    /api/questions           # List questions
POST   /api/questions           # Ask question (verified only)
GET    /api/questions/:id       # Get details
PUT    /api/questions/:id       # Update (author only)
POST   /api/questions/:id/vote  # Vote

GET    /api/answers             # Related to question
POST   /api/answers             # Submit answer
PUT    /api/answers/:id         # Update (author only)
POST   /api/answers/:id/vote    # Vote
POST   /api/answers/:id/accept  # Accept (question author only)
POST   /api/answers/:id/comments # Add comment

POST   /api/community/flag      # Report content
```

#### Admin
```
GET    /api/admin/users         # List all users
PUT    /api/admin/verify/:id    # Verify mentor
PUT    /api/admin/users/:id/status # Suspend/activate

POST   /api/admin/reports       # Create report
GET    /api/admin/reports       # List reports (admin)
GET    /api/admin/reports/:id   # Get details
PUT    /api/admin/reports/:id/status # Update status
PUT    /api/admin/reports/:id/resolve # Resolve

GET    /api/admin/stats         # Dashboard metrics
GET    /api/admin/audit-logs    # Audit log viewer

GET    /api/admin/settings      # Get system settings
PUT    /api/admin/settings/:key # Update settings
```

---

### Environment Configuration

**server/.env**
```
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/skillswap-plus
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

**client/.env**
```
REACT_APP_PORT=5001
REACT_APP_API_URL=http://localhost:5001
```

---

### Running the Application

#### 1. Install Dependencies
```bash
# Install root dependencies
npm run install-all

# Or manually:
cd server && npm install
cd ../client && npm install
```

#### 2. Seed Database
```bash
cd server
npm run seed
```

This creates:
- **Admin**: admin@skillswap.edu / Admin@123
- **Sample Mentor**: mentor@example.com / Password123
- **Sample Learner**: learner@example.com / Password123

#### 3. Start Development Servers
```bash
# Terminal 1: Start Backend (port 5001)
cd server
PORT=5001 npm run dev

# Terminal 2: Start Frontend (port 3000)
cd client
REACT_APP_PORT=5001 npm start
```

The app will open at: **http://localhost:3000**

---

### Test Scenarios (End-to-End)

#### Scenario 1: Learner Books a Session
1. Register as learner (john@example.com)
2. Navigate to "Mentors" 
3. View mentor profile (John Mentor - JavaScript expert)
4. Click "Book Session"
5. Select skill: JavaScript, Topic: "React Basics"
6. Choose available time slot
7. Select session type: "Paid" or "Skill Exchange"
8. Complete booking → Session status: "Pending"
9. (Demo: Simulated mentor approval)
10. Session → "Accepted" → "Scheduled"

#### Scenario 2: Mentor Completes Session & Gets Feedback
1. Login as mentor
2. View "Upcoming Sessions"
3. Accept learner's request
4. Mark session as "Completed"
5. View "Ratings Tab"
6. See learner's feedback + tags
7. View reputation score updates

#### Scenario 3: Community Q&A
1. Login as any verified user
2. Go to "Community"
3. Post question: "How to handle state in React?"
4. (Other user) Answer the question
5. Question author accepts answer
6. Vote on helpful answers

#### Scenario 4: Admin Verifies Mentor
1. Login as admin
2. Dashboard → "Pending Mentors"
3. Review mentor profile
4. Click "Verify Mentor"
5. Mentor status changes to verified
6. Audit log records action

#### Scenario 5: Dispute Resolution
1. Learner files dispute for incomplete session
2. Admin sees in "Disputes Queue"
3. Admin reviews evidence
4. Admin resolves: "Refund issued"
5. Dispute status trail: Open → Investigating → Resolved

---

### Frontend Pages to Build (Beyond Basic Structure)

The following pages have skeleton routes but need full implementation:

1. **Learner Pages**:
   - Find Mentors (search, filter by skill/rating/availability)
   - Book Session (calendar picker, payment simulation)
   - My Sessions (list, details, reschedule, cancel)
   - Progress Tracker (milestones, checklist per skill)
   - Session Feedback Form (rating, tags, review)

2. **Mentor Pages**:
   - Availability Management (weekly grid, batch create)
   - Session Accept/Reject
   - Improvement Toolkit (view suggestions, mark applied)
   - Performance Metrics (ratings chart, completion rate)

3. **Community Pages**:
   - Question Feed (trending, filters, search)
   - Ask Question Form
   - Question Detail (answers, comments, vote, report)
   - Suggest Edit Dialog

4. **Admin Pages**:
   - User Management (list, search, suspend)
   - Mentor Verification Queue
   - Report Moderation (review, resolve, auto-hide)
   - Dispute Management (status trail, resolution)
   - Settings Panel (cancellation window, limits, thresholds)
   - Audit Log Viewer (filter, export)

---

### Key Files Modified/Created

**Backend (server/)**:
- ✅ `src/modules/user/session.model.js` - Added `sessionType` field
- ✅ `src/modules/quality/feedback.model.js` - Added `tags`, `isSessionCompleted`, `completionVerifiedAt`
- ✅ `src/modules/admin/auditlog.model.js` - Created (NEW)
- ✅ `src/modules/admin/systemsettings.model.js` - Created (NEW)

**Frontend (client/)**:
- ✅ `src/main.jsx` - Added AuthProvider + Router
- ✅ `src/App.jsx` - Added all routes with role-based access
- ✅ `src/index.js` - React entry point
- ✅ `src/pages/Landing.jsx` - Public landing page
- ✅ `src/context/AuthContext.jsx` - Auth state + login/register/logout
- ✅ `src/services/api.js` - Axios with auth interceptor
- ✅ `src/routes/ProtectedRoute.jsx` - Role-based route protection
- ✅ `src/components/layout/Navbar.jsx` - Navigation with role-aware menu
- ✅ `src/components/common/Button.jsx` - Reusable button component
- ✅ `src/pages/auth/Login.jsx` - Login with error handling
- ✅ `src/pages/auth/Register.jsx` - Register with role selector
- ✅ `src/pages/dashboard/{Learner,Mentor,Admin}*.jsx` - Basic dashboard stubs

---

### Next Steps for Production

1. **Complete Frontend Pages** - Implement remaining page components (see list above)
2. **Form Validation** - Add comprehensive client + server validation
3. **Error Handling** - Implement toast notifications, error boundaries
4. **Loading States** - Add skeletons, spinners
5. **Responsive Design** - Test mobile, tablet, desktop
6. **Testing** - Unit tests (Jest), E2E tests (Cypress)
7. **Code Splitting** - Implement lazy loading for routes
8. **State Management** - Consider Context vs Redux for complex state
9. **API Documentation** - Auto-gen with Swagger/OpenAPI
10. **Deployment** - Vercel (frontend), Heroku/Railway (backend)

---

### Troubleshooting

**Port 5000 blocked on macOS**: AirPlay uses port 5000. Use 5001 instead.
```bash
PORT=5001 npm run dev
```

**CORS errors**: Ensure `CLIENT_URL` in server config matches your frontend URL.

**JWT expired**: Check `JWT_EXPIRE` setting. Development typically uses "7d".

**Seed not working**: Ensure MongoDB is connected and user has write permissions.

---

### Support

For detailed implementation of individual components, refer to existing component files:
- `src/pages/auth/Login.jsx` - Example of API integration + error handling
- `src/context/AuthContext.jsx` - Example of state management + localStorage
- `src/components/layout/Navbar.jsx` - Example of conditional rendering by role
