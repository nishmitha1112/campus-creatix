import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/Common';
import { MessageCircle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";

import {
  collection,
  onSnapshot
} from "firebase/firestore";

import { db } from "../firebase";
import { User } from "../types";

interface LeaderboardProps {
  userRole: 'student' | 'faculty';
  user: User;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ userRole, user }) => {
  const navigate = useNavigate();
const openConversation = async (studentId, studentName) => {

  if (!user || !user.uid) {
    console.error("User not loaded yet");
    return;
  }

  console.log("Chat clicked:", studentId, studentName);

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", user.uid)
  );

  const snapshot = await getDocs(q);

  let conversationId = null;

  snapshot.forEach(doc => {
    const data = doc.data();

    if (data.participants.includes(studentId)) {
      conversationId = doc.id;
    }
  });

  if (!conversationId) {
    const newConv = await addDoc(collection(db, "conversations"), {
      participants: [user.uid, studentId],
      participantNames: [user.displayName, studentName],
      lastMessage: "",
      lastTime: serverTimestamp()
    });

    conversationId = newConv.id;
  }

  navigate("/faculty/messages", {
    state: { conversationId }
  });
};

  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (userSnap) => {

      const users = userSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const unsubscribeCreatives = onSnapshot(collection(db, "creatives"), (creativeSnap) => {

        const creatives = creativeSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const studentList = users
          .filter((u: any) => u.role === "student")
          .map((student: any) => {

            const uploads = creatives.filter(
              (c: any) => c.uploadedByUid === student.id
            );

            const uploadCount = uploads.length;

            let totalLikes = 0;

            uploads.forEach((u: any) => {
              totalLikes += (u.likes?.length || 0);
            });

            const score = totalLikes + uploadCount * 5;

            return {
              id: student.id,
              name: student.displayName,
              roll: student.rollNumber,
              branch: student.branch,
              likes: totalLikes,
              uploads: uploadCount,
              score
            };

          })
          .sort((a, b) => b.score - a.score)
          .map((s, i) => ({
            ...s,
            rank: i + 1
          }));

        setStudents(studentList);

      });

      return () => unsubscribeCreatives();

    });

    return () => unsubscribeUsers();

  }, []);


  const getRankIcon = (rank: number) => {
      if (rank === 1) return <div className="text-3xl">🥇</div>;
      if (rank === 2) return <div className="text-3xl">🥈</div>;
      if (rank === 3) return <div className="text-3xl">🥉</div>;
      return <div className="w-8 h-8 rounded-full bg-[var(--bg-main)] flex items-center justify-center font-bold text-[var(--text-muted)]">{rank}</div>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="bg-yellow-100 p-3 rounded-full mb-4">
            <Trophy className="text-yellow-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-heading)]">Top Creators</h1>
          <p className="text-[var(--text-muted)] mt-2">Leading the campus in creativity and engagement</p>
      </div>

      <Card className="p-0 overflow-hidden border-t-4 border-t-[var(--accent-primary)]">
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                    <tr>
                        <th className="px-6 py-4 text-center w-24 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Branch</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Likes</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Score</th>
                        {userRole === 'faculty' && <th className="px-6 py-4 text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Action</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                    {students.map((s) => (
                        <tr key={s.id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                            <td className="px-6 py-4 flex justify-center items-center">
                                {getRankIcon(s.rank)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-[var(--text-heading)] text-lg">{s.name}</div>
                                <div className="text-sm text-[var(--text-muted)] font-mono uppercase">{s.roll}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="uppercase px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">{s.branch}</span>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-[var(--text-body)]">{s.likes}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="font-bold text-[var(--accent-primary)] text-lg">{s.score}</span>
                            </td>
                            {userRole === 'faculty' && (
                                <td className="px-6 py-4 text-right">
<Button
  variant="outline"
  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity py-1 px-3 text-sm h-8"
  onClick={() => openConversation(s.id,s.name)}
>
  <MessageCircle size={16} /> Chat
</Button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};

export default Leaderboard;