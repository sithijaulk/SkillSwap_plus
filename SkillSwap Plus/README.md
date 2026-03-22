# SkillSwap+ – University Skill Sharing Platform

SkillSwap+ is a premium, real-world SaaS platform designed for university students to share academic skills, collaborate on projects, and master new technologies through peer-to-peer mentorship.

## 🌟 Key Features

- **Role-Based Dashboards**: Specialized views for Learners, Mentors, Professionals, and Admins.
- **Glassmorphism UI**: High-end frosted glass aesthetic with modern animations.
- **Academic Market**: "Buy Now" for one-time resources or "Skill Share" for free peer learning.
- **Finance Engine**: Automated 25% platform fee calculation for sustainability.
- **Live Sessions**: One-click meeting access with real-time status tracking.
- **Community Forum**: Interaction hub with voting and discussions.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v16+)
- MongoDB (Atlas or Local)

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd skillswap-plus

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the `server` directory with the following:
```env
PORT=5001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 4. Database Seeding
Populate the system with initial administrative and academic data:
```bash
cd server
node src/seed.js
```

### 5. Run the Platform
```bash
# From the root directory
npm run dev
```

## 🔐 Administrative Access

After running the seed script, you can use the following credentials to access various roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@skillswap.plus` | `admin123` |
| **Mentor** | `mentor@skillswap.plus` | `admin123` |
| **Learner** | `learner@skillswap.plus` | `admin123` |
| **Professional** | `pro@skillswap.plus` | `admin123` |

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide Icons, Glassmorphism CSS.
- **Backend**: Node.js, Express, Mongoose.
- **Database**: MongoDB.
- **State/Auth**: Context API, JWT.

---
Built with for the academic community.
