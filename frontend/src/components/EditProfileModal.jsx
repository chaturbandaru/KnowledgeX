import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Upload, Camera } from 'lucide-react';
import api from '../services/api';

const EditProfileModal = ({ userData, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        full_name: userData.user?.full_name || '',
        bio: userData.user?.bio || '',
        location: userData.user?.location || '',
        profile_photo: userData.user?.avatar_url || null,
        skills_offered: userData.user?.skills_offered?.map(s => typeof s === 'string' ? s : s.name) || [],
        skills_needed: userData.user?.skills_needed?.map(s => typeof s === 'string' ? s : s.name) || []
    });
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(userData.user?.avatar_url || null);
    const [newSkillOffered, setNewSkillOffered] = useState('');
    const [newSkillNeeded, setNewSkillNeeded] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                setFormData(prev => ({ ...prev, profile_photo: base64 }));
                setProfilePhotoPreview(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const getInitials = (name) => {
        return (name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Note: api.updateProfile handles conversion to SkillItems and avatar_url mapping
            const updateData = {
                full_name: formData.full_name,
                bio: formData.bio,
                location: formData.location,
                profile_photo: formData.profile_photo, // api.js maps this to avatar_url
                skills_offered: formData.skills_offered,
                skills_needed: formData.skills_needed
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-[#1e293b]/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Profile Photo */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-400">
                            Profile Photo
                        </label>
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0 overflow-hidden ring-4 ring-slate-800">
                                    {profilePhotoPreview ? (
                                        <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(formData.full_name)
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                                    <Camera className="w-8 h-8 text-white/80" />
                                </div>
                            </div>

                            <label className="flex-1 cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-xl hover:bg-white/5 hover:border-indigo-500/50 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/10">
                                    <div className="bg-indigo-500/10 p-3 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                                        <Upload className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white group-hover:text-indigo-300 transition-colors">Upload New Photo</p>
                                        <p className="text-xs text-slate-500">JPG, PNG or GIF (Max 5MB)</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-5">
                        <div className="grid md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    placeholder="City, Country"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Bio
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows="4"
                                maxLength="500"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600 resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-1 text-right">
                                {formData.bio.length}/500 characters
                            </p>
                        </div>
                    </div>

                    {/* Skills Offered */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Skills You Can Teach
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSkillOffered}
                                onChange={(e) => setNewSkillOffered(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillOffered())}
                                placeholder="Add a skill (e.g. React, Python)..."
                                className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                            />
                            <button
                                type="button"
                                onClick={addSkillOffered}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-slate-900/30 rounded-xl border border-white/5">
                            {formData.skills_offered.map((skill, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-sm">
                                    <span>{skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSkillOffered(skill)}
                                        className="hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {formData.skills_offered.length === 0 && (
                                <p className="text-sm text-slate-500 italic">No skills added yet</p>
                            )}
                        </div>
                    </div>

                    {/* Skills Needed */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Skills You Want to Learn
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newSkillNeeded}
                                onChange={(e) => setNewSkillNeeded(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillNeeded())}
                                placeholder="Add a skill..."
                                className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-600"
                            />
                            <button
                                type="button"
                                onClick={addSkillNeeded}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-xl transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-slate-900/30 rounded-xl border border-white/5">
                            {formData.skills_needed.map((skill, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-sm">
                                    <span>{skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSkillNeeded(skill)}
                                        className="hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {formData.skills_needed.length === 0 && (
                                <p className="text-sm text-slate-500 italic">No skills added yet</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-medium transition-colors"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
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

