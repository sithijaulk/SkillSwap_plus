import React, { useEffect, useState } from 'react';
import api, { buildAssetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Upload, X } from 'lucide-react';

const EditSkillModal = ({ skill = null, onClose, onSave }) => {
    const { user } = useAuth();
    const [form, setForm] = useState({
        title: '',
        category: '',
        type: 'free',
        price: '',
        description: '',
        tags: '',
        requiredKnowledge: '',
        image: null
    });
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (skill) {
            setForm({
                title: skill.title || '',
                category: skill.category || '',
                type: skill.type || 'free',
                price: skill.price || '',
                description: skill.description || '',
                tags: (skill.tags || []).join(', '),
                requiredKnowledge: skill.requiredKnowledge || '',
                image: skill.image || null
            });
            if (skill.image) {
                setImagePreview(buildAssetUrl(`/uploads/skills/${skill.image}`));
            }
        } else {
            setForm({
                title: '',
                category: '',
                type: 'free',
                price: '',
                description: '',
                tags: '',
                requiredKnowledge: '',
                image: null
            });
            setImagePreview(null);
        }
    }, [skill]);

    const handleImageUpload = async (file) => {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only JPG and PNG files are allowed');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await api.post('/upload/skill-image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setForm({ ...form, image: response.data.data.fileId });
                setImagePreview(response.data.data.url);
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const removeImage = () => {
        setForm({ ...form, image: null });
        setImagePreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                title: form.title.trim(),
                category: form.category.trim(),
                type: form.type,
                price: form.type === 'paid' ? parseFloat(form.price) : 0,
                description: form.description.trim(),
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                requiredKnowledge: form.requiredKnowledge.trim(),
                image: form.image
            };

            // Validate required fields
            if (!payload.title || !payload.category || !payload.description) {
                alert('Please fill all required fields');
                return;
            }

            if (payload.type === 'paid' && (!payload.price || payload.price <= 0)) {
                alert('Price is required for paid skills');
                return;
            }

            await onSave(payload);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save skill. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        {skill ? 'Edit Skill' : 'Create New Skill'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Skill Image (Optional)
                            </label>
                            <div className="space-y-2">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Skill preview"
                                            className="w-full h-32 object-cover rounded-lg border"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="image-upload"
                                            disabled={uploadingImage}
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {uploadingImage ? 'Uploading...' : 'Click to upload image (JPG/PNG, max 5MB)'}
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Skill Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g., Python Programming"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Category *
                                </label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    <option value="">Select category</option>
                                    <option value="programming">Programming</option>
                                    <option value="languages">Languages</option>
                                    <option value="mathematics">Mathematics</option>
                                    <option value="science">Science</option>
                                    <option value="arts">Arts</option>
                                    <option value="music">Music</option>
                                    <option value="sports">Sports</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Skill Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Skill Type *
                            </label>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="free"
                                        name="type"
                                        value="free"
                                        checked={form.type === 'free'}
                                        onChange={e => setForm({ ...form, type: e.target.value, price: '' })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="free" className="flex items-center">
                                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-medium mr-2">
                                            🟢 Free Skill Share
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Share your knowledge at no cost
                                        </span>
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid"
                                        name="type"
                                        value="paid"
                                        checked={form.type === 'paid'}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="paid" className="flex items-center">
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium mr-2">
                                            💰 Paid Skill
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Charge for your expertise
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Price (only for paid skills) */}
                        {form.type === 'paid' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Price (₹) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter price"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Learners will see this price + 25% platform fee
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description *
                            </label>
                            <textarea
                                required
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="Describe what you'll teach and what learners will achieve..."
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        {/* Required Knowledge */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Required Knowledge (Optional)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., Basic computer skills, No prior experience needed"
                                value={form.requiredKnowledge}
                                onChange={e => setForm({ ...form, requiredKnowledge: e.target.value })}
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tags (Optional)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., python, beginners, web development (comma separated)"
                                value={form.tags}
                                onChange={e => setForm({ ...form, tags: e.target.value })}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || uploadingImage}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (skill ? 'Update Skill' : 'Create Skill')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditSkillModal;
