const config = require('../../config');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseJsonObject = (value) => {
    const text = (value || '').toString();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start < 0 || end < 0 || end < start) return null;

    try {
        return JSON.parse(text.slice(start, end + 1));
    } catch (error) {
        return null;
    }
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

const normalizeStringArray = (value, fallback) => {
    if (!Array.isArray(value)) return fallback;
    const list = value
        .map((item) => (item || '').toString().trim())
        .filter(Boolean)
        .slice(0, 6);

    return list.length ? list : fallback;
};

class MentorEvaluationService {
    ruleScoreFromText(text, maxScore, keywordList = []) {
        const normalized = (text || '').toString().trim();
        if (!normalized) return 0;

        const wordCount = normalized.split(/\s+/).filter(Boolean).length;
        const lengthRatio = clamp(wordCount / 180, 0, 1);

        const lower = normalized.toLowerCase();
        const keywordHits = keywordList.reduce((sum, keyword) => {
            return sum + (lower.includes(keyword.toLowerCase()) ? 1 : 0);
        }, 0);
        const keywordRatio = keywordList.length > 0
            ? clamp(keywordHits / keywordList.length, 0, 1)
            : 0.5;

        const weighted = (lengthRatio * 0.7) + (keywordRatio * 0.3);
        return Number((weighted * maxScore).toFixed(2));
    }

    buildFallbackEvaluation(report) {
        const teachingKeywords = ['pedagogy', 'strategy', 'interactive', 'assessment', 'feedback', 'outcomes'];
        const courseKeywords = ['exercise', 'assignment', 'rubric', 'milestone', 'project', 'progress'];
        const materialKeywords = ['slides', 'worksheet', 'pdf', 'video', 'examples', 'references'];

        const teachingScore = this.ruleScoreFromText(report.teachingMethodology, 40, teachingKeywords);
        const courseWorkScore = this.ruleScoreFromText(
            `${report.courseWorkDescription || ''} ${report.learnerProgressObservations || ''}`,
            30,
            courseKeywords
        );

        const materialUrlBonus = clamp((report.attachedMaterialUrls || []).length * 1.2, 0, 5);
        const materialsBaseScore = this.ruleScoreFromText(report.lectureMaterialsSummary, 25, materialKeywords);
        const materialsScore = Number(clamp(materialsBaseScore + materialUrlBonus, 0, 30).toFixed(2));

        const overallScore = Number(((teachingScore * 0.4) + (courseWorkScore * 0.3) + (materialsScore * 0.3)).toFixed(2));
        const mpsContribution = Number(clamp((overallScore / 100) * 5, 0, 5).toFixed(2));

        return {
            teachingScore,
            courseWorkScore,
            materialsScore,
            overallScore,
            mpsContribution,
            strengths: normalizeStringArray([
                teachingScore >= 28 ? 'Strong teaching methodology and instructional structure.' : '',
                courseWorkScore >= 21 ? 'Coursework demonstrates meaningful learner engagement.' : '',
                materialsScore >= 21 ? 'Material support is practical and relevant for learners.' : '',
            ], ['Mentor shows commitment to structured program delivery.']),
            improvementAreas: normalizeStringArray([
                teachingScore < 24 ? 'Expand methodology detail with measurable teaching outcomes.' : '',
                courseWorkScore < 18 ? 'Add more concrete coursework evidence and learner milestones.' : '',
                materialsScore < 18 ? 'Increase quality and diversity of supporting materials.' : '',
            ], ['Continue improving report specificity and measurable learner outcomes.']),
            detailedFeedback: 'AI fallback evaluation was used. Provide additional measurable teaching outcomes, coursework artifacts, and evidence of learner progress for stronger scoring.',
            evaluatedBy: 'ai-fallback',
            evaluatedAt: new Date(),
        };
    }

