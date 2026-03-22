import React, { useEffect, useState } from 'react';

const EditSkillModal = ({ skill = null, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', category: '', level: '', description: '', tags: '', hourlyRate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setForm({
        name: skill.name || '',
        category: skill.category || '',
        level: skill.level || '',
        description: skill.description || '',
        tags: (skill.tags || []).join(', '),
        hourlyRate: skill.hourlyRate || ''
      });
    } else {
      setForm({ name: '', category: '', level: '', description: '', tags: '', hourlyRate: '' });
    }
  }, [skill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        level: form.level,
        description: form.description,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : 0
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white rounded shadow p-4 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">{skill ? 'Edit Skill' : 'Add Skill'}</h3>
        <form onSubmit={handleSubmit} className="grid gap-2">
          <input required className="px-3 py-2 border rounded" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="px-3 py-2 border rounded" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <select className="px-3 py-2 border rounded" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
            <option value="">Select level</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <input className="px-3 py-2 border rounded" placeholder="Hourly rate" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} />
          <textarea className="px-3 py-2 border rounded" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="px-3 py-2 border rounded" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
            <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSkillModal;
