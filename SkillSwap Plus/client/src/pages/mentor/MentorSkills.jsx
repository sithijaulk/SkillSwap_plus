import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Edit2, Video, FileText, X } from 'lucide-react';
import Modal from '../../components/common/Modal';

const MentorSkills = ({ onUpdate }) => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSkill, setNewSkill] = useState({
        title: '',
        description: '',
        category: 'programming',
        price: '',
        type: 'Skill Share',
        requiredKnowledge: '',
        materials: []
    });

    useEffect(() => {
        fetchMySkills();
    }, []);

    const fetchMySkills = async () => {
        try {
            const response = await api.get('/skills/my');
            if (response.data.success) {
                setSkills(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching my skills:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSkill = async (e) => {
        if (e) e.preventDefault();
        try {
            const skillData = {
                ...newSkill,
                type: newSkill.type === 'Buy Now' ? 'paid' : 'skill_exchange',
                price: newSkill.type === 'Skill Share' ? 0 : Number(newSkill.price)
            };
            const response = await api.post('/skills', skillData);
            if (response.data.success) {
                setSkills([...skills, response.data.data]);
                setIsAddModalOpen(false);
                setNewSkill({ title: '', description: '', category: 'programming', price: '', type: 'Skill Share', requiredKnowledge: '', materials: [] });
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error('Skill addition error:', error);
            const msg = error.response?.data?.message || 'Error adding skill';
            alert(`Error adding skill: ${msg}`);
        }
    };

    const handleDeleteSkill = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/skills/${id}`);
            setSkills(skills.filter(s => s._id !== id));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error deleting skill:', error);
            alert('Error deleting skill');
        }
    };

    const addMaterial = (type) => {
        setNewSkill({
            ...newSkill,
            materials: [...newSkill.materials, { title: '', type, url: '' }]
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Skills</h2>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 px-4 rounded-xl flex items-center space-x-2 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Create New</span>
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {skills.map((skill) => (
                    <div key={skill._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-tight">{skill.title}</h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{skill.category}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteSkill(skill._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                {skill.type === 'Buy Now' ? `Rs.${skill.price.toLocaleString()}` : 'FREE'}
                            </span>
                            <div className="flex items-center -space-x-1">
                                {skill.materials?.map((m, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center" title={m.title}>
                                        {m.type === 'video' ? <Video className="w-2.5 h-2.5 text-indigo-500" /> : <FileText className="w-2.5 h-2.5 text-red-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Academic Skill">
                <form onSubmit={handleAddSkill} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Skill Name</label>
                            <input required value={newSkill.title} onChange={e => setNewSkill({...newSkill, title: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Category</label>
                            <select value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600">
                                {['programming', 'languages', 'mathematics', 'science', 'arts', 'music', 'sports', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Description</label>
                        <textarea rows="3" maxLength={1000} required value={newSkill.description} onChange={e => setNewSkill({...newSkill, description: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600"></textarea>
                        <p className="text-[10px] font-bold text-slate-400 text-right">{newSkill.description.length}/1000</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Delivery Type</label>
                            <select value={newSkill.type} onChange={e => setNewSkill({...newSkill, type: e.target.value, price: e.target.value === 'Skill Share' ? 0 : newSkill.price})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600">
                                <option value="Skill Share">Skill Share (Free)</option>
                                <option value="Buy Now">One-Time Buy (Paid)</option>
                            </select>
                        </div>
                        {newSkill.type === 'Buy Now' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Base Price (Rs.)</label>
                                <input type="number" min="1" step="0.01" required value={newSkill.price} onChange={e => setNewSkill({...newSkill, price: e.target.value})} className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600" />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Learning Materials</label>
                            <div className="flex space-x-2">
                                <button type="button" onClick={() => addMaterial('video')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">+ Add Video</button>
                                <button type="button" onClick={() => addMaterial('pdf')} className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline">+ Add PDF</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {newSkill.materials.map((m, i) => (
                                <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 animate-in slide-in-from-left-2 duration-200">
                                    <div className="shrink-0">{m.type === 'video' ? <Video className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-red-500" />}</div>
                                    <input placeholder="Title" value={m.title} onChange={e => {
                                        const materials = [...newSkill.materials];
                                        materials[i].title = e.target.value;
                                        setNewSkill({...newSkill, materials});
                                    }} className="bg-transparent border-none text-xs text-slate-900 dark:text-white flex-grow focus:ring-0" />
                                    <input placeholder="URL" value={m.url} onChange={e => {
                                        const materials = [...newSkill.materials];
                                        materials[i].url = e.target.value;
                                        setNewSkill({...newSkill, materials});
                                    }} className="bg-transparent border-none text-xs text-slate-900 dark:text-white flex-grow focus:ring-0" />
                                    <button onClick={() => {
                                        const materials = newSkill.materials.filter((_, idx) => idx !== i);
                                        setNewSkill({...newSkill, materials});
                                    }} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all mt-4">
                        Confirm & List Academic Skill
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default MentorSkills;
