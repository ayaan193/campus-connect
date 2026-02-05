// src/ClubDashboard.jsx
import { useEffect, useState } from "react";
import api from "./api";

export default function ClubDashboard({ onLogout }) {
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const token = localStorage.getItem("token");
  const clubId = user && user.clubs && user.clubs.length ? (user.clubs[0]._id || user.clubs[0]) : null;

  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [recruitments, setRecruitments] = useState([]);
  const [createForm, setCreateForm] = useState({ title: "", description: "", positions: 1 });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!clubId) return;
    loadClubEvents();
    loadRecruitments();
    const h = () => loadRecruitments();
    window.addEventListener("recruitmentsUpdated", h);
    return () => window.removeEventListener("recruitmentsUpdated", h);
  }, [clubId]);

  async function loadClubEvents() {
    try {
      const res = await api.fetchMyClubEvents?.() || await api.fetchEvents();
      let arr = Array.isArray(res) ? res : [];
      arr = arr.filter((ev) => ev.club && String(ev.club._id || ev.club) === String(clubId));
      setEvents(arr);
    } catch (err) {
      console.error("loadClubEvents", err);
    }
  }

  async function loadRecruitments() {
    try {
      const res = await api.fetchRecruitments();
      let arr = Array.isArray(res) ? res : [];
      arr = arr.filter((r) => r.club && String(r.club._id || r.club) === String(clubId));
      // dedupe by _id
      const seen = new Set();
      const dedup = [];
      for (const r of arr) {
        const id = r._id || r.id;
        if (!seen.has(String(id))) {
          seen.add(String(id));
          dedup.push(r);
        }
      }
      setRecruitments(dedup);
    } catch (err) {
      console.error("loadRecruitments", err);
    }
  }

  const submitRecruitment = async (e) => {
    e && e.preventDefault();
    setMsg("");
    if (!token) {
      setMsg("Please login as club admin to create recruitments.");
      return;
    }
    try {
      const payload = {
        title: createForm.title,
        description: createForm.description,
        positions: Number(createForm.positions) || 1,
        club: clubId,
        open: true,
      };
      const res = await api.createRecruitment(payload, token);
      if (res && res.recruitment) {
        setMsg("Recruitment created.");
        setCreateForm({ title: "", description: "", positions: 1 });
        // notify join page
        window.dispatchEvent(new Event("recruitmentsUpdated"));
        await loadRecruitments();
      } else if (res && res.message) {
        setMsg(res.message);
      } else {
        setMsg("Unexpected response");
      }
    } catch (err) {
      console.error("submitRecruitment", err);
      setMsg("Error creating recruitment");
    }
  };

  const isAdmin = user && user.role === "club_admin";

  return (
    <div style={{ maxWidth: 1000, margin: "18px auto", padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Club Dashboard</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <button onClick={() => setTab("events")}>Events</button>
        <button onClick={() => setTab("recruitments")}>Recruitments</button>
        <div style={{ marginLeft: "auto" }}>
          {user ? (
            <>
              <span style={{ marginRight: 12 }}>{user.email} ({user.role === "club_admin" ? "Admin" : "Member"})</span>
              <button onClick={() => { if (onLogout) onLogout(); }}>Logout</button>
            </>
          ) : <span>Not logged in</span>}
        </div>
      </div>

      {tab === "events" && (
        <>
          <h2>Club Events</h2>
          {!events || events.length === 0 ? <p>No events yet.</p> : (
            <ul>{events.map(ev => <li key={ev._id || ev.id}><strong>{ev.title}</strong> — {ev.description}</li>)}</ul>
          )}
        </>
      )}

      {tab === "recruitments" && (
        <>
          {/* Header removed as requested */}
          {!recruitments || recruitments.length === 0 ? <p>No active recruitments.</p> : (
            <div style={{ display: "grid", gap: 12 }}>
              {recruitments.map(r => (
                <div key={r._id || r.id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 6 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{r.title}</div>
                  <div style={{ marginTop: 6 }}>{r.positions} positions — {r.open ? "Open" : "Closed"}</div>
                </div>
              ))}
            </div>
          )}

          <hr style={{ margin: "18px 0" }} />

          <h3>Create new recruitment</h3>
          {isAdmin ? (
            <form onSubmit={submitRecruitment} style={{ display: "grid", gap: 8, maxWidth: 700 }}>
              <input placeholder="Title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required />
              <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
              <input type="number" min="1" placeholder="Positions" value={createForm.positions} onChange={(e) => setCreateForm({ ...createForm, positions: e.target.value })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Create Recruitment</button>
                <button type="button" onClick={() => setCreateForm({ title: "", description: "", positions: 1 })}>Reset</button>
              </div>
            </form>
          ) : (
            <p>You don’t have admin privileges for this club. Viewing recruitments only.</p>
          )}

          {msg && <div style={{ marginTop: 12, color: msg.startsWith("Recruitment created") ? "green" : "orange" }}>{msg}</div>}
        </>
      )}
    </div>
  );
}
