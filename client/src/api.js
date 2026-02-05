// src/api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const registerUser = (data) =>
  request("/api/register", { method: "POST", body: data });
export const loginUser = (data) => request("/api/login", { method: "POST", body: data });
export const fetchEvents = () => request("/api/events");
export const createEvent = (data, token) =>
  request("/api/events", { method: "POST", body: data, token });
export const registerToEvent = (eventId, token) =>
  request(`/api/events/${eventId}/register`, { method: "POST", token });

/* Clubs & recruitments */
export const fetchClubs = () => request("/api/clubs");
export const createClub = (data, token) =>
  request("/api/clubs", { method: "POST", body: data, token });
export const joinClub = (clubId, token) =>
  request(`/api/clubs/${clubId}/join`, { method: "POST", token });

export const fetchRecruitments = () => request("/api/recruitments");
export const createRecruitment = (data, token) =>
  request("/api/recruitments", { method: "POST", body: data, token });
export const fetchRecruitingClubs = () => request("/api/clubs/recruiting");

/* helper: fetch events for user's clubs (server optional) */
export const fetchMyClubEvents = (token) =>
  request("/api/myclubs/events", token ? { token } : {});

/* default export for backwards compatibility */
export default {
  registerUser,
  loginUser,
  fetchEvents,
  createEvent,
  registerToEvent,
  fetchClubs,
  createClub,
  joinClub,
  fetchRecruitments,
  createRecruitment,
  fetchRecruitingClubs,
  fetchMyClubEvents,
};
