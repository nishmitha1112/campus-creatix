import React, { useState, useEffect } from "react";
import { CATEGORIES } from "../types";
import { Card, Input } from "../components/Common";
import { Search, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDocs } from "firebase/firestore";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";

import { db } from "../firebase";

interface FeedProps {
  userRole: "student" | "faculty";
  userId: string;
}

const Feed: React.FC<FeedProps> = ({ userRole, userId }) => {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);

  // 🔥 Fetch creatives from Firestore
  useEffect(() => {
    if (!db) return;

 const unsubscribe = onSnapshot(
  query(collection(db, "creatives"), orderBy("createdAt", "desc")),
  (snapshot) => {
    const fetched = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setPosts(fetched);
  }
);
    return () => unsubscribe();
  }, []);
const handlePostClick = (post: any) => {
  if (userRole === "faculty") {
    navigate(`/faculty/editor/${post.id}`, {
      state: { imageUrl: post.imageUrl }
    });
  }
};

// ❤️ LIKE
  const handleLike = async (post: any) => {
    if (!db) return;
 const liked = post.likes || [];

if (liked.includes(userId)) {
  return;
}

    const ref = doc(db, "creatives", post.id);

    await updateDoc(ref, {
      likes: [...liked, userId],
    });
  };

  // ⭐ RATE
  const handleRate = async (post: any, value: number) => {
    if (!db) return;

    const ratings = post.ratings || [];
    const existing = ratings.find((r: any) => r.user === userId);

    let newRatings;

    if (existing) {
      newRatings = ratings.map((r: any) =>
        r.user === userId ? { ...r, value } : r
      );
    } else {
      newRatings = [...ratings, { user: userId, value }];
    }

    const ref = doc(db, "creatives", post.id);

    await updateDoc(ref, {
      ratings: newRatings,
    });
  };

  const trendingPosts = [...posts]
  .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
  .slice(0, 3);
    const filteredPosts = posts
  .filter((p) => !trendingPosts.some((t) => t.id === p.id))
  .filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;

   const matchesSearch =
  (p.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
  (p.title || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const formatDate = (date: any) => {
    try {
      if (!date?.seconds) return "";

      const d = new Date(date.seconds * 1000);

      return `Uploaded ${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <Input
          placeholder="Search creatives..."
          className="pl-10 rounded-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`px-5 py-1.5 rounded-full border ${
            selectedCategory === "All" ? "bg-blue-500 text-white" : "bg-white"
          }`}
        >
          All
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-1.5 rounded-full border ${
              selectedCategory === cat ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
<h2 className="text-xl font-bold mt-6">🔥 Trending Creatives</h2>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {trendingPosts.map((post) => (
    <Card key={post.id} className="overflow-hidden border-2 border-yellow-400">

  <div
    className="aspect-video cursor-pointer"
    onClick={() =>
  navigate(`/faculty/editor/${post.id}`, {
    state: {
      imageUrl: post.imageUrl
    }
  })
}
  >
    <img
      src={post.imageUrl}
      className="w-full h-full object-cover"
    />
  </div>

  <div className="p-4">

    <h3 className="font-bold">{post.title}</h3>

    <p className="text-xs text-gray-500">
      by {post.studentName}
    </p>

    <div className="flex justify-between mt-3">

      {/* LIKE */}
      <button
        onClick={() => handleLike(post)}
        className="flex items-center gap-1"
      >
        <Heart
          size={20}
          className={
            (post.likes || []).includes(userId)
              ? "text-red-500 fill-current"
              : "text-gray-400"
          }
        />
        <span>{post.likes?.length || 0}</span>
      </button>

      {/* RATING */}
      <div className="flex gap-1">
        {[1,2,3,4,5].map((s) => (
          <Star
            key={s}
            size={18}
            onClick={() => handleRate(post, s)}
            className={
              s <= (post.ratings?.find((r:any)=>r.user===userId)?.value || 0)
                ? "text-yellow-400 fill-current"
                : "text-gray-300 cursor-pointer"
            }
          />
        ))}
      </div>

    </div>

  </div>

</Card>
  ))}
</div>
      {/* Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
   
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const liked = post.likes || [];
            const isLiked = liked.includes(userId);

            const rating =
              post.ratings?.find((r: any) => r.user === userId)?.value || 0;

            return (
              <Card key={post.id} className="overflow-hidden">
                <div
                  className="aspect-video cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <img
                    src={post.imageUrl}
                    alt="Creative"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="text-xs text-gray-500">
                    by {post.studentName}
                  </p>

                  <div className="flex justify-between mt-3">
                    <button
                      onClick={() => handleLike(post)}
                      className="flex items-center gap-1"
                    >
                      <Heart
                        size={20}
                        className={
                          isLiked
                            ? "text-red-500 fill-current"
                            : "text-gray-400"
                        }
                      />
                      <span>{liked.length}</span>
                    </button>

                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={18}
                          onClick={() => handleRate(post, s)}
                          className={
                            s <= rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300 cursor-pointer"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mt-2">
                    {formatDate(post.createdAt)}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center text-gray-500 py-10">
            No creatives yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;