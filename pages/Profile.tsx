import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Card, Input, Button, Spinner } from '../components/Common';
import { Camera, Save, Edit2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db} from '../firebase';
const TEST_MODE = false;
const Profile: React.FC<{ user: User }> = ({ user }) => {
  const [profileData, setProfileData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof User, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        if (TEST_MODE) {
            // Update LocalStorage for mock persistence
            localStorage.setItem('campusCreatix_testUser', JSON.stringify(profileData));
            // Simulate network delay for better UX
            await new Promise(resolve => setTimeout(resolve, 800));
        } else {
            // Update Firestore
            if (user.uid) {
                const userRef = doc(db, 'users', user.uid);
                // Only update fields that are allowed to be edited
                await updateDoc(userRef, {
                    displayName: profileData.displayName,
                    photoURL: profileData.photoURL,
                    // Use optional chaining or undefined check for faculty fields
                    ...(profileData.position !== undefined && { position: profileData.position }),
                    ...(profileData.department !== undefined && { department: profileData.department })
                });
            }
        }
        setIsEditing(false);
        // Force reload to reflect changes in Header and Dashboard Greeting
        window.location.reload();
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile changes.");
        setIsSaving(false);
    }
  };

  const handlePhotoClick = () => {
    if (isEditing) {
        fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card title="Profile Information">
        <div className="flex items-start gap-6 mb-8">
            <div 
                className={`relative group ${isEditing ? 'cursor-pointer' : ''}`} 
                onClick={handlePhotoClick}
            >
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-400 overflow-hidden border-2 border-[var(--border-default)]">
                    {profileData.photoURL ? (
                        <img src={profileData.photoURL} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <span>{profileData.displayName[0]}</span>
                    )}
                </div>
                {isEditing && (
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 rounded-full flex items-center justify-center transition-all">
                        <Camera className="text-white opacity-70 group-hover:opacity-100" size={24} />
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={!isEditing}
                />
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--text-heading)]">{profileData.displayName}</h3>
                <p className="text-[var(--text-muted)]">{profileData.email}</p>
                {isEditing && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                        Click the profile picture to upload a new one.
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-heading)]">Full Name</label>
                <Input 
                    value={profileData.displayName} 
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    placeholder="Enter full name"
                    disabled={!isEditing}
                    className={!isEditing ? "opacity-70 bg-gray-50" : ""}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-muted)]">Email</label>
                <Input value={profileData.email} disabled className="opacity-70 cursor-not-allowed bg-gray-50" />
            </div>
            
            {profileData.role === 'student' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--text-muted)]">Roll Number</label>
                        <Input value={profileData.rollNumber} disabled className="opacity-70 cursor-not-allowed bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--text-muted)]">Branch</label>
                        <Input value={profileData.branch} disabled className="uppercase opacity-70 cursor-not-allowed bg-gray-50" />
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--text-heading)]">Position</label>
                        <Input 
                            value={profileData.position || ''} 
                            onChange={(e) => handleChange('position', e.target.value)}
                            placeholder="e.g. Associate Professor"
                            disabled={!isEditing}
                            className={!isEditing ? "opacity-70 bg-gray-50" : ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-[var(--text-heading)]">Department</label>
                        <Input 
                            value={profileData.department || ''} 
                            onChange={(e) => handleChange('department', e.target.value)}
                            placeholder="e.g. Computer Science"
                            disabled={!isEditing}
                            className={!isEditing ? "opacity-70 bg-gray-50" : ""}
                        />
                    </div>
                </>
            )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-[var(--border-default)] flex justify-end">
            {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="px-8">
                    <Edit2 size={18} /> Edit Profile
                </Button>
            ) : (
                <Button onClick={handleSave} disabled={isSaving} className="px-8">
                    {isSaving ? (
                        <>
                            <Spinner /> Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} /> Save Changes
                        </>
                    )}
                </Button>
            )}
        </div>
      </Card>

    
    </div>
  );
};

export default Profile;