    normalizeAiEvaluation(raw) {
        const teachingScore = Number(clamp(Number(raw?.teachingScore || 0), 0, 40).toFixed(2));
        const courseWorkScore = Number(clamp(Number(raw?.courseWorkScore || 0), 0, 30).toFixed(2));
        const materialsScore = Number(clamp(Number(raw?.materialsScore || 0), 0, 30).toFixed(2));

        const overallScore = Number(((teachingScore * 0.4) + (courseWorkScore * 0.3) + (materialsScore * 0.3)).toFixed(2));
        const mpsContribution = Number(clamp((overallScore / 100) * 5, 0, 5).toFixed(2));

        return {
            teachingScore,
            courseWorkScore,
            materialsScore,
            overallScore,
            mpsContribution,
            strengths: normalizeStringArray(raw?.strengths, ['Good instructional intent with room for deeper evidence.']),
            improvementAreas: normalizeStringArray(raw?.improvementAreas, ['Provide more specific measurable teaching outcomes.']),
            detailedFeedback: (raw?.detailedFeedback || 'Structured evaluation generated by academic AI agent.').toString(),
            evaluatedBy: 'ai-gemini',
            evaluatedAt: new Date(),
        };
    }

    async evaluateMentorReport(report) {
        if (!report) {
            throw new Error('Report is required for AI evaluation');
        }

        if (!config.GEMINI_API_KEY) {
            return this.buildFallbackEvaluation(report);
        }

        const timeoutMs = Number(config.AI_GRADING_TIMEOUT_MS) || 30000;
        const mentorName = `${report?.mentor?.firstName || ''} ${report?.mentor?.lastName || ''}`.trim() || 'Mentor';

        const prompt = [
            'You are evaluating a mentor program report for SkillSwap Plus Academic Supervision.',
            'Apply this strict rubric:',
            '- teachingScore: 0-40 (methodology depth, pedagogy quality, learner-centered design, measurable teaching strategy)',
            '- courseWorkScore: 0-30 (coursework rigor, relevance, progress tracking, assessment quality)',
            '- materialsScore: 0-30 (quality/clarity of lecture materials, practical usefulness, evidence coverage)',
            'Evaluate depth, specificity, professionalism, and learner-focus.',
            'Return STRICT JSON only with keys: teachingScore, courseWorkScore, materialsScore, strengths, improvementAreas, detailedFeedback.',
            'strengths and improvementAreas must be arrays of concise strings.',
            '',
            `Mentor: ${mentorName}`,
            `Program: ${report.programTitle || report?.program?.title || 'Program'}`,
            `Report Period: ${report.reportPeriod || 'N/A'}`,
            '',
            `teachingMethodology: ${report.teachingMethodology || ''}`,
            `courseWorkDescription: ${report.courseWorkDescription || ''}`,
            `lectureMaterialsSummary: ${report.lectureMaterialsSummary || ''}`,
            `learnerProgressObservations: ${report.learnerProgressObservations || ''}`,
            `challengesFaced: ${report.challengesFaced || ''}`,
            `improvementPlans: ${report.improvementPlans || ''}`,
            `attachedMaterialUrls: ${(report.attachedMaterialUrls || []).join(', ') || 'None'}`,
        ].join('\n');

        const modelName = config.GEMINI_GRADING_MODEL || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

        try {
            const response = await fetchWithTimeout(
                url,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: prompt }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 1200,
                        },
                    }),
                },
                timeoutMs
            );

            if (!response.ok) {
                return this.buildFallbackEvaluation(report);
            }

            const data = await response.json().catch(() => ({}));
            const text = data?.candidates?.[0]?.content?.parts
                ?.map((part) => part?.text || '')
                .join('\n')
                .trim();

            const parsed = parseJsonObject(text);
            if (!parsed) {
                return this.buildFallbackEvaluation(report);
            }

            return this.normalizeAiEvaluation(parsed);
        } catch (error) {
            return this.buildFallbackEvaluation(report);
        }
    }
}

module.exports = new MentorEvaluationService();
