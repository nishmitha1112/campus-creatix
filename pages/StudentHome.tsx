import React, { useState, useEffect } from "react";
import { User, Announcement } from "../types";
import { Button, Input, Select } from "../components/Common";

import {
  Upload,
  Trash2,
  Eye,
  X,
  Heart,
  Star,
  FolderOpen,
  Clock,
  Users,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";

import { db } from "../firebase";
import { getDocs } from "firebase/firestore";
import { getDoc, setDoc } from "firebase/firestore";
const StudentHome: React.FC<{ user: User }> = ({ user }) => {

  const navigate = useNavigate();
const openConversation = async (otherUserId, otherUserName) => {

  const conversationId =
    user.uid < otherUserId
      ? `${user.uid}_${otherUserId}`
      : `${otherUserId}_${user.uid}`;

  const convRef = doc(db, "conversations", conversationId);

  const convSnap = await getDoc(convRef);

  if (!convSnap.exists()) {

    await setDoc(convRef, {
      participants: [user.uid, otherUserId],
      participantNames: [user.displayName, otherUserName],
      lastMessage: "",
      lastTime: serverTimestamp()
    });

  }

  navigate("/student/messages", {
    state: { conversationId }
  });

};

  const [activeTab, setActiveTab] = useState<"announcements" | "my-creatives">(
    "announcements"
  );
const [category, setCategory] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewCreative, setPreviewCreative] = useState<any | null>(null);
const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);


  const [isUploading, setIsUploading] = useState(false);
   //const [category, setCategory] = useState("");
  const [myCreatives, setMyCreatives] = useState<any[]>([]);
const [creativeTitle, setCreativeTitle] = useState("");
const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {

    if (!user?.uid) return;

    const q = query(
  collection(db, "creatives"),
  where("uploadedByUid", "==", user.uid)
);

    const unsubscribe = onSnapshot(q, snapshot => {

      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMyCreatives(fetched);

    });

    return () => unsubscribe();

  }, [user.uid]);

const totalLikes = myCreatives.reduce(
  (sum, c) => sum + (c.likes?.length || 0),
  0
);

const ratingsArray = myCreatives.flatMap((c) =>
  c.ratings ? c.ratings.map((r: any) => r.value) : []
);

const avgRating =
  ratingsArray.length > 0
    ? (
        ratingsArray.reduce((a, b) => a + b, 0) /
        ratingsArray.length
      ).toFixed(1)
    : "0.0";



/* ADD THIS USEEFFECT HERE */

useEffect(() => {

  const q = query(collection(db, "announcements"));

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setAnnouncements(data as Announcement[]);

  });

  return () => unsubscribe();

}, []);

  // CLOUDINARY UPLOAD

  const uploadToCloudinary = async (file: File) => {

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "campus_creatix_unsigned");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dfkocxkat/auto/upload",
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    return data.secure_url;

  };

  const handleUpload = async (e: React.FormEvent) => {

    e.preventDefault();

    const form = e.target as HTMLFormElement;

    const fileInput = form.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = fileInput?.files?.[0];

    if (!file) return;


    setIsUploading(true);

    try {

      const imageUrl = await uploadToCloudinary(file);

await addDoc(collection(db, "creatives"), {
  title: creativeTitle,
  category: category,
  imageUrl,
  uploadedByUid: user.uid,
  studentName: user.displayName,
  likes: [],
  ratings: [],
  createdAt: serverTimestamp()
});
      setUploadModalOpen(false);
      setActiveTab("my-creatives");

   
setCategory("");
setCreativeTitle("");
(form.querySelector('input[type="file"]') as HTMLInputElement).value = "";

    } catch (err) {

      alert("Upload failed");

    } finally {

      setIsUploading(false);

    }

  };

