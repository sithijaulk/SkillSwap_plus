import React, { useState, useEffect } from 'react';
import api, { buildAssetUrl } from '../../services/api';
import { Plus, Trash2, Edit2, Video, FileText, X, ChevronDown, Sparkles } from 'lucide-react';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const defaultReportForm = {
    reportPeriod: '',
    teachingMethodology: '',
    courseWorkDescription: '',
    lectureMaterialsSummary: '',
    learnerProgressObservations: '',
    challengesFaced: '',
    improvementPlans: '',
};

const statusClasses = {
    submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    under_review: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    evaluated: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
};

const MentorSkills = ({ onUpdate }) => {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [reportForm, setReportForm] = useState(defaultReportForm);
    const [selectedMaterialUrls, setSelectedMaterialUrls] = useState([]);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [expandedPrograms, setExpandedPrograms] = useState({});
    const [programReports, setProgramReports] = useState({});
    const [programReportsLoading, setProgramReportsLoading] = useState({});

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

    const currentPeriod = () => {
        const now = new Date();
        return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

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

    const fetchProgramReports = async (programId, force = false) => {
        if (!programId) return;
        if (!force && Array.isArray(programReports[programId])) return;

        setProgramReportsLoading((prev) => ({ ...prev, [programId]: true }));
        try {
            const response = await api.get(`/mentor-evaluation/reports/my/${programId}`);
            if (response?.data?.success) {
                setProgramReports((prev) => ({
                    ...prev,
                    [programId]: response.data.data || [],
                }));
            }
        } catch (error) {
            console.error('Error fetching program reports:', error);
            setProgramReports((prev) => ({
                ...prev,
                [programId]: [],
            }));
        } finally {
            setProgramReportsLoading((prev) => ({ ...prev, [programId]: false }));
        }
    };

    const toggleProgramReports = (programId) => {
        const isExpanded = !!expandedPrograms[programId];
        const nextExpanded = !isExpanded;

        setExpandedPrograms((prev) => ({
            ...prev,
            [programId]: nextExpanded,
        }));

        if (nextExpanded) {
            fetchProgramReports(programId);
        }
    };

    const openReportModal = (skill) => {
        setSelectedProgram(skill);
        setReportForm({
            ...defaultReportForm,
            reportPeriod: currentPeriod(),
        });

        const urls = (skill?.materials || [])
            .map((material) => material?.url || buildAssetUrl(material?.filePath || ''))
            .filter(Boolean);

        setSelectedMaterialUrls(urls);
        setIsReportModalOpen(true);
    };

    const toggleMaterialUrl = (url) => {
        setSelectedMaterialUrls((prev) => (
            prev.includes(url)
                ? prev.filter((item) => item !== url)
                : [...prev, url]
        ));
    };

    const handleSubmitReport = async (event) => {
        event.preventDefault();

        if (!selectedProgram?._id) {
            alert('Program not found for this report.');
            return;
        }

        if ((reportForm.teachingMethodology || '').trim().length < 100) {
            alert('Teaching methodology must contain at least 100 characters.');
            return;
        }

        const payload = {
            programId: selectedProgram._id,
            programTitle: selectedProgram.title,
            reportPeriod: reportForm.reportPeriod,
            teachingMethodology: reportForm.teachingMethodology,
            courseWorkDescription: reportForm.courseWorkDescription,
            lectureMaterialsSummary: reportForm.lectureMaterialsSummary,
            learnerProgressObservations: reportForm.learnerProgressObservations,
            challengesFaced: reportForm.challengesFaced,
            improvementPlans: reportForm.improvementPlans,
            attachedMaterialUrls: selectedMaterialUrls,
        };

        try {
            setReportSubmitting(true);
            const response = await api.post('/mentor-evaluation/reports', payload);
            if (response?.data?.success) {
                alert('Evaluation report submitted successfully.');
                setIsReportModalOpen(false);
                setExpandedPrograms((prev) => ({
                    ...prev,
                    [selectedProgram._id]: true,
                }));
                await fetchProgramReports(selectedProgram._id, true);
            }
        } catch (error) {
            const message = error?.response?.data?.message || 'Failed to submit evaluation report.';
            alert(message);
        } finally {
            setReportSubmitting(false);
        }
    };

    const handleAddSkill = async (e) => {
        if (e) e.preventDefault();
        try {
            const skillData = {
                ...newSkill,
                type: newSkill.type === 'Buy Now' ? 'paid' : 'free',
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

            {loading ? (
                <LoadingSkeleton rows={2} />
            ) : (
            <div className="grid md:grid-cols-2 gap-4">
                {skills.map((skill) => (
                    <div key={skill._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4 gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-tight">{skill.title}</h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{skill.category}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => openReportModal(skill)}
                                    className="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                                    title="Submit Evaluation Report"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                </button>
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
                                {(skill.type === 'paid' || skill.type === 'Buy Now')
                                    ? `Rs.${Number(skill.price || 0).toLocaleString()}`
                                    : 'FREE'}
                            </span>
                            <div className="flex items-center -space-x-1">
                                {skill.materials?.map((m, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center" title={m.title}>
                                        {m.type === 'video' ? <Video className="w-2.5 h-2.5 text-indigo-500" /> : <FileText className="w-2.5 h-2.5 text-red-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 dark:border-white/5 pt-4">
                            <button
                                onClick={() => toggleProgramReports(skill._id)}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Evaluation Reports</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPrograms[skill._id] ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedPrograms[skill._id] && (
                                <div className="mt-3 space-y-2">
                                    {programReportsLoading[skill._id] ? (
                                        <LoadingSkeleton rows={1} />
                                    ) : (
                                        <>
                                            {(programReports[skill._id] || []).map((report) => {
                                                const status = (report?.status || 'submitted').toString().toLowerCase();
                                                const badgeClass = statusClasses[status] || statusClasses.submitted;

                                                return (
                                                    <div key={report._id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{report.reportPeriod || 'Report period'}</p>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass}`}>
                                                                {status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                            Submitted: {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                        {status === 'evaluated' && report?.aiEvaluation && (
                                                            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1">
                                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                                                    AI Score {Number(report.aiEvaluation.overallScore || 0).toFixed(1)} / 100 • MPS {Number(report.aiEvaluation.mpsContribution || 0).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {(programReports[skill._id] || []).length === 0 && (
                                                <p className="text-xs italic text-slate-500">No evaluation reports submitted for this program yet.</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            )}

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

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={`Submit Evaluation Report${selectedProgram?.title ? ` • ${selectedProgram.title}` : ''}`}
            >
                <form onSubmit={handleSubmitReport} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Report Period</label>
                        <input
                            required
                            value={reportForm.reportPeriod}
                            onChange={(e) => setReportForm({ ...reportForm, reportPeriod: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600"
                            placeholder="April 2026"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Teaching Methodology (Min 100 chars)</label>
                        <textarea
                            required
                            minLength={100}
                            rows={4}
                            value={reportForm.teachingMethodology}
                            onChange={(e) => setReportForm({ ...reportForm, teachingMethodology: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600"
                            placeholder="Describe how you teach this program"
                        />
                        <p className="text-[10px] font-bold text-slate-400 text-right">{reportForm.teachingMethodology.length}/100 minimum</p>
                    </div>

                    {[
                        { key: 'courseWorkDescription', label: 'Course Work Description', placeholder: 'Describe coursework and exercises you conduct' },
                        { key: 'lectureMaterialsSummary', label: 'Lecture Materials Summary', placeholder: 'Describe materials provided to learners' },
                        { key: 'learnerProgressObservations', label: 'Learner Progress Observations', placeholder: 'Document learner progress observations' },
                        { key: 'challengesFaced', label: 'Challenges Faced', placeholder: 'Summarize key challenges during teaching' },
                        { key: 'improvementPlans', label: 'Improvement Plans', placeholder: 'What will you improve in the next period?' },
                    ].map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{field.label}</label>
                            <textarea
                                required
                                rows={3}
                                value={reportForm[field.key]}
                                onChange={(e) => setReportForm({ ...reportForm, [field.key]: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600"
                                placeholder={field.placeholder}
                            />
                        </div>
                    ))}

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Attach Existing Material URLs (Optional)</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {(selectedProgram?.materials || []).map((material, index) => {
                                const materialUrl = material?.url || buildAssetUrl(material?.filePath || '');
                                if (!materialUrl) return null;

                                const checked = selectedMaterialUrls.includes(materialUrl);
                                return (
                                    <label key={`${materialUrl}-${index}`} className="flex items-start gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleMaterialUrl(materialUrl)}
                                            className="mt-0.5"
                                        />
                                        <span className="text-xs text-slate-700 dark:text-slate-200 break-all">
                                            <span className="font-black block mb-1">{material?.title || `Material ${index + 1}`}</span>
                                            {materialUrl}
                                        </span>
                                    </label>
                                );
                            })}
                            {(selectedProgram?.materials || []).length === 0 && (
                                <p className="text-xs italic text-slate-500">No program materials found for this skill.</p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={reportSubmitting}
                        className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-70"
                    >
                        {reportSubmitting ? 'Submitting Report...' : 'Submit Evaluation Report'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default MentorSkills;
