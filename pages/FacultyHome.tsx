import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Instagram, Download } from "lucide-react";
import { Button, Input } from "../components/Common";
import {
  Megaphone,
  Plus,
  Clock,
  Users,
  Eye,
  X,
  Edit3,
  Share2,
  MessageCircle
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
  doc
} from "firebase/firestore";
import { db } from "../firebase";
import { getDocs } from "firebase/firestore";
const FacultyHome: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const openConversation = async (otherUserId) => {

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", user.uid)
  );

  const snapshot = await getDocs(q);

  let conversationId = null;

  snapshot.forEach(doc => {

    const data = doc.data();

    if (data.participants.includes(otherUserId)) {
      conversationId = doc.id;
    }

  });

  if (!conversationId) {

    const newConv = await addDoc(collection(db, "conversations"), {
      participants: [user.uid, otherUserId],
      lastMessage: "",
      lastTime: serverTimestamp()
    });

    conversationId = newConv.id;

  }

  navigate("/messages", {
    state: { conversationId }
  });

};

  const [activeTab, setActiveTab] = useState<"announcements" | "saved">(
    "announcements"
  );

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [currentLogAnnouncement, setCurrentLogAnnouncement] =
    useState<any>(null);

  const [announcements, setAnnouncements] = useState<any[]>([]);
const myAnnouncements = announcements.filter(
  ann => ann.facultyId === user.uid
);
 const [savedPosters, setSavedPosters] = useState<any[]>([]);
const [previewPoster, setPreviewPoster] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
    category: "General"
  });
const handleRemoveSaved = async (id: string) => {

  if (!confirm("Remove this poster from saved?")) return;

  try {

    await deleteDoc(doc(db, "savedPosters", id));

    setSavedPosters(prev => prev.filter(p => p.id !== id));

  } catch (error) {
    console.error("Remove failed", error);
  }
};


useEffect(() => {
  const q = query(collection(db, "announcements"));

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("Announcements loaded:", data);
const sorted = data.sort((a: any, b: any) => {

  const getTime = (item: any) => {
    if (!item.createdAt) return 0;

    if (item.createdAt.seconds) {
      return item.createdAt.seconds * 1000;
    }

    return item.createdAt;
  };

  return getTime(b) - getTime(a);
});

    setAnnouncements(sorted);

  });

  return () => unsubscribe();
}, []);



useEffect(() => {

  if (!user?.uid) return;

  const q = query(
    collection(db, "savedPosters"),
    where("facultyId", "==", user.uid),
    orderBy("savedAt", "desc")
  );

  const unsubscribe = onSnapshot(q, snapshot => {

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setSavedPosters(data);

  });

  return () => unsubscribe();

}, [user?.uid]);
  /* BROADCAST ANNOUNCEMENT */

  const handleBroadcast = async (e: React.FormEvent) => {

  e.preventDefault();

  try {

    const newAnnouncement = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      deadline: formData.deadline,
      facultyId: user.uid,
      facultyName: user.displayName,
      acceptedBy: [],
    createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "announcements"), newAnnouncement);

    // update UI instantly
    
    setIsModalOpen(false);

    setFormData({
      title: "",
      description: "",
      deadline: "",
      category: "General"
    });

  } catch (error) {
    console.error("Broadcast failed", error);
  }

};
  const handleViewLog = (announcement: any) => {
    setCurrentLogAnnouncement(announcement);
    setIsLogModalOpen(true);
  };

const handleShareSavedPoster = async (imageUrl: string) => {

  try {

    const blob = await (await fetch(imageUrl)).blob();

    const file = new File([blob], "poster.png", { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {

      await navigator.share({
        files: [file],
        title: "CampusCreatix Poster",
        text: "Check out this poster!"
      });

    } else {

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "poster.png";
      link.click();

    }

  } catch (error) {

    console.error("Share failed", error);

  }

};

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-[var(--border-default)] pb-6">

  {/* LEFT SIDE */}
  <div>
    <h1 className="text-3xl font-bold text-[var(--text-heading)]">
      Hello, Dr. {user.displayName}
    </h1>

    <p className="text-[var(--text-muted)] mt-1 font-medium text-lg">
      {user.position || "Professor"} • {user.department || "General"}
    </p>
  </div>

  {/* RIGHT SIDE */}
  <div className="flex items-center gap-4">

    {/* TOGGLE SWITCH */}
    <div className="flex bg-gray-100 rounded-full p-1">

      <button
        onClick={() => setActiveTab("announcements")}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
          activeTab === "announcements"
            ? "bg-white shadow text-indigo-600"
            : "text-gray-500"
        }`}
      >
        Announcements
      </button>

      <button
        onClick={() => setActiveTab("saved")}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
          activeTab === "saved"
            ? "bg-white shadow text-indigo-600"
            : "text-gray-500"
        }`}
      >
        Saved
      </button>

    </div>

    <Button
      onClick={() => setIsModalOpen(true)}
      className="rounded-full px-6 shadow-md bg-[var(--accent-primary)] text-white"
    >
      <Plus size={20} /> Broadcast Announcement
    </Button>

  </div>

