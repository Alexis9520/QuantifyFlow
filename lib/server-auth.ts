// lib/getCurrentUser.ts
import { cookies } from 'next/headers';
import { admin, initializeAdminApp } from './firebase-admin'; 
import { type DecodedIdToken } from 'firebase-admin/auth';
import 'server-only';

export interface CurrentUser {
  uid: string;
  email?: string;
  displayName?: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    await initializeAdminApp(); 
    
    const sessionCookie = cookies().get('session')?.value;

    if (!sessionCookie) {
      console.log("❌ SERVER AUTH: No session cookie found.");
      return null;
    }
    
    console.log("✅ SERVER AUTH: Session cookie found. Verifying...");
    
    const decodedToken: DecodedIdToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    
    console.log("⭐ SERVER AUTH: Token verified. User UID:", decodedToken.uid);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.email?.split('@')[0], 
    } as CurrentUser;

  } catch (error: any) {
    console.error("❌ SERVER AUTH ERROR: Cookie verification failed.", error.code);
    // SIMPLEMENTE RETORNA NULL. NO BORRES COOKIES AQUÍ.
    return null;
  }
}