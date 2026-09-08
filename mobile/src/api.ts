import type { StudentProfile, AwardLetter, TimelineTask, FinalFiveItem } from '@shared';
import { API_BASE_URL } from './config';

// The signed-in user, as returned by the backend (never includes the hash).
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  entitlementExpiresAt: string | null;
  active: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

// Thin fetch wrapper. Native clients authenticate with a Bearer token (there is
// no cookie jar on device), which the backend accepts as of Phase 8.0.
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const url = `${API_BASE_URL}${path}`;
  const method = opts.method ?? 'GET';
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

  // The production origin (behind a Cloudflare tunnel) intermittently returns a
  // transient 502/503/504. GET/PUT/DELETE are idempotent, so retry them a few
  // times with backoff; POST is not retried (it may create duplicates).
  const idempotent = method === 'GET' || method === 'PUT' || method === 'DELETE';
  const maxAttempts = idempotent ? 4 : 1;
  const isTransientStatus = (s: number) => s === 502 || s === 503 || s === 504;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method, headers, body });

      if (isTransientStatus(res.status) && attempt < maxAttempts) {
        await sleep(250 * 2 ** (attempt - 1)); // 250ms, 500ms, 1s
        continue;
      }

      const text = await res.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Non-JSON body (an HTML error page, gateway timeout, etc.) — surface
          // what we actually got instead of a cryptic parse error.
          throw new Error(
            `Server returned non-JSON (HTTP ${res.status}) for ${method} ${url}: ${text.slice(0, 120)}`,
          );
        }
      }
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      return data as T;
    } catch (err) {
      // A network-level failure (connection reset, offline). Retry idempotent
      // requests; otherwise give up.
      lastError = err;
      const isNetworkError = err instanceof TypeError;
      if (idempotent && isNetworkError && attempt < maxAttempts) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request<{ user: AuthUser }>('/auth/me', { token }),
  deleteAccount: (token: string) =>
    request<{ ok: boolean }>('/auth/account', { method: 'DELETE', token }),

  // Native OAuth: post the provider's identity token; the backend verifies it
  // (signature + issuer + audience) and returns our own session token.
  appleNative: (identityToken: string) =>
    request<AuthResponse>('/auth/apple/native', { method: 'POST', body: { identityToken } }),
  googleNative: (idToken: string) =>
    request<AuthResponse>('/auth/google/native', { method: 'POST', body: { idToken } }),

  // ── Students ──────────────────────────────────────────────────────
  listStudents: (token: string) =>
    request<{ students: StudentSummary[] }>('/students', { token }),
  createStudent: (
    token: string,
    seed: { profile?: Partial<StudentProfile>; timelineTasks?: TimelineTask[] } = {},
  ) => request<StudentBundle>('/students', { method: 'POST', token, body: seed }),
  getStudent: (token: string, id: string) =>
    request<StudentBundle>(`/students/${id}`, { token }),
  patchStudent: (token: string, id: string, fields: Partial<StudentProfile>) =>
    request<{ profile: StudentProfile }>(`/students/${id}`, {
      method: 'PATCH',
      token,
      body: fields,
    }),

  // ── Award letters (per student; upsert by client-generated id) ─────
  putAwardLetter: (token: string, studentId: string, letter: AwardLetter) =>
    request<{ awardLetter: AwardLetter }>(
      `/students/${studentId}/award-letters/${letter.id}`,
      { method: 'PUT', token, body: letter },
    ),
  deleteAwardLetter: (token: string, studentId: string, letterId: string) =>
    request<{ ok: boolean }>(`/students/${studentId}/award-letters/${letterId}`, {
      method: 'DELETE',
      token,
    }),

  // ── Timeline tasks (per student; upsert by client-provided id) ────
  putTask: (token: string, studentId: string, task: TimelineTask) =>
    request<{ task: TimelineTask }>(`/students/${studentId}/tasks/${task.id}`, {
      method: 'PUT',
      token,
      body: task,
    }),
  deleteTask: (token: string, studentId: string, taskId: string) =>
    request<{ ok: boolean }>(`/students/${studentId}/tasks/${taskId}`, {
      method: 'DELETE',
      token,
    }),

  // ── Saved colleges (lightweight bookmark; keyed by collegeId) ─────
  addSavedCollege: (token: string, studentId: string, collegeId: string) =>
    request<{ ok: boolean }>(`/students/${studentId}/saved-colleges`, {
      method: 'POST',
      token,
      body: { collegeId },
    }),
  removeSavedCollege: (token: string, studentId: string, collegeId: string) =>
    request<{ ok: boolean }>(`/students/${studentId}/saved-colleges/${collegeId}`, {
      method: 'DELETE',
      token,
    }),

  // ── Final Five (per student; keyed by collegeId) ──────────────────
  addFinalFive: (
    token: string,
    studentId: string,
    body: { collegeId: string; category?: FinalFiveItem['category']; targetMajor?: string },
  ) =>
    request<{ item: FinalFiveItem }>(`/students/${studentId}/final-five`, {
      method: 'POST',
      token,
      body,
    }),
  patchFinalFive: (
    token: string,
    studentId: string,
    collegeId: string,
    updates: Partial<FinalFiveItem>,
  ) =>
    request<{ item: FinalFiveItem }>(`/students/${studentId}/final-five/${collegeId}`, {
      method: 'PATCH',
      token,
      body: updates,
    }),
  removeFinalFive: (token: string, studentId: string, collegeId: string) =>
    request<{ ok: boolean }>(`/students/${studentId}/final-five/${collegeId}`, {
      method: 'DELETE',
      token,
    }),

  // ── College Scorecard (net price by income) ───────────────────────
  scorecardStatus: () => request<{ enabled: boolean }>('/scorecard/status'),
  searchColleges: (token: string, q: string, state?: string) => {
    const params = new URLSearchParams({ q });
    if (state) params.set('state', state);
    return request<{ results: CollegeFinancials[] }>(
      `/scorecard/search?${params.toString()}`,
      { token },
    );
  },
  getCollegeByUnitId: (token: string, unitId: number) =>
    request<{ financials: CollegeFinancials }>(`/scorecard/${unitId}`, { token }),
};

// A row from GET /api/students (list view — not the full profile).
export interface StudentSummary {
  id: string;
  fullName: string;
  gradYear: number;
  currentGrade: string;
  updatedAt: string;
}

// A College Scorecard result (mirrors the server's Financials shape). Net price
// is what a family actually pays after aid, by income band — the headline number.
export interface CollegeFinancials {
  unitId: number;
  name: string;
  city: string;
  state: string;
  ownership: 'public' | 'private' | 'other';
  enrollment: number | null;
  sat25: number | null;
  sat75: number | null;
  websiteUrl: string | null;
  netPriceByIncome: {
    band0_30k: number | null;
    band30_48k: number | null;
    band48_75k: number | null;
    band75_110k: number | null;
    band110k_plus: number | null;
  };
  costOfAttendance: number | null;
  admissionRate: number | null;
  medianDebt: number | null;
  earnings10yr: number | null;
  earnings6yr: number | null;
  netPriceCalculatorUrl: string | null;
  source: string;
  vintage: string;
}

// The full per-student bundle from GET /api/students/:id. Only `profile` and the
// counts are used on mobile so far; the rest are typed loosely.
export interface StudentBundle {
  profile: StudentProfile;
  savedColleges: string[];
  finalFive: FinalFiveItem[];
  timelineTasks: TimelineTask[];
  essays: unknown[];
  campusVisits: unknown[];
  awardLetters: AwardLetter[];
  courseEntries: unknown[];
}