const handleDeleteCreative = async (id: string) => {
   
  try {
   
  await deleteDoc(doc(db, "creatives", id));

  } catch (err) {

    console.error("Delete failed", err);

  }
};
  const handleAccept = async (annId: string) => {

  try {

    const announcementRef = doc(db, "announcements", annId);

    await updateDoc(announcementRef, {
      acceptedBy: arrayUnion(user.uid)
    });

  } catch (error) {

    console.error("Accept failed", error);

  }

};


  const pendingAnnouncements = announcements.filter(
    ann => !ann.acceptedBy.includes(user.uid)
  );

  const acceptedAnnouncements = announcements.filter(
    ann => ann.acceptedBy.includes(user.uid)
  );



  return (

    <div className="space-y-10 pb-12">

      {/* HEADER */}

      <div className="flex justify-between items-end">

        <div>
          <h1 className="text-3xl font-bold">
            My Creative Portfolio
          </h1>
          <p className="text-gray-500">
            {user.displayName} | {user.rollNumber} | {user.branch}
          </p>
        </div>

        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload size={18} /> Upload Creative
        </Button>

      </div>

{/* STATS CARDS */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

  {/* Portfolio Engagement */}
  <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between">

    <div>
      <div className="text-3xl font-extrabold">
        {totalLikes} 
      </div>

      <div className="text-xs font-bold text-gray-500 uppercase">
        Portfolio Engagement
      </div>
    </div>

    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500">
      <Heart size={26} fill="currentColor" />
    </div>

  </div>

  {/* Rating */}
  <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between">

    <div>
      <div className="text-3xl font-extrabold">
         {avgRating}
      </div>

      <div className="text-xs font-bold text-gray-500 uppercase">
        Rating
      </div>
    </div>

    <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500">
      <Star size={26} fill="currentColor" />
    </div>

  </div>

  {/* My Creatives */}
  <div
    onClick={() =>
      setActiveTab(
        activeTab === "my-creatives"
          ? "announcements"
          : "my-creatives"
      )
    }
    className="bg-indigo-50 p-6 rounded-3xl shadow-sm flex items-center justify-between cursor-pointer"
  >

    <div>
      <div className="text-3xl font-extrabold">
        {myCreatives.length}
      </div>

      <div className="text-xs font-bold text-gray-500 uppercase">
        My Creatives
      </div>
    </div>

    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-indigo-500">
      <FolderOpen size={26} />
    </div>

  </div>

</div>
      {/* MY CREATIVES */}
      {activeTab === "my-creatives" ? (
        <div>
          <Button
            variant="outline"
            onClick={() => setActiveTab("announcements")}
            className="mb-6"
          >
            Back
          </Button>

          <div className="grid md:grid-cols-3 gap-6">

            {myCreatives.map(c => (

              <div
                key={c.id}
                className="bg-white rounded-2xl shadow overflow-hidden"
                >
                <div
                  className="h-48 cursor-pointer"
                  onClick={() => setPreviewCreative(c)}
                >
                  <img
                    src={c.imageUrl}
                    alt={c.title}
                    className="w-full h-full object-cover"
                  />
                </div>

              <div className="p-4 space-y-2">
  <div className="flex justify-between items-center">
    <span className="font-semibold">{c.title}</span>

    <button onClick={() => handleDeleteCreative(c.id)}>
      <Trash2 size={16} />
    </button>
  </div>

  <div className="flex gap-3 text-sm text-gray-500">

    <span className="flex items-center gap-1">
      <Heart size={14}/> {c.likes?.length || 0}
    </span>

    <span className="flex items-center gap-1">
      <Star size={14}/>
      {c.ratings?.length
        ? (
            c.ratings.reduce((a:any,b:any)=>a+b.value,0) /
            c.ratings.length
          ).toFixed(1)
        : "0.0"}
    </span>

  </div>

</div>
              </div>

            ))}

          </div>

        </div>

      ) : (

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ANNOUNCEMENTS */}

          <div className="flex-1 space-y-6">

            <h3 className="text-xl font-bold">
              Announcements ({pendingAnnouncements.length})
            </h3>

           {pendingAnnouncements.map(ann => (

<div
  key={ann.id}
  className="bg-white p-6 rounded-3xl shadow-sm border border-[var(--border-default)] hover:shadow-md transition-shadow"
>

  <div className="flex justify-between items-start mb-3">

    <div className="text-xs font-bold text-[var(--text-muted)] bg-gray-50 px-2 py-1 rounded-lg">
      By {ann.facultyName}
    </div>

  </div>

  <h4 className="text-xl font-bold text-[var(--text-heading)] mb-2">
    {ann.title}
  </h4>

  <p className="text-sm text-[var(--text-body)] mb-5">
    {ann.description}
  </p>

  <div className="flex items-center gap-4 text-xs mb-6">

    <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md">
      <Clock size={14} />
      <span>
        Deadline: {new Date(ann.deadline).toLocaleDateString()}
      </span>
    </div>

    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
      <Users size={14} />
      <span>{ann.acceptedBy.length} Accepted</span>
    </div>

  </div>

  <div className="grid grid-cols-2 gap-4">

    <Button
      variant="outline"
      onClick={() => setViewAnnouncement(ann)}
    >
      View
    </Button>

    <Button
      onClick={() => handleAccept(ann.id)}
    >
      Accept
    </Button>

  </div>

</div>

))}
          </div>



          {/* ACCEPTED */}

          <div className="lg:w-1/3 space-y-6">

            <h3 className="text-xl font-bold">
              Accepted ({acceptedAnnouncements.length})
            </h3>

        {acceptedAnnouncements.map(ann => (

<div
  key={ann.id}
  className="bg-white p-6 rounded-3xl shadow-sm border border-[var(--border-default)] hover:shadow-md transition-shadow"
>

  <div className="flex justify-between items-start mb-3">

    <div className="text-xs font-bold text-[var(--text-muted)] bg-gray-50 px-2 py-1 rounded-lg">
      By {ann.facultyName}
    </div>

    <div className="text-green-600 bg-green-50 rounded-full p-1">
      <CheckCircle size={18} />
    </div>

  </div>

  <h4 className="text-xl font-bold text-[var(--text-heading)] mb-2">
    {ann.title}
  </h4>

  <p className="text-sm text-[var(--text-body)] mb-5">
    {ann.description}
  </p>

  <div className="flex items-center gap-4 text-xs mb-6">

    <div className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
      <Clock size={14} />
      <span>
        Due: {new Date(ann.deadline).toLocaleDateString()}
      </span>
    </div>

  </div>

  <div className="grid grid-cols-2 gap-4">

    <Button
      variant="outline"
      onClick={() => setViewAnnouncement(ann)}
    >
      View
    </Button>

   <Button onClick={() => openConversation(ann.facultyId,ann.facultyName)}>
Chat with Faculty
</Button>

  </div>

</div>
))}
          </div>

        </div>

      )}



      {/* UPLOAD MODAL */}

      {uploadModalOpen && (

        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">

          <div className="bg-white p-6 rounded-2xl w-96">

            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold">
                Upload Creative
              </h3>

              <button
                onClick={() => setUploadModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
<Input
  placeholder="Creative Title"
  value={creativeTitle}
  onChange={(e) => setCreativeTitle(e.target.value)}
  required
/>


              <Input type="file" required />

               <Select
    value={category}
    onChange={(e) => setCategory(e.target.value)}
  >
    <option value="">Select Category</option>
    <option value="poster">Poster</option>
    <option value="logo">Logo</option>
    <option value="banner">Banner</option>
    <option value="illustration">Illustration</option>
  </Select>
             
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>

            </form>

          </div>

        </div>

      )}


{viewAnnouncement && (

<div
  className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
  onClick={() => setViewAnnouncement(null)}
>

  <div
    className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-xl"
    onClick={(e) => e.stopPropagation()}
  >

    <h2 className="text-2xl font-bold mb-2">
      {viewAnnouncement.title}
    </h2>

    <p className="text-sm text-gray-500 mb-4">
      By {viewAnnouncement.facultyName}
    </p>

    <p className="mb-6">
      {viewAnnouncement.description}
    </p>

    <div className="flex justify-between items-center mb-6">

      <span className="text-red-500 text-sm">
        Deadline: {new Date(viewAnnouncement.deadline).toLocaleString()}
      </span>

      <span className="text-sm">
        {viewAnnouncement.acceptedBy.length} Students Accepted
      </span>

    </div>

    <div className="flex justify-end gap-3">

      <Button
        variant="outline"
        onClick={() => setViewAnnouncement(null)}
      >
        Close
      </Button>

      {!viewAnnouncement.acceptedBy.includes(user.uid) ? (

        <Button
          onClick={() => {
            handleAccept(viewAnnouncement.id);
            setViewAnnouncement(null);
          }}
        >
          Accept
        </Button>

      ) : (
<Button
  onClick={() => openConversation(viewAnnouncement.facultyId,viewAnnouncement.facultyName)}
>
  Chat with Faculty
</Button>
      )}

    </div>

  </div>

</div>

)}
      {/* PREVIEW */}

      {previewCreative && (

        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewCreative(null)}
        >

          <img
            src={previewCreative.imageUrl}
            className="max-h-[80vh]"
          />

        </div>

      )}

    </div>

  );

};

export default StudentHome;