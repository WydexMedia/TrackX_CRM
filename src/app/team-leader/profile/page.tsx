"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch } from "@/lib/tokenValidation";
import { useTenant } from "@/hooks/useTenant";
import { User, Mail, Phone, MapPin, FileText, Lock, Save, Edit2 } from "lucide-react";

interface TeamLeader {
  _id?: string;
  name: string;
  code: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  about?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { subdomain } = useTenant();
  const [teamLeader, setTeamLeader] = useState<TeamLeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    about: "",
  });
  const [activeTab, setActiveTab] = useState("profile");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(user);
      if (parsed?.role !== "teamleader") {
        router.push("/login");
        return;
      }
      setTeamLeader(parsed);
      setProfileData({
        name: parsed.name || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        address: parsed.address || "",
        about: parsed.about || "",
      });
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await authenticatedFetch("/api/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          _id: teamLeader?._id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          about: profileData.about
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        
        if (teamLeader) {
          const updatedTeamLeader = {
            ...teamLeader,
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            address: profileData.address,
            about: profileData.about
          };
          setTeamLeader(updatedTeamLeader);
          localStorage.setItem("user", JSON.stringify(updatedTeamLeader));
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await authenticatedFetch("/api/users/change-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          _id: teamLeader?._id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setActiveTab("profile");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-80 border border-slate-200/60 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamLeader) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
              <p className="text-sm text-slate-600 mt-1">Manage your account information and preferences</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Card className="mb-6 border border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("profile")}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Profile Information
              </Button>
              <Button
                variant={activeTab === "password" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("password")}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Card className="border border-slate-200/60 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-900">Profile Information</CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleProfileSave} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="border-slate-200"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="text-slate-900 font-medium">{profileData.name || 'No name provided'}</div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="border-slate-200"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <div className="text-slate-900 font-medium">{profileData.email || 'No email provided'}</div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="border-slate-200"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="text-slate-900 font-medium">{profileData.phone || 'No phone provided'}</div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Address
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      rows={2}
                      className="border-slate-200 resize-none"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <div className="text-slate-900">{profileData.address || 'No address provided'}</div>
                  )}
                </div>

                {/* About */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    About
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={profileData.about}
                      onChange={(e) => setProfileData({ ...profileData, about: e.target.value })}
                      rows={4}
                      className="border-slate-200"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <div className="text-slate-900">{profileData.about || 'No information provided'}</div>
                  )}
                </div>

                {/* Subdomain (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subdomain
                  </label>
                  <div className="text-primary font-medium">
                    {subdomain ? `https://${subdomain}.wydex.co` : 'No subdomain configured'}
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset to original data
                        if (teamLeader) {
                          setProfileData({
                            name: teamLeader.name || "",
                            email: teamLeader.email || "",
                            phone: teamLeader.phone || "",
                            address: teamLeader.address || "",
                            about: teamLeader.about || "",
                          });
                        }
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <Card className="border border-slate-200/60 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
              <CardTitle className="text-lg text-slate-900">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    Current Password
                  </label>
                  <Input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="border-slate-200"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    New Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="border-slate-200"
                  />
                  <p className="text-sm text-slate-500 mt-1">Password must be at least 6 characters long</p>
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="border-slate-200"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                      });
                    }}
                    disabled={isChangingPassword}
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}





