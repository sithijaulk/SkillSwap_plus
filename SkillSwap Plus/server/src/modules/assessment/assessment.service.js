const crypto = require('crypto');
const config = require('../../config');
const Skill = require('../user/skill.model');
const Session = require('../user/session.model');
const User = require('../user/user.model');
const ProgramKnowledge = require('./programKnowledge.model');
const Assessment = require('./assessment.model');
const AssessmentQuestion = require('./assessmentQuestion.model');
const AssessmentTask = require('./assessmentTask.model');
const LearnerAttempt = require('./learnerAttempt.model');
const AssessmentReport = require('./assessmentReport.model');
const AssessmentGrade = require('./assessmentGrade.model');

const GRADE_BANDS = [
    { min: 90, grade: 'A' },
    { min: 75, grade: 'B' },
    { min: 60, grade: 'C' },
    { min: 50, grade: 'D' },
    { min: 0, grade: 'F' },
];

const normalize = (v) => (v || '').toString().trim().toLowerCase();
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const toId = (v) => v?.toString?.() || String(v || '');
const isObjectIdLike = (v) => /^[a-f\d]{24}$/i.test(toId(v));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const tokenize = (value) => normalize(value).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2);

const uniqueList = (arr) => [...new Set((arr || []).map((x) => (x || '').toString().trim()).filter(Boolean))];

const extractJsonObject = (value) => {
    const text = (value || '').toString();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0 || end < start) return null;

    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch {
        return null;
    }
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const normalizeMaterials = (value) => {
    let raw = value;

    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            raw = [raw];
        }
    }

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map((item) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                return {
                    title: (item.title || '').toString(),
                    type: (item.type || '').toString(),
                    url: (item.url || '').toString(),
                    filePath: (item.filePath || '').toString(),
                    description: (item.description || '').toString(),
                };
            }

            const text = (item || '').toString();
            if (!text.trim()) return null;

            return {
                title: 'Material',
                type: 'text',
                url: '',
                filePath: '',
                description: text,
            };
        })
        .filter(Boolean);
};

const extractTokens = (skill) => {
    const materials = normalizeMaterials(skill.materials).map((m) => `${m.title || ''} ${m.description || ''}`);
    const corpus = [skill.title, skill.category, skill.description, ...materials]
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 3);

    return [...new Set(corpus)].slice(0, 80);
};

const getGrade = (score) => GRADE_BANDS.find((b) => score >= b.min)?.grade || 'F';

const roleCheck = (role, allowed) => {
    if (!allowed.includes(role)) {
        throw new Error('Access denied');
    }
};

class AssessmentService {
    async upsertProgramKnowledgeFromSkill(skill) {
        const normalizedMaterials = normalizeMaterials(skill.materials);

        const knowledgePayload = {
            program: skill._id,
            mentor: skill.mentor,
            skillName: skill.title,
            category: skill.category,
            description: skill.description || '',
            materials: normalizedMaterials,
            knowledgeTokens: extractTokens(skill),
        };

        const knowledge = await ProgramKnowledge.findOneAndUpdate(
            { program: skill._id },
            { $set: knowledgePayload, $inc: { sourceVersion: 1 } },
            { new: true, upsert: true }
        );

        return knowledge;
    }

