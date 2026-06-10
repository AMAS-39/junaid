import { db } from "../config/firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Generic Firestore service — infrastructure only, no business rules.
 */
export const FirestoreService = {
  /**
   * @param {string} collectionName
   * @param {string} docId
   */
  ref(collectionName, docId) {
    return doc(db, collectionName, docId);
  },

  /**
   * @param {string} collectionName
   */
  collectionRef(collectionName) {
    return collection(db, collectionName);
  },

  /**
   * @param {string} collectionName
   * @param {string} docId
   */
  async getById(collectionName, docId) {
    const snap = await getDoc(doc(db, collectionName, docId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /**
   * @param {string} collectionName
   * @param {Record<string, unknown>} data
   * @param {string} [docId]
   */
  async create(collectionName, data, docId) {
    const payload = { ...data, createdAt: serverTimestamp() };

    if (docId) {
      await setDoc(doc(db, collectionName, docId), payload);
      return docId;
    }

    const ref = await addDoc(collection(db, collectionName), payload);
    return ref.id;
  },

  /**
   * @param {string} collectionName
   * @param {string} docId
   * @param {Record<string, unknown>} data
   */
  async update(collectionName, docId, data) {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * @param {string} collectionName
   * @param {string} docId
   */
  async remove(collectionName, docId) {
    await deleteDoc(doc(db, collectionName, docId));
  },

  /**
   * @param {string} collectionName
   * @param {Array<[string, string, unknown]>} filters - [field, op, value]
   * @param {{ orderByField?: string, orderDirection?: "asc"|"desc", limitCount?: number }} [options]
   */
  async query(collectionName, filters = [], options = {}) {
    const constraints = filters.map(([field, op, value]) => where(field, op, value));

    if (options.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || "desc"));
    }

    if (options.limitCount) {
      constraints.push(limit(options.limitCount));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  serverTimestamp,
};
