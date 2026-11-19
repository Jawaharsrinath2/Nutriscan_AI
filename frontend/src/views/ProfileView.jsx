import { useState } from "react";
import { Link } from "react-router-dom";
import { changePassword, updateProfile, uploadAvatar } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { PATHS } from "../lib/paths";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
];

const ACCENT_THEMES = [
  { id: "emerald", name: "Emerald", label: "Fresh & Healthy", color: "bg-emerald-500", border: "border-emerald-500" },
  { id: "ocean", name: "Ocean Blue", label: "Cool & Focused", color: "bg-sky-500", border: "border-sky-500" },
  { id: "violet", name: "Royal Violet", label: "Modern & Creative", color: "bg-violet-500", border: "border-violet-500" },
  { id: "amber", name: "Sunset Amber", label: "Warm & Energizing", color: "bg-amber-500", border: "border-amber-500" },
  { id: "rose", name: "Ruby Rose", label: "Bold & Vibrant", color: "bg-rose-500", border: "border-rose-500" },
];

export default function ProfileView() {
  const { user, updateUser } = useAuth();
  const showToast = useToast();

  // Profile Form state
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState(user?.theme || "emerald");
  const [savingTheme, setSavingTheme] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // 1. Handle Profile Update (Username & Avatar URL)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username cannot be blank.", "⚠️");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateProfile({ username: username.trim(), avatar_url: avatarUrl.trim() || null });
      updateUser(updated);
      showToast("Profile details updated successfully!", "✅");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "⚠️");
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Handle File Upload Avatar
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (PNG, JPG, WebP)", "⚠️");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size cannot exceed 5MB", "⚠️");
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      setAvatarUrl(res.avatar_url);
      updateUser(res.user);
      showToast("New profile photo uploaded!", "📸");
    } catch (err) {
      showToast(err.message || "Failed to upload photo", "⚠️");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Preset avatar selection
  const handleSelectPreset = async (url) => {
    setAvatarUrl(url);
    try {
      const updated = await updateProfile({ avatar_url: url });
      updateUser(updated);
      showToast("Avatar updated!", "✨");
    } catch (err) {
      showToast(err.message || "Failed to set avatar", "⚠️");
    }
  };

  // 4. Handle Theme Switcher
  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    setSavingTheme(true);
    try {
      const updated = await updateProfile({ theme: themeId });
      updateUser(updated);
      showToast(`App theme set to ${themeId.toUpperCase()}`, "🎨");
    } catch (err) {
      showToast(err.message || "Failed to update theme", "⚠️");
    } finally {
      setSavingTheme(false);
    }
  };

  // 5. Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("Please enter your current password.", "⚠️");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long.", "⚠️");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "⚠️");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast("Password updated successfully!", "🔒");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast(err.message || "Failed to change password", "⚠️");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Account &amp; Profile Settings</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personalize your account details, profile photo, security, and app appearance.
          </p>
        </div>

        {user?.role === "admin" && (
          <Link
            to={PATHS.admin}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition"
          >
            <span>👑</span>
            <span>Open Admin Panel</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Quick Info */}
        <div className="md:col-span-1 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
            {/* Avatar Preview */}
            <div className="relative inline-block mx-auto">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/20 shadow-md mx-auto"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-3xl flex items-center justify-center shadow-md ring-4 ring-emerald-500/20 mx-auto uppercase">
                  {username?.[0] || "U"}
                </div>
              )}

              {/* Upload Overlay Button */}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-emerald-600 flex items-center justify-center text-sm shadow-md cursor-pointer transition"
                title="Upload new photo"
              >
                📷
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{username || "User"}</h3>
              <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  user?.role === "admin"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {user?.role === "admin" ? "👑 Super Admin" : "Member"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                {user?.provider} Auth
              </span>
            </div>

            {uploadingAvatar && (
              <p className="text-xs text-emerald-600 font-bold animate-pulse">Uploading new avatar…</p>
            )}
          </div>

          {/* Biometrics Onboarding Link Card */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/70 rounded-3xl border border-emerald-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥗</span>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Nutrition &amp; Fitness Plan
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Need to recalculate your daily calorie budget, change activity level, or update gym days?
            </p>
            <Link
              to={PATHS.profileEdit(0)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
            >
              <span>Update Biometrics Questionnaire</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Forms (Details, Theme, Security) */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. Profile Details Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Personal Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">Update your display name or pick a custom avatar picture.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Name / Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Avatar Image URL (or upload above)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Preset Avatars Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Or Choose from Preset Avatars:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AVATARS.map((url, idx) => {
                    const isSelected = avatarUrl === url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`relative rounded-full overflow-hidden transition transform hover:scale-110 ${
                          isSelected ? "ring-3 ring-emerald-500 scale-105" : "opacity-80 hover:opacity-100"
                        }`}
                        title="Click to use this avatar"
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-10 h-10 object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center text-white text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
                >
                  {savingProfile ? "Saving…" : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          {/* 2. Theme & Appearance */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">App Appearance &amp; Color Theme</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your preferred accent theme. The theme saves across your sessions.
              </p>
            </div>

            {/* Accent Color Chooser */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACCENT_THEMES.map((th) => {
                const isSelected = selectedTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleThemeChange(th.id)}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      isSelected
                        ? "border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full shrink-0 ${th.color} shadow-xs flex items-center justify-center text-white text-xs font-bold`}>
                      {isSelected && "✓"}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">{th.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{th.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {savingTheme && (
              <p className="text-xs text-slate-500 font-semibold">Applying theme…</p>
            )}
          </div>

          {/* 3. Password Security (Local auth only) */}
          {user?.provider === "local" ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your security credentials. Enter your current password and your new password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
                  >
                    {changingPassword ? "Updating Password…" : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 text-xs text-slate-500 flex items-center gap-3">
              <span className="text-xl">🔐</span>
              <div>
                <strong className="text-slate-800">Google Authentication:</strong> You signed in using your Google
                account. Your password management is handled directly through Google.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
