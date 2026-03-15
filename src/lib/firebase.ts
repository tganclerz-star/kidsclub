import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
});
export const auth = getAuth(app);
export default app;

// ── REST API fallback for when SDK connection is blocked ──

const REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

function parseFirestoreValue(val: any): any {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue) return (val.arrayValue.values || []).map(parseFirestoreValue);
  if (val.mapValue) {
    const obj: any = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) obj[k] = parseFirestoreValue(v);
    return obj;
  }
  return null;
}

function parseDoc(doc: any): any {
  const id = doc.name.split('/').pop();
  const data: any = {};
  for (const [k, v] of Object.entries(doc.fields || {})) data[k] = parseFirestoreValue(v);
  return { id, ...data };
}

export async function restGet(collectionName: string): Promise<any[]> {
  const res = await fetch(`${REST_BASE}/${collectionName}?key=${firebaseConfig.apiKey}`);
  if (!res.ok) throw new Error(`Firestore REST error: ${res.status}`);
  const json = await res.json();
  return (json.documents || []).map(parseDoc);
}

export async function restQuery(collectionName: string, field: string, op: string, value: string): Promise<any[]> {
  const res = await fetch(
    `${REST_BASE}:runQuery?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: op,
              value: { stringValue: value },
            },
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Firestore REST error: ${res.status}`);
  const json = await res.json();
  return json.filter((r: any) => r.document).map((r: any) => parseDoc(r.document));
}
