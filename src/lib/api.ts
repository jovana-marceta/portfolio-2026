import type { DaySlots } from "../../shared/slots.js";

export class ApiError extends Error {
  status?: number;
  /** The API isn't reachable at all (static preview, or the API server isn't running) */
  offline?: boolean;
  constructor(message: string, opts: { status?: number; offline?: boolean } = {}) {
    super(message);
    this.status = opts.status;
    this.offline = opts.offline;
  }
}

export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Can't reach the server", { offline: true });
  }
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new ApiError("Can't reach the API", { offline: true, status: res.status });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || "Request failed", { status: res.status });
  return data as T;
}

// ---------- Types shared with the server ----------
export interface PostSummary {
  slug: string; title: string; excerpt: string; tags: string[];
  publishedAt: string; updatedAt: string; minutes: number;
  /** Cover image URL ("" when the post has none) */
  cover: string;
}
export interface AvailabilityResponse { timezone: string; slotMinutes: number; days: DaySlots[] }
export interface BookingResult {
  id?: number; start: string; end: string; timezone?: string;
  ics?: string; cancel?: string; meetingLink?: string | null; preview?: boolean;
}
export interface BookingInput { start: string; name: string; email: string; topic: string; note: string; website: string }

// Admin
export interface AdminPost {
  id: number; slug: string; title: string; excerpt: string; content: string; tags: string; cover: string;
  published: number; published_at: string | null; created_at: string; updated_at: string;
}
export interface AdminBooking {
  id: number; start_utc: string; end_utc: string; name: string; email: string;
  topic: string; note: string; status: "confirmed" | "cancelled"; created_at: string;
}

/** Uploads an image file to the server and returns its public URL (/uploads/…) */
export async function uploadImage(file: File): Promise<string> {
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Upload failed", { status: res.status });
  return data.url as string;
}
