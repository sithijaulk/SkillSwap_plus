# SkillSwap+ 🎓 - University Skill Sharing & Learning Platform

**A complete MERN application for peer learning, mentoring, and academic community engagement.**

**Status**: ✅ Production-Ready Architecture | Backend 100% | Frontend Foundation Complete

---

## 📋 What is SkillSwap+?

SkillSwap+ is a campus-based platform where university students can:
- **Learners**: Find verified mentors, book sessions, ask academic questions, track progress
- **Mentors**: Offer skills, set availability, conduct sessions, build reputation
- **Admins**: Verify mentors, moderate content, resolve disputes, manage system settings
- **Community**: Share knowledge through Q&A forums with moderation

---
## 🛠️ Tech Stack

**Frontend**:
- React 18.2 + React Router 6 (SPA with protected routes)
- Tailwind CSS 3 (responsive design)
- Axios (API client with JWT interceptor)
- Context API (authentication state)

**Backend**:
- Node.js + Express.js
- MongoDB + Mongoose (13 models, proper indexing)
- JWT (stateless authentication)
- Express-Validator (request validation)
- CORS (configured for localhost + production)

**Infrastructure**:
- Development: npm scripts with auto-reload
- Database: MongoDB Atlas (recommended) or local
- Seeding: Test data auto-generated

---
## 🔑 Key Features Explained

### Module 1: User & Sessions
- **Registration**: Learners & Mentors with role selection
- **Mentors**: Set skills, hourly rate, availability slots
- **Sessions**: Lifecycle: pending → accepted → scheduled → completed
- **Payment**: Simulated payment for paid sessions
- **Progress**: Track skills learned per session

### Module 2: Quality & Reputation
- **Ratings**: 5-star rating + detailed feedback (post-session)
- **One Rating Per Session**: Enforced at database level
- **Feedback Tags**: Pre-defined categories ("clear-explanations", "patient", etc.)
- **Reputation Score**: Formula using rating avg + completion rate + response time
- **Improvement Suggestions**: Rule-based, explainable recommendations

### Module 3: Community Q&A
- **Ask Questions**: Verified users post academic questions
- **Answer & Vote**: Multiple answers with voting
- **Moderation**: Flag inappropriate content, auto-hide after 3 reports
- **Accept Answer**: Question author marks solution
- **Suggest Edits**: Approval workflow for improvements

### Module 4: Admin & Governance
- **Mentor Verification**: Queue-based verification workflow
- **Report Management**: Track, assign, resolve issues
- **Dispute Resolution**: Status trail (Open → Investigating → Resolved)
- **Audit Logging**: All admin actions tracked
- **System Settings**: Central configuration (cancellation windows, rate limits, etc.)

---

## 🔐 Security

- ✅ JWT authentication (7-day expiration)
- ✅ Password hashing (bcryptjs)
- ✅ Role-based access control (3 roles)
- ✅ Request validation (express-validator)
- ✅ CORS enabled (localhost:3000)
- ✅ Audit logging for admin actions

---
Built with Group members for university students
- Sithija
- Vihanga
- Suresh
- Chamodi

![home_page_preview_1775027168511](https://github.com/user-attachments/assets/db1cbae8-6caa-42e7-8d65-71c90b310348)