</div>
    
      {/* ANNOUNCEMENTS DASHBOARD */}
      {activeTab === "announcements" && (

<div className="flex flex-col lg:flex-row gap-8 items-start">

  {/* LEFT COLUMN */}
  <div className="w-full lg:w-[65%] space-y-6">

    <h2 className="text-xl font-bold">Campus Notice Records</h2>

    {announcements.map(notice => (

      <div
        key={notice.id}
        className="bg-white p-6 rounded-2xl shadow-sm border"
      >

        <h3 className="text-xl font-bold">{notice.title}</h3>

        <div className="text-sm font-bold text-indigo-600 mb-3">
          {notice.facultyName}
        </div>

        <p className="text-sm mb-5">{notice.description}</p>

        <div className="flex gap-4 text-xs">

          <div className="flex items-center gap-1 text-red-600">
            <Clock size={14} />
            Deadline:
            {new Date(notice.deadline).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-1">
            <Users size={14} />
            {notice.acceptedBy?.length || 0} Accepted
          </div>

        </div>

      </div>

    ))}

  </div>

  {/* RIGHT COLUMN */}

  <div className="w-full lg:w-[35%] space-y-6">

    <h2 className="text-xl font-bold">My Broadcast History</h2>

    {myAnnouncements.map(ann => (
        <div
        key={ann.id}
        className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-indigo-500"
      >

        <h3 className="text-lg font-bold">{ann.title}</h3>

        <p className="text-sm mb-4">{ann.description}</p>

        <div className="flex justify-between items-center text-xs">

          <span className="flex items-center gap-1">
            <Users size={14} />
            {ann.acceptedBy?.length || 0} Students
          </span>

          <Button
            variant="outline"
            onClick={() => handleViewLog(ann)}
            >
            View Log
          </Button>

        </div>

      </div>

))}

  </div>

</div>

)}

{activeTab === "saved" && (
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
{savedPosters.map(poster => (
  <div
    key={poster.id}
    className="bg-white rounded-2xl shadow overflow-hidden">
 
<div
  className="relative cursor-pointer group"
  onClick={() => setPreviewPoster(poster)}
>
<img
  src={poster.imageUrl}
  className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
/>

<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">

<Eye size={28} className="text-white" />

</div>

</div>
    <div className="p-4">
      <div className="font-bold">{poster.title}</div>

      <div className="text-xs text-gray-500 mb-4">
        Updated {poster.updatedAt}
      </div>

    <div className="flex gap-2">

<Button
  variant="outline"
  onClick={() =>
  navigate(`/faculty/editor/${poster.posterId}`, {
    state: {
      imageUrl: poster.imageUrl
    }
  })
}
  
>
  <Edit3 size={16} /> Edit
</Button>

<Button
  className="w-full"
  onClick={() => handleShareSavedPoster(poster.imageUrl)}
>
  <Share2 size={16} /> Share
</Button>

<Button
  variant="outline"
  className="text-red-600 border-red-300 hover:bg-red-50"
  onClick={() => handleRemoveSaved(poster.id)}
>
  Remove
</Button>

</div>
    </div>

  </div>

))}

</div>

)}
      {/* BROADCAST MODAL */}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-bold flex gap-2">
                <Megaphone /> Broadcast Announcement
              </h3>

              <button onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <Input
                placeholder="Announcement Title"
                value={formData.title}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <textarea
                className="w-full border rounded-xl p-3 h-32"
                placeholder="Description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />

              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={e =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                required
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit">Broadcast</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* VIEW LOG */}
      {isLogModalOpen && currentLogAnnouncement && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">
              Accepted Students
            </h3>

            <p className="text-sm text-gray-500 mb-6">
              {currentLogAnnouncement.title}
            </p>

            <div className="text-sm text-gray-500">
              Accepted count:{" "}
              {currentLogAnnouncement.acceptedBy?.length || 0}
            </div>

            <div className="pt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsLogModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {previewPoster && (

<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

<div className="relative max-w-4xl w-full p-6">

<Button
  variant="outline"
  className="mb-4"
  onClick={() => setPreviewPoster(null)}
>
  ← Back
</Button>

<img
  src={previewPoster.imageUrl}
  className="w-full rounded-xl shadow-lg"
/>

</div>

</div>

)}
    </div>
  );
};

export default FacultyHome;