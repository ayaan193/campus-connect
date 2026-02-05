// src/JoinAClub.jsx
import { useEffect, useState } from "react";
import api from "./api";

export default function JoinAClub() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  useEffect(() => {
    loadRecruitingClubs();
    const handler = () => loadRecruitingClubs();
    window.addEventListener("recruitmentsUpdated", handler);
    window.addEventListener("clubsUpdated", handler);
    return () => {
      window.removeEventListener("recruitmentsUpdated", handler);
      window.removeEventListener("clubsUpdated", handler);
    };
  }, []);

  async function loadRecruitingClubs() {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.fetchRecruitingClubs();
      const arr = Array.isArray(res) ? res : [];
      const seen = new Set();
      const dedup = [];
      for (const c of arr) {
        const id = c._id || c.id;
        if (!seen.has(String(id))) {
          seen.add(String(id));
          dedup.push(c);
        }
      }
      setClubs(dedup);
    } catch (err) {
      console.error("loadRecruitingClubs", err);
      setMsg("Could not load recruiting clubs");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(clubId) {
    setMsg("");
    if (!token) {
      setMsg("Please login to join a club.");
      return;
    }
    try {
      if (user && user.clubs && user.clubs.some((c) => String(c._id || c) === String(clubId))) {
        setMsg("You are already a member of this club.");
        return;
      }
      const res = await api.joinClub(clubId, token);
      if (res && res.message) {
        setMsg(res.message);
        // update local user so UI updates immediately
        try {
          const updated = { ...user };
          updated.clubs = updated.clubs || [];
          if (!updated.clubs.some((c) => String(c._id || c) === String(clubId))) updated.clubs.push({ _id: clubId });
          localStorage.setItem("user", JSON.stringify(updated));
        } catch {}
        loadRecruitingClubs();
      } else {
        setMsg("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      console.error("handleJoin", err);
      setMsg("Error joining club: " + (err.message || err));
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16 }}>
      <h1>Clubs Recruiting Now</h1>

      {loading && <div>Loading…</div>}
      {msg && <div style={{ marginBottom: 12, color: "orange" }}>{msg}</div>}
      {!loading && (!clubs || clubs.length === 0) && <p>No clubs currently recruiting.</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {clubs.map((c) => {
          const cid = c._id || c.id;
          const alreadyMember = user && user.clubs && user.clubs.some((cl) => String(cl._id || cl) === String(cid));
          return (
            <div key={cid} style={{ padding: 14, border: "1px solid #eee", borderRadius: 8 }}>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <div>
                <button onClick={() => handleJoin(cid)} disabled={!token || alreadyMember} style={{ padding: "10px 16px", marginTop: 6 }}>
                  {alreadyMember ? "Already a Member" : token ? "Join Club" : "Login to Join"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
