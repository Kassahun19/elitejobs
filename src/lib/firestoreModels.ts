import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  getCountFromServer,
  writeBatch
} from "firebase/firestore";
import app from "../firebase";

const db = getFirestore(app);

export const Op = {
  or: Symbol('or'),
  and: Symbol('and'),
  like: Symbol('like'),
  gt: Symbol('gt'),
  gte: Symbol('gte'),
  lt: Symbol('lt'),
  lte: Symbol('lte'),
  ne: Symbol('ne'),
  in: Symbol('in'),
};

class FirestoreModel {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private toPlain(doc: any) {
    if (!doc.exists()) return null;
    const data = doc.data();
    // Convert Timestamps to Dates
    for (const key in data) {
      if (data[key] instanceof Timestamp) {
        data[key] = data[key].toDate();
      }
    }
    return { ...data, id: doc.id };
  }

  private createInstance(data: any) {
    if (!data) return null;
    return {
      ...data,
      get: (options?: { plain: boolean }) => data,
      update: async (updates: any) => {
        const id = data.id || data.uid || data.chatId || data.key;
        if (!id) throw new Error("Cannot update document without ID");
        await updateDoc(doc(db, this.collectionName, String(id)), {
          ...updates,
          updatedAt: Timestamp.now()
        });
        Object.assign(data, updates);
        return data;
      },
      destroy: async () => {
        const id = data.id || data.uid || data.chatId || data.key;
        if (!id) throw new Error("Cannot delete document without ID");
        await deleteDoc(doc(db, this.collectionName, String(id)));
      },
      save: async () => {
        const id = data.id || data.uid || data.chatId || data.key;
        if (!id) throw new Error("Cannot save document without ID");
        await setDoc(doc(db, this.collectionName, String(id)), {
          ...data,
          updatedAt: Timestamp.now()
        });
      },
      increment: async (field: string, amount: number = 1) => {
        const id = data.id || data.uid || data.chatId || data.key;
        if (!id) throw new Error("Cannot increment document without ID");
        const docRef = doc(db, this.collectionName, String(id));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const currentVal = docSnap.data()[field] || 0;
          await updateDoc(docRef, {
            [field]: currentVal + amount,
            updatedAt: Timestamp.now()
          });
          data[field] = currentVal + amount;
        }
      }
    };
  }

  async findOne(options: any = {}) {
    const results = await this.findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findByPk(id: string | number) {
    if (!id) return null;
    const docSnap = await getDoc(doc(db, this.collectionName, String(id)));
    return this.createInstance(this.toPlain(docSnap));
  }

  async findAll(options: any = {}) {
    let q = collection(db, this.collectionName);
    const constraints: any[] = [];

    if (options.where) {
      const orOp = Op.or;
      if (options.where[orOp]) {
        // Basic OR support: run multiple queries and merge results
        const orConditions = options.where[orOp];
        const allResults = await Promise.all(orConditions.map((condition: any) => 
          this.findAll({ where: condition, limit: options.limit })
        ));
        // Flatten and deduplicate by ID
        const seen = new Set();
        const merged = [];
        for (const resultSet of allResults) {
          for (const item of resultSet) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
        }
        return merged;
      }

      for (const key in options.where) {
        const value = options.where[key];
        if (typeof value === 'object' && value !== null) {
          // Handle complex operators
          if (value[Op.in]) {
            constraints.push(where(key, 'in', value[Op.in]));
          } else if (value[Op.gt]) {
            constraints.push(where(key, '>', value[Op.gt]));
          } else if (value[Op.gte]) {
            constraints.push(where(key, '>=', value[Op.gte]));
          } else if (value[Op.lt]) {
            constraints.push(where(key, '<', value[Op.lt]));
          } else if (value[Op.lte]) {
            constraints.push(where(key, '<=', value[Op.lte]));
          } else if (value[Op.ne]) {
            constraints.push(where(key, '!=', value[Op.ne]));
          }
        } else {
          constraints.push(where(key, '==', value));
        }
      }
    }

    if (options.order) {
      options.order.forEach((order: any) => {
        constraints.push(orderBy(order[0], order[1].toLowerCase()));
      });
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const finalQuery = query(q, ...constraints);
    const querySnapshot = await getDocs(finalQuery);
    return querySnapshot.docs.map(doc => this.createInstance(this.toPlain(doc)));
  }

  async create(data: any) {
    const id = data.id || data.uid || data.chatId || data.key || Timestamp.now().toMillis().toString();
    const docRef = doc(db, this.collectionName, String(id));
    const finalData = {
      ...data,
      id: String(id),
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, finalData);
    return this.createInstance(finalData);
  }

  async count(options: any = {}) {
    let q = collection(db, this.collectionName);
    const constraints: any[] = [];
    if (options.where) {
      for (const key in options.where) {
        constraints.push(where(key, '==', options.where[key]));
      }
    }
    const snapshot = await getCountFromServer(query(q, ...constraints));
    return snapshot.data().count;
  }

  async bulkCreate(records: any[]) {
    const results = [];
    for (const record of records) {
      results.push(await this.create(record));
    }
    return results;
  }

  async destroy(options: any = {}) {
    if (options.where) {
      const records = await this.findAll({ where: options.where });
      for (const record of records) {
        await record.destroy();
      }
    }
  }

  async upsert(data: any) {
    const id = data.id || data.uid || data.chatId || data.key;
    if (!id) throw new Error("Upsert requires an ID");
    const docRef = doc(db, this.collectionName, String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    } else {
      await setDoc(docRef, { 
        ...data, 
        createdAt: Timestamp.now(), 
        updatedAt: Timestamp.now() 
      });
    }
    return [this.createInstance(data), !docSnap.exists()];
  }
}

export const User = new FirestoreModel('users');
export const Job = new FirestoreModel('jobs');
export const Receipt = new FirestoreModel('receipts');
export const Notification = new FirestoreModel('notifications');
export const BotUser = new FirestoreModel('bot_users');
export const System = new FirestoreModel('system');
export const Application = new FirestoreModel('applications');
export const Message = new FirestoreModel('messages');
export const AuditLog = new FirestoreModel('audit_logs');
export const Transaction = new FirestoreModel('transactions');

export const initDB = async () => {
  console.log("✅ [FIRESTORE] Database initialized (Firestore is serverless).");
};
