export type UserRole = 'student' | 'faculty';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  // Student specific
  rollNumber?: string;
  branch?: string;
  // Faculty specific
  position?: string;
  department?: string;
  // Stats
  joinedDate: Date;
  likes?: number;
  rating?: number;
  score?: number;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  facultyId: string;
  facultyName: string;
  deadline: string; // ISO string
  acceptedBy: string[]; // List of student UIDs
  category: string;
  createdAt: string;
}

export interface Post {
  id: string;
  studentId: string;
  studentName: string;
  studentBranch: string;
  imageUrl: string;
  title?: string; // Added title field
  type: 'image' | 'video' | 'gif' | 'poster';
  category: string;
  likes: string[]; // UIDs
  rating: number; // Avg rating
  ratingCount: number; 
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export const CATEGORIES = [
  'Announcements',
  'Events',
  'Workshops',
  'Human festivals',
  'Placement',
  'Academics',
  'Examination',
  'Clubs and activities',
  'Sports',
  'Seminars',
  'Hackathon',
  'Cultural activities',
  'General'
];

export const BRANCHES = [
  'it', 'cse', 'cs', 'csd', 'eee', 'ece', 'ecm', 'aiml', 'iot', 'mech', 'civil'
];

// Extend window for fabric
declare global {
  interface Window {
    fabric: any;
  }
}