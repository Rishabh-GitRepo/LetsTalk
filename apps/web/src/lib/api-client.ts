export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiErrorBody = {
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;

  if (!response.ok) {
    throw new Error(body.message ?? `API error: ${response.status}`);
  }

  return body;
}