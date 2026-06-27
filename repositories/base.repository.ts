// ============================================================
// Generic Base Repository
// All domain repositories extend or compose this class.
// Centralizes Firestore CRUD operations and prevents duplication.
// ============================================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QueryConstraint,
  FirestoreDataConverter,
  Firestore,
  DocumentData,
  WithFieldValue,
  PartialWithFieldValue,
  DocumentReference,
} from 'firebase/firestore';
import {
  DocumentNotFoundError,
  WriteFailedError,
  ReadFailedError,
  DeleteFailedError,
  toRepositoryError,
} from './errors';

export {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
  type QueryConstraint,
};

/**
 * Options accepted by findMany().
 */
export interface FindManyOptions {
  /** Maximum number of documents to return. */
  limitCount?: number;
  /** Cursor document to paginate after. */
  startAfterDoc?: DocumentSnapshot;
  /** Additional Firestore query constraints (where, orderBy, etc.). */
  constraints?: QueryConstraint[];
}

/**
 * Paginated result returned by findMany().
 */
export interface PaginatedResult<T> {
  data: T[];
  /** The last document snapshot; pass to startAfterDoc for the next page. */
  lastDoc: QueryDocumentSnapshot | null;
  /** Whether more records are likely available. */
  hasMore: boolean;
}

/**
 * Generic base repository providing fundamental Firestore operations.
 * All concrete repositories should extend this class.
 *
 * @typeParam T - The application domain model.
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected readonly db: Firestore;
  protected readonly collectionName: string;
  protected readonly converter?: FirestoreDataConverter<T>;

  constructor(
    db: Firestore,
    collectionName: string,
    converter?: FirestoreDataConverter<T>,
  ) {
    this.db = db;
    this.collectionName = collectionName;
    this.converter = converter;
  }

  // ─── Collection / Document References ────────────────────────

  protected collectionRef() {
    if (this.converter) {
      return collection(this.db, this.collectionName).withConverter(this.converter);
    }
    return collection(this.db, this.collectionName);
  }

  protected docRef(id: string): DocumentReference {
    if (this.converter) {
      return doc(this.db, this.collectionName, id).withConverter(this.converter);
    }
    return doc(this.db, this.collectionName, id);
  }

  // ─── Write Operations ─────────────────────────────────────────

  /**
   * Creates a new document with an auto-generated Firestore ID.
   * Returns the generated ID.
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const colRef = collection(this.db, this.collectionName);
      const docRef = await addDoc(colRef, data as WithFieldValue<DocumentData>);
      return docRef.id;
    } catch (err) {
      throw new WriteFailedError(this.collectionName, 'create', err);
    }
  }

  /**
   * Creates a document with a caller-specified ID using setDoc.
   * Overwrites the document if it already exists.
   */
  async set(id: string, data: Omit<T, 'id'>): Promise<void> {
    try {
      const ref = doc(this.db, this.collectionName, id);
      await setDoc(ref, data as WithFieldValue<DocumentData>);
    } catch (err) {
      throw new WriteFailedError(this.collectionName, 'set', err);
    }
  }

  /**
   * Partially updates a document. Only specified fields are written.
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    try {
      const ref = doc(this.db, this.collectionName, id);
      await updateDoc(ref, data as PartialWithFieldValue<DocumentData>);
    } catch (err) {
      throw new WriteFailedError(this.collectionName, 'update', err);
    }
  }

  /**
   * Permanently deletes a document by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      const ref = doc(this.db, this.collectionName, id);
      await deleteDoc(ref);
    } catch (err) {
      throw new DeleteFailedError(this.collectionName, id, err);
    }
  }

  // ─── Read Operations ──────────────────────────────────────────

  /**
   * Finds a single document by ID.
   * Throws DocumentNotFoundError if it does not exist.
   */
  async findById(id: string): Promise<T> {
    try {
      const ref = doc(this.db, this.collectionName, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new DocumentNotFoundError(this.collectionName, id);
      }
      return this.fromSnapshot(snap);
    } catch (err) {
      if (err instanceof DocumentNotFoundError) throw err;
      throw new ReadFailedError(this.collectionName, 'findById', err);
    }
  }

  /**
   * Returns multiple documents matching the given constraints, with optional
   * pagination via limit and startAfter cursor.
   */
  async findMany(options: FindManyOptions = {}): Promise<PaginatedResult<T>> {
    const { limitCount = 50, startAfterDoc, constraints = [] } = options;

    try {
      const colRef = collection(this.db, this.collectionName);
      const queryConstraints: QueryConstraint[] = [...constraints];

      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }
      queryConstraints.push(limit(limitCount));

      const q = query(colRef, ...queryConstraints);
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => this.fromSnapshot(d));
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

      return {
        data,
        lastDoc,
        hasMore: snap.docs.length === limitCount,
      };
    } catch (err) {
      throw new ReadFailedError(this.collectionName, 'findMany', err);
    }
  }

  /**
   * Checks if a document with the given ID exists.
   */
  async exists(id: string): Promise<boolean> {
    try {
      const ref = doc(this.db, this.collectionName, id);
      const snap = await getDoc(ref);
      return snap.exists();
    } catch (err) {
      throw new ReadFailedError(this.collectionName, 'exists', err);
    }
  }

  // ─── Snapshot Mapping ─────────────────────────────────────────

  /**
   * Maps a Firestore document snapshot to the domain model T.
   * Subclasses override this when a converter is not used.
   */
  protected fromSnapshot(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
    if (!snap.exists()) {
      throw new DocumentNotFoundError(this.collectionName, snap.id);
    }
    return { id: snap.id, ...snap.data() } as T;
  }

  // ─── Protected Helpers ────────────────────────────────────────

  /**
   * Utility: safely wraps any uncaught error as a RepositoryError.
   */
  protected wrap(err: unknown, fallback: string) {
    throw toRepositoryError(err, fallback);
  }
}
