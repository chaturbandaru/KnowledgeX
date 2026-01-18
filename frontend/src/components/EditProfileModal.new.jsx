import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

const EditProfileModal = ({ userData, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        full_name: userData.user?.full_name || '',
        bio: userData.user?.bio || '',
        location: userData.user?.location || '',
        skills_offered: userData.user?.skills_offered?.map(s => typeof s === 'string' ? s : s.name) || [],
        skills_needed: userData.user?.skills_needed?.map(s => typeof s === 'string' ? s : s.name) || [],
        avatar_url: userData.user?.avatar_url || ''
    });
    const [newSkillOffered, setNewSkillOffered] = useState('');
    const [newSkillNeeded, setNewSkillNeeded] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(userData.user?.avatar_url || null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result;
                setAvatarPreview(base64);
                setFormData(prev => ({ ...prev, avatar_url: base64 }));
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Failed to upload image:', err);
            setError('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const removeImage = () => {
        setAvatarPreview(null);
        setFormData(prev => ({ ...prev, avatar_url: '' }));
    };

    const addSkillOffered = () => {
        if (newSkillOffered.trim() && !formData.skills_offered.includes(newSkillOffered.trim())) {
            setFormData(prev => ({
                ...prev,
                skills_offered: [...prev.skills_offered, newSkillOffered.trim()]
            }));
            setNewSkillOffered('');
        }
    };

    const removeSkillOffered = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills_offered: prev.skills_offered.filter(s => s !== skill)
        }));
    };

    const addSkillNeeded = () => {
        if (newSkillNeeded.trim() && !formData.skills_needed.includes(newSkillNeeded.trim())) {
            setFormData(prev => ({
                ...prev,
                skills_needed: [...prev.skills_needed, newSkillNeeded.trim()]
            }));
            setNewSkillNeeded('');
        }
    };

    const removeSkillNeeded = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills_needed: prev.skills_needed.filter(s => s !== skill)
        }));
    };

    const getInitials = (name) => {
        return (name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const updateData = {
                full_name: formData.full_name,
                bio: formData.bio,
                location: formData.location,
                avatar_url: formData.avatar_url,
                skills_offered: formData.skills_offered.map(skill => ({
                    name: skill,
                    description: '',
                    category: '',
                    proficiency_level: 'intermediate',
                    tags: []
                })),
                skills_needed: formData.skills_needed.map(skill => ({
                    name: skill,
                    description: '',
                    category: '',
                    proficiency_level: 'beginner',
                    tags: []
                }))
            };

            const updatedUser = await api.updateProfile(updateData);
            onSave(updatedUser);
            onClose();
        } catch (err) {
            console.error('Failed to update profile:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-top">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Edit Profile
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-lg transition-all text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Profile Photo */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700">
                            Profile Photo
                        </label>
                        <div className="flex items-end gap-6">
                            {/* Avatar Preview */}
                            <div className="flex flex-col items-center">
                                {avatarPreview ? (
                                    <div className="relative">
                                        <img
                                            src={avatarPreview}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full object-cover border-2 border-blue-200 shadow-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-2 border-blue-200">
                                        {getInitials(formData.full_name)}
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <label className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-all">
                                    <Upload className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-blue-900">
                                            {uploadingImage ? 'Uploading...' : 'Click to upload photo'}
                                        </p>
                                        <p className="text-xs text-blue-600">PNG, JPG up to 2MB</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)}
                                placeholder="Your full name"
                                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bio
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows="4"
                                maxLength="500"
                                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.bio.length}/500 characters
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                placeholder="City, Country"
                                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                            />
                        </div>
                    </div>

                    {/* Skills Offered */}
                    <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Skills You Can Teach
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSkillOffered}
                                onChange={(e) => setNewSkillOffered(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillOffered())}
                                placeholder="Add a skill (e.g., Python, UI Design)..."
                                className="flex-1 px-4 py-2 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                            />
                            <button
                                type="button"
                                onClick={addSkillOffered}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.skills_offered.map((skill, idx) => (
                                <div key={idx} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2 font-medium text-sm">
                                    <span>{skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSkillOffered(skill)}
                                        className="hover:text-blue-900 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {formData.skills_offered.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No skills added yet</p>
                            )}
                        </div>
                    </div>

                    {/* Skills Needed */}
                    <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Skills You Want to Learn
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSkillNeeded}
                                onChange={(e) => setNewSkillNeeded(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillNeeded())}
                                placeholder="Add a skill (e.g., Machine Learning)..."
                                className="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                            />
                            <button
                                type="button"
                                onClick={addSkillNeeded}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.skills_needed.map((skill, idx) => (
                                <div key={idx} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-full flex items-center gap-2 font-medium text-sm">
                                    <span>{skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSkillNeeded(skill)}
                                        className="hover:text-purple-900 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {formData.skills_needed.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No skills added yet</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-all"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
