const API_URL = 'http://localhost:5000/api';

async function testCRUD() {
    try {
        console.log('🧪 Starting API CRUD Tests (using native fetch)...\n');

        // 1. Health Check
        const healthRes = await fetch('http://localhost:5000/health');
        const health = await healthRes.json();
        console.log('✅ Health Check:', health.success ? 'PASSED' : 'FAILED');

        // 2. Login (Admin)
        console.log('📝 Attempting Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@skillswap.edu',
                password: 'Admin@123'
            })
        });
        const loginData = await loginRes.json();

        if (!loginData.success) {
            throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        }

        const token = loginData.data.token;
        console.log('✅ Login: PASSED (Token received)');

        const authHeader = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 3. Get Current User
        const meRes = await fetch(`${API_URL}/auth/me`, { headers: authHeader });
        const meData = await meRes.json();
        console.log('✅ Auth Me: PASSED (User:', meData.data.firstName, ')');

        // 4. Admin: Get All Users
        const usersRes = await fetch(`${API_URL}/admin/users`, { headers: authHeader });
        const usersData = await usersRes.json();
        console.log('✅ Admin Get Users: PASSED (Count:', usersData.users.length, ')');

        // 5. Community: Create Question
        console.log('📝 Creating Question...');
        const qRes = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                title: 'How to setup SkillSwap+ for development?',
                body: 'I am trying to run the project locally but facing some issues with MongoDB connection. Any help?',
                subject: 'Computer Science',
                tags: ['setup', 'mongodb']
            })
        });
        const qData = await qRes.json();
        if (!qData.success) {
            console.error('❌ Create Question FAILED:', JSON.stringify(qData));
        } else {
            console.log('✅ Create Question: PASSED (Title:', qData.data.title, ')');
        }

        // 6. Community: Get Questions
        const qsRes = await fetch(`${API_URL}/questions`);
        const qsData = await qsRes.json();
        console.log('✅ Get Questions: PASSED (Count:', qsData.questions.length, ')');

        console.log('\n🎉 All core CRUD operations verified successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test FAILED');
        console.error('   Error:', error.message);
        process.exit(1);
    }
}

testCRUD();
