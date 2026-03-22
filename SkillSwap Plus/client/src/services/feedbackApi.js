import api from './api';

export const submitSessionFeedback = (payload) => api.post('/feedback', payload);

export const getSessionFeedbackStatus = (sessionId) => api.get(`/feedback/session/${sessionId}`);

export const getMentorFeedback = () => api.get('/feedback/mentor');

const feedbackApi = {
  submitSessionFeedback,
  getSessionFeedbackStatus,
  getMentorFeedback,
};

export default feedbackApi;
