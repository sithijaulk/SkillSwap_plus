import api from './api';

export const fetchPublicSkills = (params) => api.get('/skills', { params });

export const fetchMySkills = () => api.get('/mentors/me/skills');

export const addMySkill = (payload) => api.post('/mentors/me/skills', payload);

export const updateMySkill = (skillId, payload) => api.put(`/mentors/me/skills/${skillId}`, payload);

export const deleteMySkill = (skillId) => api.delete(`/mentors/me/skills/${skillId}`);

const skillsApi = {
  fetchPublicSkills,
  fetchMySkills,
  addMySkill,
  updateMySkill,
  deleteMySkill
};

export default skillsApi;
