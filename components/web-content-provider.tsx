"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type WebContextType = {
  content: Record<string, any>;
  loading: boolean;
};

const WebContentContext = createContext<WebContextType>({
  content: {},
  loading: true,
});

export function WebContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "web_content"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newContent: Record<string, any> = {};
      snapshot.forEach((doc) => {
        newContent[doc.id] = doc.data();
      });
      setContent(newContent);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <WebContentContext.Provider value={{ content, loading }}>
      {children}
    </WebContentContext.Provider>
  );
}

export function useWebContent(sectionId: string) {
  const { content, loading } = useContext(WebContentContext);
  return {
    data: content[sectionId] || null,
    loading,
  };
}
