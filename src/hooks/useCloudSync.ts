import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAllLayoutsRaw, saveAllLayouts, STORAGE_KEY_LAYOUTS } from '../components/base-planner/layoutStorage';

export function useCloudSync() {
  const { user } = useAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    // Initial load from cloud
    const syncFromCloud = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.layouts) {
            const localLayouts = getAllLayoutsRaw();
            const cloudLayouts = data.layouts;
            
            const layoutMap = new Map();
            for (const l of localLayouts) {
              layoutMap.set(l.id, l);
            }
            
            let hasChanges = false;
            for (const cloudL of cloudLayouts) {
              const existing = layoutMap.get(cloudL.id);
              if (!existing || new Date(cloudL.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                layoutMap.set(cloudL.id, cloudL);
                hasChanges = true;
              }
            }
            
            // If local had layouts that cloud didn't have, we also have changes to push to cloud
            if (localLayouts.length > 0 && Array.from(layoutMap.values()).length > cloudLayouts.length) {
              hasChanges = true;
            }

            if (hasChanges || (!localLayouts.length && cloudLayouts.length > 0)) {
              const mergedLayouts = Array.from(layoutMap.values());
              syncingRef.current = true;
              try {
                saveAllLayouts(mergedLayouts);
                await setDoc(userDocRef, { layouts: mergedLayouts, updatedAt: new Date().toISOString() }, { merge: true });
              } finally {
                syncingRef.current = false;
              }
            }
          }
        } else {
          // Push initial local data to cloud
          const local = getAllLayoutsRaw();
          if (local.length > 0) {
            await setDoc(userDocRef, { layouts: local }, { merge: true });
          }
        }
      } catch (err) {
        console.error("Cloud sync error:", err);
      }
    };

    syncFromCloud();

    // Listen for local changes to push to cloud
    const handleStorageChange = async () => {
      if (syncingRef.current) return;
      try {
        syncingRef.current = true;
        const local = getAllLayoutsRaw();
        await setDoc(userDocRef, { layouts: local, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.error("Cloud save error:", err);
      } finally {
        syncingRef.current = false;
      }
    };

    // We can intercept the layoutStorage save function or listen to storage events
    // For React, maybe we can just poll or wrap the save function.
    // Instead of overriding, we can listen to the custom event if we emit one.
    // The existing code doesn't emit a custom event on save.
    // Let's hook into window storage event (only works across tabs).
    window.addEventListener("storage", handleStorageChange);
    // Let's also dispatch custom event in saveAllLayouts
    window.addEventListener("local-layout-saved", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-layout-saved", handleStorageChange);
    };
  }, [user]);
}
