# SkillSwap+ API Quick Reference

**Base URL**: http://localhost:5001/api  
**Format**: JSON  
**Auth**: Bearer token in Authorization header

---

## Authentication

### Register
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "suresh",
    "lastName": "Dias",
    "email": "suresh@example.com",
    "password": "Password123",
    "role": "learner"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "firstName": "suresh", "role": "learner" },
    "token": "eyJhbGc..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "learner@example.com",
    "password": "Password123"
  }'
```

### Get Current User
```bash
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Users

### Get All Mentors (with filters)
```bash
curl "http://localhost:5001/api/users/mentors?skill=JavaScript&minRating=4" \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Profile
```bash
curl http://localhost:5001/api/users/profile/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:5001/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Passionate learner",
    "university": "Tech University"
  }'
```

### Update Skills (Mentor Only)
```bash
curl -X PUT http://localhost:5001/api/users/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {
        "name": "JavaScript",
        "category": "programming",
        "proficiencyLevel": "expert",
        "description": "Full-stack JS dev"
      }
    ],
    "hourlyRate": 20
  }'
```

---

## Sessions

### Create Session (Learner)
```bash
curl -X POST http://localhost:5001/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mentor": "MENTOR_ID",
    "skill": "JavaScript",
    "topic": "React Hooks",
    "description": "Want to learn modern React",
    "sessionType": "paid",
    "scheduledDate": "2026-03-15T14:00:00Z",
    "duration": 60,
    "amount": 50
  }'
```

### Get Session Details
```bash
curl http://localhost:5001/api/sessions/SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### List User's Sessions
```bash
curl "http://localhost:5001/api/sessions?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

### Update Session Status (Mentor/Learner)
```bash
curl -X PUT http://localhost:5001/api/sessions/SESSION_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```

### Cancel Session
```bash
curl -X PUT http://localhost:5001/api/sessions/SESSION_ID/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Emergency" }'
```

### Update Payment Status
```bash
curl -X PUT http://localhost:5001/api/sessions/SESSION_ID/payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "paymentStatus": "paid" }'
```

---

## Availability (Mentor Only)

### Create Availability
```bash
curl -X POST http://localhost:5001/api/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "Monday",
    "startTime": "14:00",
    "endTime": "18:00",
    "isActive": true
  }'
```

### Batch Create (Multiple Slots)
```bash
curl -X POST http://localhost:5001/api/availability/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slots": [
      { "dayOfWeek": "Monday", "startTime": "14:00", "endTime": "18:00" },
      { "dayOfWeek": "Wednesday", "startTime": "15:00", "endTime": "19:00" }
    ]
  }'
```

### Get Mentor's Available Slots
```bash
curl "http://localhost:5001/api/availability/mentor/MENTOR_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Slots for Specific Date
```bash
curl "http://localhost:5001/api/availability/slots/MENTOR_ID/2026-03-15" \
  -H "Authorization: Bearer $TOKEN"
```

### Update Availability
```bash
curl -X PUT http://localhost:5001/api/availability/SLOT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "endTime": "19:00" }'
```

### Delete Availability
```bash
curl -X DELETE http://localhost:5001/api/availability/SLOT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Ratings & Quality

### Submit Rating (After Session Completion)
```bash
curl -X POST http://localhost:5001/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "SESSION_ID",
    "rater": "LEARNER_ID",
    "ratee": "MENTOR_ID",
    "overallRating": 5,
    "knowledgeRating": 5,
    "communicationRating": 4,
    "professionalismRating": 5,
    "preparednessRating": 4,
    "review": "Excellent and engaging session!",
    "tags": ["clear-explanations", "patient", "professional"],
    "wouldRecommend": true
  }'
```

### Get Mentor's Ratings
```bash
curl http://localhost:5001/api/ratings/user/MENTOR_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Submit Feedback
```bash
curl -X POST http://localhost:5001/api/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "SESSION_ID",
    "type": "learner-to-mentor",
    "whatWentWell": "Great explanations",
    "whatCouldImprove": "Could have more examples",
    "tags": ["clear-explanations"],
    "isSessionCompleted": true
  }'
