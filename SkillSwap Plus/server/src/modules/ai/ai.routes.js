const express = require('express');
const config = require('../../config');

const router = express.Router();

router.post('/chat', async (req, res, next) => {
    try {
        const message = (req.body?.message || '').trim();
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        if (!config.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'Gemini API key is not configured on server'
            });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;
        const geminiPayload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ]
        };

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(geminiPayload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            let message = result?.error?.message || 'Failed to fetch from Gemini API';
            if (response.status === 403 && /leaked/i.test(message)) {
                message = 'Gemini API key is invalid or leaked. Please generate a new key.';
            }

            return res.status(response.status).json({
                success: false,
                message
            });
        }

        const text = result?.candidates?.[0]?.content?.parts
            ?.map((part) => part?.text || '')
            .join('')
            .trim();

        if (!text) {
            return res.status(502).json({
                success: false,
                message: 'Received empty response from Gemini API'
            });
        }

        return res.json({
            success: true,
            data: { text }
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