    async generateRuleBasedPool(skill) {
        const skillName = skill.title;
        const category = skill.category;
        const tokens = extractTokens(skill);
        const topTokens = tokens.slice(0, 10);

        const questions = [
            {
                questionType: 'mcq',
                difficulty: 'easy',
                competency: 'conceptual-basics',
                prompt: `Which statement best describes the core objective of ${skillName}?`,
                options: [
                    `Understanding and applying ${skillName} fundamentals`,
                    'Only memorizing definitions',
                    'Avoiding practical implementation',
                    'Learning unrelated frameworks only',
                ],
                correctAnswer: `Understanding and applying ${skillName} fundamentals`,
                keywords: [normalize(skillName), 'fundamentals', normalize(category)],
                points: 8,
            },
            {
                questionType: 'mcq',
                difficulty: 'medium',
                competency: 'problem-solving',
                prompt: `In a ${category} workflow, which approach is most suitable for improving reliability?`,
                options: [
                    'Skip testing and deploy immediately',
                    'Use iterative validation and measurable checks',
                    'Ignore edge cases',
                    'Avoid documentation',
                ],
                correctAnswer: 'Use iterative validation and measurable checks',
                keywords: [normalize(category), 'validation', 'reliability'],
                points: 10,
            },
            {
                questionType: 'mcq',
                difficulty: 'hard',
                competency: 'architecture-thinking',
                prompt: `When scaling ${skillName} solutions, what should be prioritized first?`,
                options: [
                    'Single large module with no separation',
                    'Modular design and observability',
                    'No performance metrics',
                    'Disable error handling',
                ],
                correctAnswer: 'Modular design and observability',
                keywords: ['modular', 'observability', normalize(skillName)],
                points: 12,
            },
            {
                questionType: 'short',
                difficulty: 'easy',
                competency: 'conceptual-basics',
                prompt: `Explain in 2-3 lines why ${skillName} is important for ${category}.`,
                correctAnswer: `${skillName} provides practical methods to solve ${category} problems through structured implementation.`,
                keywords: [normalize(skillName), normalize(category), 'implementation', 'problem'],
                points: 10,
            },
            {
                questionType: 'short',
                difficulty: 'medium',
                competency: 'material-comprehension',
                prompt: `Based on program materials, describe one best practice for ${skillName}.`,
                correctAnswer: `Use consistent architecture, validation, and iteration for ${skillName} delivery.`,
                keywords: ['best practice', 'validation', 'iteration', ...topTokens.slice(0, 2)],
                points: 12,
            },
            {
                questionType: 'short',
                difficulty: 'hard',
                competency: 'critical-thinking',
                prompt: `What risks can appear when ${skillName} is implemented without testing and feedback loops?`,
                correctAnswer: 'Potential risks include regressions, poor performance, and low reliability due to missing validation.',
                keywords: ['regression', 'performance', 'reliability', 'testing', 'feedback'],
                points: 14,
            },
        ];

        const tasks = [
            {
                taskType: normalize(category).includes('design') ? 'design' : 'implementation',
                difficulty: 'easy',
                competency: 'task-execution',
                prompt: `Create a mini practical exercise for ${skillName} that demonstrates one foundational concept from this program.`,
                expectedKeywords: [normalize(skillName), 'concept', 'implementation', 'steps'],
                testCases: [
                    { input: 'solution', expectedContains: 'implementation' },
                    { input: 'solution', expectedContains: normalize(skillName).split(' ')[0] || 'skill' },
                ],
                points: 20,
            },
            {
                taskType: normalize(category).includes('program') || normalize(skillName).includes('stack') ? 'coding' : 'analysis',
                difficulty: 'medium',
                competency: 'problem-solving',
                prompt: `Solve a scenario-based problem in ${skillName}. Include assumptions, approach, and expected outcome.`,
                expectedKeywords: ['approach', 'outcome', 'validation', normalize(skillName).split(' ')[0] || 'skill'],
                testCases: [
                    { input: 'solution', expectedContains: 'approach' },
                    { input: 'solution', expectedContains: 'outcome' },
                ],
                points: 25,
            },
            {
                taskType: 'analysis',
                difficulty: 'hard',
                competency: 'architecture-thinking',
                prompt: `Propose an advanced improvement plan for a ${skillName} implementation with scalability and quality metrics.`,
                expectedKeywords: ['scalability', 'metrics', 'quality', 'testing', 'monitoring'],
                testCases: [
                    { input: 'solution', expectedContains: 'scalability' },
                    { input: 'solution', expectedContains: 'metrics' },
                    { input: 'solution', expectedContains: 'quality' },
                ],
                points: 30,
            },
        ];

        return { questions, tasks };
    }