```

### Get Reputation Score
```bash
curl http://localhost:5001/api/reputation/MENTOR_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Get Improvement Suggestions
```bash
curl http://localhost:5001/api/improvements \
  -H "Authorization: Bearer $TOKEN"
```

---

## Community Q&A

### Get All Questions
```bash
curl "http://localhost:5001/api/questions?page=1&limit=10&sort=-createdAt" \
  -H "Authorization: Bearer $TOKEN"
```

### Create Question
```bash
curl -X POST http://localhost:5001/api/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to use React Hooks?",
    "body": "I want to understand useState and useEffect...",
    "tags": ["react", "javascript", "hooks"],
    "subject": "Programming"
  }'
```

### Get Question Details
```bash
curl http://localhost:5001/api/questions/QUESTION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Vote on Question (Upvote: 1, Downvote: -1)
```bash
curl -X POST http://localhost:5001/api/questions/QUESTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "voteType": 1 }'
```

### Create Answer
```bash
curl -X POST http://localhost:5001/api/answers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "QUESTION_ID",
    "body": "You can use useState to manage state in functional components..."
  }'
```

### Vote on Answer
```bash
curl -X POST http://localhost:5001/api/answers/ANSWER_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "voteType": 1 }'
```

### Accept Answer as Solution (Question Author Only)
```bash
curl -X POST http://localhost:5001/api/answers/ANSWER_ID/accept \
  -H "Authorization: Bearer $TOKEN"
```

### Flag Content (Report)
```bash
curl -X POST http://localhost:5001/api/community/flag \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "question",
    "contentId": "QUESTION_ID",
    "reason": "Inappropriate content"
  }'
```

---

## Admin Only

### Get All Users
```bash
curl "http://localhost:5001/api/admin/users?role=mentor&status=pending-verification" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Verify Mentor
```bash
curl -X PUT http://localhost:5001/api/admin/verify-mentor/MENTOR_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "isVerified": true }'
```

### Update User Status (Suspend/Activate)
```bash
curl -X PUT http://localhost:5001/api/admin/users/USER_ID/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false, "reason": "Violation of community guidelines" }'
```

### Create Report
```bash
curl -X POST http://localhost:5001/api/admin/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportedUser": "USER_ID",
    "type": "user-misconduct",
    "subject": "Rude behavior",
    "description": "User was hostile during session..."
  }'
```

### Get All Reports (Admin)
```bash
curl "http://localhost:5001/api/admin/reports?status=pending&priority=high" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Update Report Status
```bash
curl -X PUT http://localhost:5001/api/admin/reports/REPORT_ID/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "under-review" }'
```

### Resolve Report
```bash
curl -X PUT http://localhost:5001/api/admin/reports/REPORT_ID/resolve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "warning-issued",
    "adminNotes": "First offense, user warned"
  }'
```

### Get Dashboard Stats
```bash
curl http://localhost:5001/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### View Audit Logs
```bash
curl "http://localhost:5001/api/admin/audit-logs?action=user-verified&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get System Settings
```bash
curl http://localhost:5001/api/admin/settings \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Update System Setting
```bash
curl -X PUT http://localhost:5001/api/admin/settings/CANCELLATION_WINDOW_HOURS \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "value": 48 }'
```

---

## Error Responses

**Standard Error Format**:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "msg": "Field validation error" }
  ]
}
```

**Common Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (role check failed)
- `404` - Not found
- `500` - Server error

---

## Testing Tips

1. **Save token to variable**:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"learner@example.com","password":"Password123"}' \
     | jq -r '.data.token')
   echo $TOKEN
   ```

2. **Use Postman**: Import requests from examples above

3. **Use VS Code REST Client**: Install extension, create `.rest` file

4. **Check responses**: Pipe to `jq` for pretty JSON:
   ```bash
   curl ... | jq '.'
   ```

---

**Ready to test?** Pick an endpoint and try it!
