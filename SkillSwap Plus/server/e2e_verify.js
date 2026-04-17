const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5001;

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject({ status: res.statusCode, data: parsed });
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testE2E() {
    try {
        console.log('🚀 Starting end-to-end verification (Native)...\n');

        // 1. Admin Login
        console.log('👤 Logging in as Admin (admin@skillswapplus.lk)...');
        const adminLogin = await request('POST', '/auth/login', {
            email: 'admin@skillswapplus.lk',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;
        console.log('✅ Admin logged in\n');

        // 2. Register/Login Learner
        console.log('👤 Handling Learner Account...');
        let learnerToken;
        try {
            const learnerReg = await request('POST', '/auth/register', {
                firstName: 'Jane',
                lastName: 'Learner',
                email: 'learner@test.com',
                password: 'Password123',
                role: 'learner',
                phone: '1234567890'
            });
            learnerToken = learnerReg.data.token;
            console.log('✅ Learner registered');
        } catch (err) {
            if (err.data?.message?.includes('already registered')) {
                const learnerLogin = await request('POST', '/auth/login', {
                    email: 'learner@test.com',
                    password: 'Password123'
                });
                learnerToken = learnerLogin.data.token;
                console.log('✅ Learner logged in (existing)');
            } else {
                throw err;
            }
        }

        // 3. Register/Login Mentor
        console.log('\n👤 Handling Mentor Account...');
        let mentorId;
        try {
            const mentorReg = await request('POST', '/auth/register', {
                firstName: 'Suresh',
                lastName: 'Dias',
                email: 'mentor@test.com',
                password: 'Password123',
                role: 'mentor',
                phone: '0987654321'
            });
            mentorId = mentorReg.data.user._id;
            console.log('✅ Mentor registered');
        } catch (err) {
             if (err.data?.message?.includes('already registered')) {
                const mentorLogin = await request('POST', '/auth/login', {
                    email: 'mentor@test.com',
                    password: 'Password123'
                });
                mentorId = mentorLogin.data.user._id;
                console.log('✅ Mentor logged in (existing)');
            } else {
                throw err;
            }
        }

        // 4. Admin: Promote Mentor to Professional
        console.log(`\n🆙 Admin: Promoting mentor ${mentorId} to Professional...`);
        await request('PUT', `/admin/users/${mentorId}/promote-professional`, {}, adminToken);
        console.log('✅ Mentor promoted to Professional');

        // 5. Community: Create Topic Channel Post
        console.log('\n🌐 Community: Creating a Topic Channel post...');
        const questionRes = await request('POST', '/questions', {
            title: 'How to learn Advanced AI Architecture?',
            body: 'Looking for a structured roadmap for LLMs, Agents, and RAG systems including deployment strategies.',
            subject: 'programming',
            topicChannel: 'Skill Exchange'
        }, learnerToken);
        console.log(`✅ Question created with Topic: ${questionRes.data.topicChannel}`);

        console.log('\n🎉 End-to-end verification completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Verification failed:', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

testE2E();
