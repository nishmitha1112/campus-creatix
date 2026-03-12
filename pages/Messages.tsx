import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Card, Input, Button } from '../components/Common';
import { Send, User as UserIcon, Search, MoreVertical } from 'lucide-react';
import { updateDoc, doc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import{
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    serverTimestamp,
}from "firebase/firestore";
import { db } from "../firebase";
// Local interfaces for mock state
interface ChatSession {
  id: string;
  name: string;
  role: string;
  lastMsg: string;
  lastMsgTime: string;
  unread: boolean;
}

interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
}

const Messages: React.FC<{ user: User }> = ({ user }) => {
  const location = useLocation();
const conversationIdFromPage = location.state?.conversationId;
const otherUserNameFromPage = location.state?.otherUserName;
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
 useEffect(() => {

  if (conversationIdFromPage && !selectedChatId) {
    setSelectedChatId(conversationIdFromPage);
  }

}, [conversationIdFromPage,selectedChatId]);
  const [inputMsg, setInputMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chats,setChats] = useState<ChatSession[]>([]);
  const [messages,setMessages] = useState<any[]>([]);


  const activeChat = chats.find(c => c.id === selectedChatId);
  useEffect(() => {

  if (!selectedChatId) return;

  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", selectedChatId),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setMessages(data);

  });

  return () => unsubscribe();

}, [selectedChatId]);
useEffect(() => {

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {

    const data = snapshot.docs.map(doc => {

      const conv: any = doc.data();

      return {
        id: doc.id,
       name: otherUserNameFromPage ||
      conv.participantNames?.find(
        (n: string) => n !== user.displayName
      ) ||
      "Chat",
        role: "Conversation",
        lastMsg: conv.lastMessage || "",
        lastMsgTime: conv.lastTime?.toDate?.().toLocaleTimeString() || "",
        unread: false
      };

    });

    setChats(data);

  });

  return () => unsubscribe();

}, [user.uid]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChatId]);

const handleChatSelect = async (id: string) => {

  setSelectedChatId(id);

  // mark as read
  setChats(prev =>
    prev.map(c => c.id === id ? { ...c, unread: false } : c)
  );

};

  const handleSend = async () => {

  if (!inputMsg.trim() || !selectedChatId) return;

  await addDoc(collection(db, "messages"), {
    conversationId: selectedChatId,
    senderId: user.uid,
    text: inputMsg,
    createdAt: serverTimestamp()
  });
await updateDoc(doc(db, "conversations", selectedChatId), {
  lastMessage: inputMsg,
  lastTime: serverTimestamp()
});
  setInputMsg("");

};

const filteredChats = chats;

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 md:gap-6">
      {/* Sidebar - Chat List */}
      <Card className={`flex flex-col p-0 overflow-hidden ${selectedChatId ? 'hidden md:flex md:w-1/3' : 'w-full'}`}>
        <div className="p-4 border-b border-[var(--border-default)] space-y-3">
            <h2 className="font-bold text-lg text-[var(--text-heading)]">Messages</h2>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={16} />
                <Input 
                    placeholder="Search..." 
                    className="pl-9 py-1.5 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {filteredChats.map(chat => (
                <div 
                    key={chat.id} 
                    onClick={() => handleChatSelect(chat.id)}
                    className={`p-4 border-b border-[var(--border-default)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors ${selectedChatId === chat.id ? 'bg-[var(--bg-secondary)] border-l-4 border-l-[var(--accent-primary)]' : 'border-l-4 border-l-transparent'}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium ${chat.unread ? 'text-[var(--text-heading)] font-bold' : 'text-[var(--text-body)]'}`}>{chat.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{chat.lastMsgTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-[var(--text-muted)] uppercase mb-1">{chat.role}</div>
                        {chat.unread && <div className="w-2.5 h-2.5 bg-[var(--danger)] rounded-full shadow-sm"></div>}
                    </div>
                    <div className={`text-sm truncate ${chat.unread ? 'text-[var(--text-heading)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {chat.lastMsg}
                    </div>
                </div>
            ))}
            {filteredChats.length === 0 && (
                <div className="p-8 text-center text-[var(--text-muted)] text-sm">No chats found.</div>
            )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className={`flex-1 flex-col p-0 overflow-hidden ${selectedChatId ? 'flex' : 'hidden md:flex'}`}>
        {selectedChatId && activeChat ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            className="md:hidden p-1 h-8 w-8" 
                            onClick={() => setSelectedChatId(null)}
                        >
                            ←
                        </Button>
                        <div className="w-10 h-10 rounded-full bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border-default)] text-[var(--text-muted)]">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-heading)]">{activeChat.name}</h3>
                            <p className="text-xs text-[var(--text-muted)]">{activeChat.role}</p>
                        </div>
                    </div>
                    <button className="text-[var(--text-muted)] hover:text-[var(--text-heading)]">
                        <MoreVertical size={20} />
                    </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 bg-white p-4 overflow-y-auto space-y-4">
                    <div className="text-center text-xs text-[var(--text-muted)] my-4">Today</div>
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                                msg.senderId === user.uid 
                                ? 'bg-[var(--accent-primary)] text-white rounded-br-none' 
                                : 'bg-[var(--bg-main)] text-[var(--text-body)] border border-[var(--border-default)] rounded-bl-none'
                            }`}>
                                <div>{msg.text}</div>
                                <div className={`text-[10px] mt-1 text-right ${msg.senderId === user.uid ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)]'}`}>
                                   {msg.createdAt?.toDate?.().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-card)]">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Type a message..." 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            className="flex-1"
                        />
                        <Button onClick={handleSend} className="w-12 h-10 p-0 flex items-center justify-center">
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 bg-[var(--bg-secondary)] flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center">
                <div className="w-16 h-16 bg-[var(--input-bg)] rounded-full flex items-center justify-center mb-4">
                    <UserIcon size={32} className="opacity-20" />
                </div>
                <h3 className="font-bold text-lg text-[var(--text-heading)]">Select a conversation</h3>
                <p className="max-w-xs mt-2 text-sm">Choose a chat from the sidebar to start messaging {user.role === 'faculty' ? 'students' : 'faculty'}.</p>
            </div>
        )}
      </Card>
    </div>
  );
};

export default Messages;