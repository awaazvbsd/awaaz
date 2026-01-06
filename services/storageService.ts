import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";

const SYNC_QUEUE_KEY = 'awaaz_sync_queue';

interface SyncItem {
    id: string;
    key: string;
    data: any;
    timestamp: number;
    collection: string;
    userId: string;
}

export const StorageService = {
    /**
     * Check if a user exists in Firebase (for PIN availability)
     */
    async checkUserExists(userId: string): Promise<boolean> {
        if (!navigator.onLine) return false;
        try {
            const docRef = doc(db, "users", userId, "state", "userData");
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (e) {
            console.error("Error checking user existence:", e);
            return false;
        }
    },

    /**
     * Get User Data from Firebase directly (Auth fallback)
     */
    async getUserDataFromFirebase(userId: string): Promise<any | null> {
        if (!navigator.onLine) return null;
        try {
            const docRef = doc(db, "users", userId, "state", "userData");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (e) {
            console.error("Error fetching user data from Firebase:", e);
            return null;
        }
    },

    /**
     * Set item in Hybrid Storage (Local First, Firebase Async)
     */
    async setItem(key: string, data: any, userId: string, collectionName: string = 'state') {
        const timestamp = Date.now();

        // Ensure data is an object before spreading to prevent index-based keys (e.g. "0": "{", "1": "f")
        let processedData: any;
        if (typeof data === 'string') {
            try {
                // Try to parse if it's a JSON string
                processedData = JSON.parse(data);
            } catch (e) {
                // If not JSON, wrap it
                processedData = { value: data };
            }
        } else if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            processedData = { value: data };
        } else {
            processedData = { ...data };
        }

        const dataWithMeta = {
            ...processedData,
            _updatedAt: timestamp,
            _userId: userId
        };

        // 1. Save to Local Storage immediately
        try {
            localStorage.setItem(key, JSON.stringify(dataWithMeta));
        } catch (e) {
            console.error('Local Storage error:', e);
        }

        // 2. Try to sync to Firebase
        try {
            if (navigator.onLine) {
                const docRef = doc(db, "users", userId, collectionName, key);
                await setDoc(docRef, dataWithMeta, { merge: true });
                console.log(`Synced ${key} to Firebase`);
            } else {
                this.addToSyncQueue(key, dataWithMeta, userId, collectionName);
            }
        } catch (e) {
            console.warn(`Firebase sync failed for ${key}, queuing for later.`, e);
            this.addToSyncQueue(key, dataWithMeta, userId, collectionName);
        }

        // Dispatch event for UI
        this.notifySyncStatus();
    },

    /**
     * Get item from Hybrid Storage (Local First)
     */
    getItem<T>(key: string): T | null {
        const localData = localStorage.getItem(key);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                // Unwrap if it was wrapped for Firebase
                if (parsed && typeof parsed === 'object' && 'value' in parsed && Object.keys(parsed).length <= 3 && ('_updatedAt' in parsed || true)) {
                    // Check if it's a wrapped primitive or array
                    // The wrapper usually has 'value', '_updatedAt', and '_userId'
                    return parsed.value as T;
                }
                return parsed as T;
            } catch (e) {
                console.error(`Error parsing local data for ${key}:`, e);
            }
        }
        return null;
    },

    /**
     * Get raw item containing metadata (for internal use)
     */
    getRawItem(key: string): any | null {
        const localData = localStorage.getItem(key);
        if (localData) {
            try {
                return JSON.parse(localData);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    /**
     * Pull global shared data (for Teacher Dashboard)
     */
    async pullGlobalData(collections: string[] = ['global']) {
        if (!navigator.onLine) {
            console.log('[StorageService] pullGlobalData: Offline, skipping');
            return;
        }

        // Use the teacher ID for global data (must match where plans are saved)
        const globalId = '9999';
        console.log(`[StorageService] pullGlobalData: Fetching from users/${globalId}/...`);

        for (const coll of collections) {
            try {
                // If it's the global collection, we might store it under a specific user or a root.
                // Based on App.tsx, allStudentsData is saved with studentCode or 'admin'
                const q = query(collection(db, "users", globalId, coll));
                const querySnapshot = await getDocs(q);

                console.log(`[StorageService] pullGlobalData: Found ${querySnapshot.size} documents in ${coll}`);

                querySnapshot.forEach((docSnap) => {
                    const remoteData = docSnap.data() as any;
                    const localKey = docSnap.id;
                    const localData = this.getItem(localKey) as any;

                    console.log(`[StorageService] Document: ${localKey}, Remote updatedAt: ${remoteData._updatedAt}`);

                    if (!localData || (remoteData._updatedAt > (localData._updatedAt || 0))) {
                        localStorage.setItem(localKey, JSON.stringify(remoteData));
                        console.log(`[StorageService] Updated local storage for ${localKey} from Firebase`);

                        // Notify listeners that this key has been updated
                        window.dispatchEvent(new CustomEvent('storage_key_updated', {
                            detail: { key: localKey, data: remoteData }
                        }));
                    }
                });
            } catch (e) {
                console.error(`[StorageService] Error pulling global collection ${coll}:`, e);
            }
        }
    },

    /**
     * Sync from Firebase (Overwrite local if newer)
     */
    async pullFromFirebase(userId: string, collections: string[] = ['state', 'analysis']) {
        if (!navigator.onLine) return;

        for (const coll of collections) {
            try {
                const q = query(collection(db, "users", userId, coll));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((docSnap) => {
                    const remoteData = docSnap.data() as any;
                    const localKey = docSnap.id;
                    const localData = this.getItem(localKey) as any;

                    // Conflict Resolution: Only update if remote is newer or local is missing
                    if (!localData || (remoteData._updatedAt > (localData._updatedAt || 0))) {
                        localStorage.setItem(localKey, JSON.stringify(remoteData));
                        console.log(`Updated local storage for ${localKey} from Firebase`);

                        // Notify listeners that this key has been updated
                        window.dispatchEvent(new CustomEvent('storage_key_updated', {
                            detail: { key: localKey, data: remoteData }
                        }));
                    }
                });
            } catch (e) {
                console.error(`Error pulling collection ${coll}:`, e);
            }
        }
    },

    /**
     * Add item to the offline sync queue
     */
    addToSyncQueue(key: string, data: any, userId: string, collection: string) {
        const queue = this.getSyncQueue();
        const newItem: SyncItem = {
            id: `${key}_${Date.now()}`,
            key,
            data,
            timestamp: Date.now(),
            collection,
            userId
        };

        // Replace any existing pending sync for the same key to avoid redundant writes
        const filteredQueue = queue.filter(item => item.key !== key);
        filteredQueue.push(newItem);

        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
        this.notifySyncStatus();
    },

    /**
     * Process the offline sync queue
     */
    async processSyncQueue() {
        if (!navigator.onLine) return;

        const queue = this.getSyncQueue();
        if (queue.length === 0) return;

        console.log(`Processing sync queue (${queue.length} items)...`);
        const remainingItems: SyncItem[] = [];

        for (const item of queue) {
            try {
                const docRef = doc(db, "users", item.userId, item.collection, item.key);
                await setDoc(docRef, item.data, { merge: true });
                console.log(`Successfully synced queued item: ${item.key}`);
            } catch (e) {
                console.error(`Failed to sync queued item ${item.key}:`, e);
                remainingItems.push(item);
            }
        }

        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingItems));
        this.notifySyncStatus();
    },

    getSyncQueue(): SyncItem[] {
        const stored = localStorage.getItem(SYNC_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    },


    notifySyncStatus() {
        const queue = this.getSyncQueue();
        window.dispatchEvent(new CustomEvent('awaaz_sync_status', {
            detail: {
                isOnline: navigator.onLine,
                pendingItems: queue.length
            }
        }));
    },

    /**
     * Remove item from local storage
     */
    removeItem(key: string, userId: string, collectionName: string = 'state'): void {
        localStorage.removeItem(key);
        // Optionally: sync deletion to Firebase if needed. 
        // For now, we mainly use this for local session cleanup.
    },

    /**
     * Subscribe to real-time updates for Session Plans
     */
    _sessionPlanUnsubscribe: null as Unsubscribe | null,

    subscribeToSessionPlans() {
        if (!navigator.onLine) return;

        // Prevent multiple subscriptions
        if (this._sessionPlanUnsubscribe) return;

        console.log('[StorageService] Subscribing to session plans...');
        const plansRef = doc(db, "users", "9999", "global", "awaaz_session_plans");

        this._sessionPlanUnsubscribe = onSnapshot(plansRef, (docSnap) => {
            if (docSnap.exists()) {
                const remoteData = docSnap.data();
                const key = 'awaaz_session_plans';

                console.log('[StorageService] Received real-time update for session plans');

                // Update local storage
                localStorage.setItem(key, JSON.stringify(remoteData));

                // Notify listeners
                window.dispatchEvent(new CustomEvent('storage_key_updated', {
                    detail: { key, data: remoteData }
                }));
            }
        }, (error) => {
            console.error('[StorageService] Session plan subscription error:', error);
        });
    },

    unsubscribeFromSessionPlans() {
        if (this._sessionPlanUnsubscribe) {
            console.log('[StorageService] Unsubscribing from session plans');
            this._sessionPlanUnsubscribe();
            this._sessionPlanUnsubscribe = null;
        }
    }
};

// Auto-sync listeners
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        StorageService.processSyncQueue();
        StorageService.notifySyncStatus();
    });
    window.addEventListener('offline', () => {
        StorageService.notifySyncStatus();
    });
}