    async generateAiAugmentation(skill) {
        if (!config.GEMINI_API_KEY) {
            return { questions: [], tasks: [], aiEnhanced: false };
        }

        try {
            const prompt = `Generate JSON only with keys questions and tasks for a learning assessment. Skill: ${skill.title}. Category: ${skill.category}. Description: ${skill.description || ''}.`; 
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4 },
                }),
            });

            if (!response.ok) {
                return { questions: [], tasks: [], aiEnhanced: false };
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart < 0 || jsonEnd < 0) {
                return { questions: [], tasks: [], aiEnhanced: false };
            }

            const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
            const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
            const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

            return {
                questions,
                tasks,
                aiEnhanced: questions.length > 0 || tasks.length > 0,
            };
        } catch (error) {
            return { questions: [], tasks: [], aiEnhanced: false };
        }
    }

    async generateAssessment(programId, generatedBy, options = {}) {
        const skill = await Skill.findById(programId);
        if (!skill) throw new Error('Program not found');

        const knowledge = await this.upsertProgramKnowledgeFromSkill(skill);

        const activeAssessment = await Assessment.findOne({ program: programId, status: 'active' });
        if (activeAssessment && !options.forceRegenerate) {
            return activeAssessment;
        }

        if (activeAssessment && options.forceRegenerate) {
            activeAssessment.status = 'archived';
            await activeAssessment.save();
        }

        const latest = await Assessment.findOne({ program: programId }).sort({ version: -1 });
        const version = latest ? latest.version + 1 : 1;

        const basePool = await this.generateRuleBasedPool(skill);
        const aiPool = await this.generateAiAugmentation(skill);

        const assessment = await Assessment.create({
            program: programId,
            knowledgeBase: knowledge._id,
            generatedBy,
            version,
            generationMode: aiPool.aiEnhanced ? 'hybrid-ai' : 'rule-based',
            meta: {
                aiEnhanced: aiPool.aiEnhanced,
                promptHash: crypto.createHash('sha256').update(`${skill.title}:${skill.category}:${version}`).digest('hex').slice(0, 16),
            },
        });

        const mergedQuestions = [...basePool.questions, ...aiPool.questions]
            .filter((q) => q.prompt && q.correctAnswer)
            .map((q) => ({ ...q, assessment: assessment._id, program: programId }));

        const mergedTasks = [...basePool.tasks, ...aiPool.tasks]
            .filter((t) => t.prompt)
            .map((t) => ({ ...t, assessment: assessment._id, program: programId }));

        const createdQuestions = await AssessmentQuestion.insertMany(mergedQuestions);
        const createdTasks = await AssessmentTask.insertMany(mergedTasks);

        assessment.questionPoolCount = createdQuestions.length;
        assessment.taskPoolCount = createdTasks.length;
        await assessment.save();

        return assessment;
    }

    async ensureCompletedSession(learnerId, programId) {
        const program = await Skill.findById(programId).select('title mentor');
        if (!program) throw new Error('Program not found');

        const titlePattern = new RegExp(`^${program.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        const completed = await Session.findOne({
            learner: learnerId,
            status: 'completed',
            $or: [
                { program: programId },
                { $and: [{ mentor: program.mentor }, { skill: titlePattern }] },
                { $and: [{ mentor: program.mentor }, { topic: titlePattern }] },
            ],
        }).select('_id');

        if (!completed) {
            throw new Error('Assessment is available only after program completion');
        }

        return completed;
    }

    selectByDifficulty(items, distribution) {
        const pool = {
            easy: shuffle(items.filter((i) => i.difficulty === 'easy')),
            medium: shuffle(items.filter((i) => i.difficulty === 'medium')),
            hard: shuffle(items.filter((i) => i.difficulty === 'hard')),
        };

        const selected = [];
        ['easy', 'medium', 'hard'].forEach((level) => {
            const need = distribution[level] || 0;
            selected.push(...pool[level].slice(0, need));
        });

        if (selected.length < Object.values(distribution).reduce((s, n) => s + n, 0)) {
            const picked = new Set(selected.map((x) => toId(x._id)));
            const fallback = shuffle(items).filter((i) => !picked.has(toId(i._id)));
            selected.push(...fallback.slice(0, Math.max(0, Object.values(distribution).reduce((s, n) => s + n, 0) - selected.length)));
        }

        return shuffle(selected);
    }

    sanitizeAttemptForLearner(attempt) {
        return {
            _id: attempt._id,
            learner: attempt.learner,
            program: attempt.program,
            assessment: attempt.assessment,
            status: attempt.status,
            startedAt: attempt.startedAt,
            questionSet: (attempt.questionSet || []).map((q) => ({
                questionId: q.questionId,
                questionType: q.questionType,
                prompt: q.prompt,
                options: q.options,
                difficulty: q.difficulty,
                competency: q.competency,
                points: q.points,
            })),
            taskSet: (attempt.taskSet || []).map((t) => ({
                taskId: t.taskId,
                taskType: t.taskType,
                prompt: t.prompt,
                difficulty: t.difficulty,
                competency: t.competency,
                points: t.points,
            })),
        };
    }

    async getLearnerAssessment(learnerId, programId, requester) {
        if (requester.role === 'learner' && toId(requester._id) !== toId(learnerId)) {
            throw new Error('Access denied');
        }

        await this.ensureCompletedSession(learnerId, programId);

        let assessment = await Assessment.findOne({ program: programId, status: 'active' });
        if (!assessment) {
            assessment = await this.generateAssessment(programId, requester._id, { forceRegenerate: false });
        }

        const existing = await LearnerAttempt.findOne({ learner: learnerId, program: programId })
            .sort({ createdAt: -1 });

        if (existing && existing.status !== 'in_progress') {
            return {
                attempt: this.sanitizeAttemptForLearner(existing),
                alreadySubmitted: true,
                status: existing.status,
            };
        }

        if (existing && existing.status === 'in_progress') {
            return {
                attempt: this.sanitizeAttemptForLearner(existing),
                alreadySubmitted: false,
                status: existing.status,
            };
        }

        const [questionPool, taskPool] = await Promise.all([
            AssessmentQuestion.find({ assessment: assessment._id }),
            AssessmentTask.find({ assessment: assessment._id }),
        ]);

        const selectedQuestions = this.selectByDifficulty(questionPool, { easy: 2, medium: 3, hard: 2 });
        const selectedTasks = this.selectByDifficulty(taskPool, { easy: 1, medium: 1, hard: 1 });

        const attempt = await LearnerAttempt.create({
            learner: learnerId,
            program: programId,
            assessment: assessment._id,
            status: 'in_progress',
            questionSet: selectedQuestions.map((q) => ({
                questionId: q._id,
                questionType: q.questionType,
                prompt: q.prompt,
                options: q.options,
                difficulty: q.difficulty,
                competency: q.competency,
                points: q.points,
                answerKey: q.correctAnswer,
                keywords: q.keywords,
            })),
            taskSet: selectedTasks.map((t) => ({
                taskId: t._id,
                taskType: t.taskType,
                prompt: t.prompt,
                difficulty: t.difficulty,
                competency: t.competency,
                points: t.points,
                expectedKeywords: t.expectedKeywords,
                testCases: t.testCases,
            })),
        });

        return {
            attempt: this.sanitizeAttemptForLearner(attempt),
            alreadySubmitted: false,
            status: attempt.status,
        };
    }

    getAiProviderOrder() {
        const provider = normalize(config.AI_GRADING_PROVIDER || 'auto');

        if (provider === 'gemini' || provider === 'google') {
            return config.GEMINI_API_KEY ? ['gemini'] : [];
        }

        if (provider === 'openai' || provider === 'chatgpt') {
            return config.OPENAI_API_KEY ? ['openai'] : [];
        }

        const order = [];
        if (config.GEMINI_API_KEY) order.push('gemini');
        if (config.OPENAI_API_KEY) order.push('openai');
        return order;
    }

    buildGradingPrompt(payload) {
        const rubricKeywords = uniqueList(payload.keywords || []).slice(0, 20);
        const responseType = payload.responseType || 'short';

        return [
            'You are an expert academic assessor.',
            'Evaluate the learner answer and return STRICT JSON only.',
            'JSON format:',
            '{"scorePercent": number(0-100), "feedback": string, "matchedConcepts": string[], "missedConcepts": string[], "confidence": number(0-1)}',
            '',
            `Question type: ${responseType}`,
            `Difficulty: ${payload.difficulty || 'medium'}`,
            `Question prompt: ${payload.prompt || ''}`,
            `Expected answer / rubric: ${payload.expectedAnswer || ''}`,
            `Key concepts: ${rubricKeywords.join(', ') || 'N/A'}`,
            payload.extraRubric ? `Additional rubric checks: ${payload.extraRubric}` : '',
            `Learner answer: ${payload.answer || ''}`,
            '',
            'Scoring guidance:',
            '- Give partial credit when the learner includes key concepts even if wording is different.',
            '- Do not require exact wording match.',
            '- Penalize only when core concepts are missing or contradictory.',
            '- Keep feedback concise and actionable.',
        ].filter(Boolean).join('\n');
    }

    normalizeAiGrade(payload, rawResult) {
        if (!rawResult || typeof rawResult !== 'object') return null;

        const points = Number(payload.points || 0);
        if (!points) return null;

        let percent = Number(rawResult.scorePercent);
        if (!Number.isFinite(percent)) {
            const maybeRatio = Number(rawResult.scoreRatio);
            if (Number.isFinite(maybeRatio)) percent = maybeRatio <= 1 ? maybeRatio * 100 : maybeRatio;
        }

        if (!Number.isFinite(percent)) return null;

        const normalizedPercent = clamp(percent, 0, 100);
        const score = Math.round(points * (normalizedPercent / 100));
        const feedback = (rawResult.feedback || '').toString().trim();

        return {
            score,
            feedback: feedback || 'AI-assisted evaluation completed.',
            source: 'ai',
        };
    }

    computeFallbackSemanticGrade(payload) {
        const answer = normalize(payload.answer);
        const points = Number(payload.points || 0);

        if (!answer) {
            return { score: 0, feedback: payload.responseType === 'task' ? 'No task response submitted.' : 'No answer provided.', source: 'fallback' };
        }

        const expected = normalize(payload.expectedAnswer);
        const answerTokens = tokenize(answer);
        const expectedTokens = tokenize(expected);
        const keywordList = uniqueList(payload.keywords || []).map((k) => normalize(k)).filter(Boolean);

        const keywordHits = keywordList.filter((k) => answer.includes(k)).length;
        const keywordRatio = keywordList.length > 0 ? keywordHits / keywordList.length : 0.55;

        const answerTokenSet = new Set(answerTokens);
        const overlapCount = expectedTokens.filter((t) => answerTokenSet.has(t)).length;
        const expectedCoverage = expectedTokens.length > 0 ? overlapCount / expectedTokens.length : keywordRatio;

        const lengthTarget = payload.responseType === 'task' ? 40 : 20;
        const lengthRatio = Math.min(1, answerTokens.length / lengthTarget);

        let blended = (keywordRatio * 0.45) + (expectedCoverage * 0.4) + (lengthRatio * 0.15);

        if (expected && answer.includes(expected.slice(0, Math.min(70, expected.length)))) {
            blended = Math.max(blended, 0.9);
        }

        if (payload.responseType === 'task' && keywordRatio >= 0.5) {
            blended = Math.max(blended, 0.58);
        }

        if (payload.responseType === 'short' && keywordRatio >= 0.5 && expectedCoverage >= 0.3) {
            blended = Math.max(blended, 0.62);
        }

        const ratio = clamp(blended, 0, 1);
        const score = Math.round(points * ratio);

        return {
            score,
            feedback: ratio >= 0.8
                ? 'Strong answer with good concept coverage.'
                : ratio >= 0.55
                    ? 'Partially correct answer. Core ideas are present but can be improved.'
                    : 'Limited concept coverage. Review key concepts and retry.',
            source: 'fallback',
        };
    }

    async gradeWithGemini(payload) {
        if (!config.GEMINI_API_KEY) return null;

        const model = config.GEMINI_GRADING_MODEL || 'gemini-2.5-flash';
        const prompt = this.buildGradingPrompt(payload);

        const response = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json',
                    },
                }),
            },
            config.AI_GRADING_TIMEOUT_MS
        );

        if (!response.ok) return null;

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = extractJsonObject(text);
        return this.normalizeAiGrade(payload, parsed);
    }

    async gradeWithOpenAI(payload) {
        if (!config.OPENAI_API_KEY) return null;

        const model = config.OPENAI_GRADING_MODEL || 'gpt-4o-mini';
        const prompt = this.buildGradingPrompt(payload);

        const response = await fetchWithTimeout(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert academic assessor. Return only valid JSON.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                }),
            },
            config.AI_GRADING_TIMEOUT_MS
        );

        if (!response.ok) return null;

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';
        const parsed = extractJsonObject(text);
        return this.normalizeAiGrade(payload, parsed);
    }

    async gradeWithAI(payload) {
        const fallback = this.computeFallbackSemanticGrade(payload);
        const providers = this.getAiProviderOrder();

        for (const provider of providers) {
            try {
                const result = provider === 'gemini'
                    ? await this.gradeWithGemini(payload)
                    : await this.gradeWithOpenAI(payload);

                if (result) {
                    return result;
                }
            } catch {
                // Provider failure should never block assessment submission.
            }
        }

        return fallback;
    }

    async scoreShortAnswer(answer, question) {
        return this.gradeWithAI({
            responseType: 'short',
            prompt: question.prompt,
            answer,
            expectedAnswer: question.answerKey,
            keywords: question.keywords,
            points: question.points,
            difficulty: question.difficulty,
        });
    }

    async scoreTaskAnswer(answer, task) {
        const testCaseHints = (task.testCases || []).map((tc) => tc.expectedContains).filter(Boolean);
        const allKeywords = uniqueList([...(task.expectedKeywords || []), ...testCaseHints]);

        return this.gradeWithAI({
            responseType: 'task',
            prompt: task.prompt,
            answer,
            expectedAnswer: `Expected concepts: ${allKeywords.join(', ')}`,
            keywords: allKeywords,
            points: task.points,
            difficulty: task.difficulty,
            extraRubric: `Task type: ${task.taskType || 'analysis'}. Consider implementation depth, correctness, and practical reasoning.`,
        });
    }

    summarizeFeedback(score, strengths, weakAreas) {
        if (score >= 85) {
            return `Excellent performance. Strong mastery in ${strengths.slice(0, 2).join(', ') || 'core competencies'}. Continue advancing with hard-level tasks.`;
        }
        if (score >= 70) {
            return `Good progress with room for improvement. Strengths: ${strengths.slice(0, 2).join(', ') || 'core areas'}. Focus next on ${weakAreas.slice(0, 2).join(', ') || 'advanced problem solving'}.`;
        }
        return `Foundational gaps detected. Prioritize revision in ${weakAreas.slice(0, 2).join(', ') || 'core fundamentals'} and retry practice tasks incrementally.`;
    }

    async submitAssessment(learnerId, payload) {
        const { attemptId, questionResponses = [], taskResponses = [] } = payload || {};
        if (!attemptId) throw new Error('attemptId is required');

        const attempt = await LearnerAttempt.findById(attemptId)
            .populate('learner', 'firstName lastName')
            .populate('program', 'title mentor');

        if (!attempt) throw new Error('Attempt not found');
        if (toId(attempt.learner._id) !== toId(learnerId)) throw new Error('Access denied');
        if (attempt.status !== 'in_progress') throw new Error('This assessment attempt is already submitted');

        const questionResponseMap = new Map((questionResponses || []).map((r) => [toId(r.itemId || r.questionId), r.answer || '']));
        const taskResponseMap = new Map((taskResponses || []).map((r) => [toId(r.itemId || r.taskId), r.answer || '']));

        const unansweredQuestions = (attempt.questionSet || []).filter((q) => {
            const answer = questionResponseMap.get(toId(q.questionId)) || '';

            if (q.questionType === 'mcq') {
                const normalizedOptions = (q.options || []).map((opt) => normalize(opt));
                return !normalize(answer) || !normalizedOptions.includes(normalize(answer));
            }

            return !normalize(answer);
        });

        const unansweredTasks = (attempt.taskSet || []).filter((t) => {
            const answer = taskResponseMap.get(toId(t.taskId)) || '';
            return !normalize(answer);
        });

        if (unansweredQuestions.length > 0 || unansweredTasks.length > 0) {
            const validationError = new Error(
                `Please complete all assessment items before submitting. Missing: ${unansweredQuestions.length} question(s), ${unansweredTasks.length} task(s).`
            );
            validationError.statusCode = 400;
            throw validationError;
        }

        const scoredQuestionResponses = await Promise.all((attempt.questionSet || []).map(async (q) => {
            const answer = questionResponseMap.get(toId(q.questionId)) || '';

            if (q.questionType === 'mcq') {
                const isCorrect = normalize(answer) === normalize(q.answerKey);
                return {
                    itemId: q.questionId,
                    answer,
                    score: isCorrect ? q.points : 0,
                    maxScore: q.points,
                    feedback: isCorrect ? 'Correct answer.' : 'Incorrect answer.',
                };
            }

            const shortScore = await this.scoreShortAnswer(answer, q);
            return {
                itemId: q.questionId,
                answer,
                score: shortScore.score,
                maxScore: q.points,
                feedback: shortScore.feedback,
            };
        }));

        const scoredTaskResponses = await Promise.all((attempt.taskSet || []).map(async (t) => {
            const answer = taskResponseMap.get(toId(t.taskId)) || '';
            const taskScore = await this.scoreTaskAnswer(answer, t);

            return {
                itemId: t.taskId,
                answer,
                score: taskScore.score,
                maxScore: t.points,
                feedback: taskScore.feedback,
            };
        }));

        const qaScored = scoredQuestionResponses.reduce((sum, r) => sum + r.score, 0);
        const qaMax = scoredQuestionResponses.reduce((sum, r) => sum + r.maxScore, 0) || 1;
        const taskScored = scoredTaskResponses.reduce((sum, r) => sum + r.score, 0);
        const taskMax = scoredTaskResponses.reduce((sum, r) => sum + r.maxScore, 0) || 1;

        const qaScorePercent = Math.round((qaScored / qaMax) * 100);
        const taskScorePercent = Math.round((taskScored / taskMax) * 100);
        const weightedScore = Number((qaScorePercent * 0.4 + taskScorePercent * 0.6).toFixed(2));
        const grade = getGrade(weightedScore);

        const competencyStats = {};

        attempt.questionSet.forEach((q) => {
            const key = q.competency || 'core-understanding';
            competencyStats[key] = competencyStats[key] || { score: 0, max: 0 };
            const scored = scoredQuestionResponses.find((r) => toId(r.itemId) === toId(q.questionId));
            competencyStats[key].score += scored?.score || 0;
            competencyStats[key].max += q.points || 0;
        });

        attempt.taskSet.forEach((t) => {
            const key = t.competency || 'task-execution';
            competencyStats[key] = competencyStats[key] || { score: 0, max: 0 };
            const scored = scoredTaskResponses.find((r) => toId(r.itemId) === toId(t.taskId));
            competencyStats[key].score += scored?.score || 0;
            competencyStats[key].max += t.points || 0;
        });

        const strengthAreas = [];
        const weakAreas = [];
        Object.entries(competencyStats).forEach(([competency, stat]) => {
            const percent = stat.max > 0 ? (stat.score / stat.max) * 100 : 0;
            if (percent >= 75) strengthAreas.push(competency);
            if (percent < 50) weakAreas.push(competency);
        });

        const completionTimeMinutes = Math.max(1, Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 60000));
        const aiFeedbackSummary = this.summarizeFeedback(weightedScore, strengthAreas, weakAreas);

        attempt.questionResponses = scoredQuestionResponses;
        attempt.taskResponses = scoredTaskResponses;
        attempt.qaScorePercent = qaScorePercent;
        attempt.taskScorePercent = taskScorePercent;
        attempt.weightedScore = weightedScore;
        attempt.grade = grade;
        attempt.status = 'graded';
        attempt.submittedAt = new Date();
        attempt.completionTimeMinutes = completionTimeMinutes;

        const reportPayload = {
            learner: attempt.learner._id,
            mentor: attempt.program.mentor,
            program: attempt.program._id,
            assessment: attempt.assessment,
            attempt: attempt._id,
            learnerName: `${attempt.learner.firstName || ''} ${attempt.learner.lastName || ''}`.trim() || 'Learner',
            programName: attempt.program.title,
            score: weightedScore,
            qaScorePercent,
            taskScorePercent,
            grade,
            strengthAreas,
            weakAreas,
            taskPerformance: attempt.taskSet.map((t) => {
                const scored = scoredTaskResponses.find((r) => toId(r.itemId) === toId(t.taskId));
                return {
                    taskPrompt: t.prompt,
                    score: scored?.score || 0,
                    maxScore: t.points,
                    competency: t.competency,
                };
            }),
            completionTimeMinutes,
            aiFeedbackSummary,
        };

        const report = await AssessmentReport.findOneAndUpdate(
            { attempt: attempt._id },
            { $set: reportPayload },
            { new: true, upsert: true }
        );

        const gradeDoc = await AssessmentGrade.findOneAndUpdate(
            { report: report._id },
            {
                $set: {
                    learner: attempt.learner._id,
                    program: attempt.program._id,
                    report: report._id,
                    qaWeight: 40,
                    taskWeight: 60,
                    qaScorePercent,
                    taskScorePercent,
                    finalScore: weightedScore,
                    computedGrade: grade,
                    finalGrade: report.finalizedGrade || grade,
                    isFinalized: !!report.isFinalized,
                    finalizedBy: report.finalizedBy || null,
                    finalizedAt: report.finalizedAt || null,
                },
            },
            { new: true, upsert: true }
        );

        attempt.report = report._id;
        await attempt.save();

        return { attempt, report, grade: gradeDoc };
    }

    buildAnswerSheet(attempt) {
        if (!attempt) {
            return { questions: [], tasks: [] };
        }

        const questionResponseMap = new Map((attempt.questionResponses || []).map((r) => [toId(r.itemId), r]));
        const taskResponseMap = new Map((attempt.taskResponses || []).map((r) => [toId(r.itemId), r]));

        const questions = (attempt.questionSet || []).map((q) => {
            const scored = questionResponseMap.get(toId(q.questionId)) || {};
            return {
                itemId: q.questionId,
                questionType: q.questionType,
                prompt: q.prompt,
                difficulty: q.difficulty,
                competency: q.competency,
                maxScore: q.points || 0,
                answer: scored.answer || '',
                score: scored.score || 0,
                feedback: scored.feedback || '',
            };
        });

        const tasks = (attempt.taskSet || []).map((t) => {
            const scored = taskResponseMap.get(toId(t.taskId)) || {};
            return {
                itemId: t.taskId,
                taskType: t.taskType,
                prompt: t.prompt,
                difficulty: t.difficulty,
                competency: t.competency,
                maxScore: t.points || 0,
                answer: scored.answer || '',
                score: scored.score || 0,
                feedback: scored.feedback || '',
            };
        });

        return { questions, tasks };
    }

    maskReportForLearner(report) {
        const value = report?.toObject?.() || report;
        if (!value || value.isFinalized) return value;

        return {
            ...value,
            score: null,
            qaScorePercent: null,
            taskScorePercent: null,
            grade: null,
            finalizedGrade: null,
            taskPerformance: [],
            aiFeedbackSummary: 'Your answers are under supervisor review. Final score and grade will be published after finalization.',
            supervisorNotes: '',
            resultLocked: true,
            reviewStatus: 'pending_finalization',
        };
    }

    maskGradeForLearner(grade) {
        const value = grade?.toObject?.() || grade;
        if (!value || value.isFinalized) return value;

        return {
            ...value,
            qaScorePercent: null,
            taskScorePercent: null,
            finalScore: null,
            computedGrade: null,
            finalGrade: null,
            resultLocked: true,
        };
    }

    async getReport(learnerId, programId, requester) {
        const report = await AssessmentReport.findOne({ learner: learnerId, program: programId })
            .populate('program', 'title category')
            .populate('learner', 'firstName lastName email')
            .populate('mentor', 'firstName lastName')
            .sort({ createdAt: -1 });

        if (!report) throw new Error('Report not found');

        const grade = await AssessmentGrade.findOne({ report: report._id });
        const attempt = isObjectIdLike(report.attempt)
            ? await LearnerAttempt.findById(report.attempt).select('questionSet taskSet questionResponses taskResponses')
            : null;
        const answerSheet = this.buildAnswerSheet(attempt);

        if (requester?.role === 'learner') {
            const maskedReport = this.maskReportForLearner(report);
            const maskedGrade = this.maskGradeForLearner(grade);
            const showAnswerSheet = !!maskedReport?.isFinalized;

            return {
                report: maskedReport,
                grade: maskedGrade,
                answerSheet: showAnswerSheet ? answerSheet : null,
            };
        }

        return { report, grade, answerSheet };
    }

    async finalizeGrade({ reportId, learnerId, programId, finalGrade, supervisorNotes }, finalizedBy) {
        const query = reportId
            ? { _id: reportId }
            : { learner: learnerId, program: programId };

        const report = await AssessmentReport.findOne(query).sort({ createdAt: -1 });
        if (!report) throw new Error('Report not found');

        const selectedGrade = (finalGrade || report.grade || '').toUpperCase();
        if (!['A', 'B', 'C', 'D', 'F'].includes(selectedGrade)) {
            throw new Error('Invalid grade. Allowed grades: A, B, C, D, F');
        }

        report.isFinalized = true;
        report.finalizedBy = finalizedBy;
        report.finalizedAt = new Date();
        report.finalizedGrade = selectedGrade;
        report.supervisorNotes = supervisorNotes || '';
        await report.save();

        const gradeDoc = await AssessmentGrade.findOneAndUpdate(
            { report: report._id },
            {
                $set: {
                    finalGrade: selectedGrade,
                    isFinalized: true,
                    finalizedBy,
                    finalizedAt: new Date(),
                },
            },
            { new: true }
        );

        await LearnerAttempt.findByIdAndUpdate(report.attempt, { status: 'finalized' });

        return { report, grade: gradeDoc };
    }

    async getLearnerResults(learnerId) {
        const reports = await AssessmentReport.find({ learner: learnerId })
            .populate('program', 'title category')
            .populate('mentor', 'firstName lastName')
            .sort({ createdAt: -1 });

        return reports.map((report) => this.maskReportForLearner(report));
    }

    async getMentorInsights(mentorId) {
        const reports = await AssessmentReport.find({ mentor: mentorId })
            .populate('learner', 'firstName lastName')
            .populate('program', 'title category')
            .sort({ createdAt: -1 });

        const total = reports.length;
        const averageScore = total > 0
            ? Number((reports.reduce((sum, r) => sum + (r.score || 0), 0) / total).toFixed(2))
            : 0;

        const weakAreaFreq = {};
        reports.forEach((r) => {
            (r.weakAreas || []).forEach((area) => {
                weakAreaFreq[area] = (weakAreaFreq[area] || 0) + 1;
            });
        });

        const weakAreas = Object.entries(weakAreaFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([area, count]) => ({ area, count }));

        return {
            totalReports: total,
            averageScore,
            weakAreas,
            recentReports: reports.slice(0, 10),
        };
    }

    async getSupervisionReports() {
        const reports = await AssessmentReport.find({})
            .populate('learner', 'firstName lastName email')
            .populate('mentor', 'firstName lastName')
            .populate('program', 'title category')
            .sort({ isFinalized: 1, updatedAt: -1 })
            .limit(120);

        return reports;
    }

    async getSupervisionReportDetail(reportId) {
        const query = isObjectIdLike(reportId)
            ? { $or: [{ _id: reportId }, { attempt: reportId }] }
            : { _id: reportId };

        const report = await AssessmentReport.findOne(query)
            .populate('learner', 'firstName lastName email')
            .populate('mentor', 'firstName lastName')
            .populate('program', 'title category');

        if (!report) throw new Error('Report not found');

        const grade = await AssessmentGrade.findOne({ report: report._id });
        const attempt = isObjectIdLike(report.attempt)
            ? await LearnerAttempt.findById(report.attempt).select('questionSet taskSet questionResponses taskResponses')
            : null;
        const answerSheet = this.buildAnswerSheet(attempt);

        return { report, grade, answerSheet };
    }
}

module.exports = new AssessmentService();
