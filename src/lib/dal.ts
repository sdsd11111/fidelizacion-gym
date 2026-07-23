import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_2026';
const key = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'MANAGER' | 'TRAINER';
  email: string;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decryptSession(sessionToken?: string): Promise<SessionPayload | null> {
  if (!sessionToken) return null;
  try {
    const { payload } = await jwtVerify(sessionToken, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Data Access Layer (DAL)
 * Extracts authenticated tenantId from cookie/session safely on the server.
 * Never trust a tenantId supplied by client request params.
 */
export async function getAuthenticatedSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = await decryptSession(sessionToken);

  if (!session || !session.tenantId || !session.userId) {
    return null;
  }

  return session;
}

export async function verifyTenantAccess() {
  const session = await getAuthenticatedSession();
  if (!session) {
    throw new Error('UNAUTHORIZED: No valid session found.');
  }

  // Fetch current user and tenant from DB to ensure active state
  const staffUser = await prisma.staff.findFirst({
    where: {
      id: session.userId,
      tenantId: session.tenantId,
      isActive: true,
    },
    include: {
      tenant: true,
      branch: true,
      businessUnit: true,
    },
  });

  if (!staffUser) {
    throw new Error('FORBIDDEN: User not active or does not belong to specified tenant.');
  }

  return {
    user: staffUser,
    tenantId: session.tenantId,
    role: staffUser.role,
  };
}
