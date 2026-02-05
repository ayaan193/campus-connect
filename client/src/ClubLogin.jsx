// src/ClubLogin.jsx
import { useEffect, useState } from "react";
import api from "./api";
import "./styles.css";

export default function ClubLogin({ onLoginGlobal }) {
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState({ email: "", password: "", clubId: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const cs = await api.fetchClubs();
        if (Array.isArray(cs)) setClubs(cs);
      } catch (err) {
        console.error("Could not load clubs", err);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const payload = { email: form.email, password: form.password };
      if (form.clubId) payload.clubId = form.clubId;
      const res = await api.loginUser(payload);
      if (res && res.token) {
        localStorage.setItem("token", res.token);
        // server returns user; if not, create a basic user object
        const userObj = res.user || { email: form.email, name: null, clubs: res.user?.clubs || [] };
        localStorage.setItem("user", JSON.stringify(userObj));
        setMsg("✅ Login successful");
        if (onLoginGlobal) onLoginGlobal();
      } else if (res && res.message) {
        setMsg("⚠️ " + res.message);
      } else {
        setMsg("⚠️ Unexpected response");
      }
    } catch (err) {
      setMsg("Error: " + (err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth-card" style={{ maxWidth: 560, margin: "30px auto", padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>Club Portal Login</h2>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 14 }}>Club</label>
        <select
          value={form.clubId}
          onChange={(e) => setForm({ ...form, clubId: e.target.value })}
        >
          <option value="">— choose a club —</option>
          {clubs.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 14 }}>Email</label>
        <input
          placeholder="club-admin@college.edu"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <label style={{ fontSize: 14 }}>Password</label>
        <input
          placeholder="password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="submit" disabled={busy} style={{ padding: "10px 18px" }}>
            {busy ? "Logging in..." : "Login"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ email: "", password: "", clubId: "" });
              setMsg("");
            }}
            style={{ padding: "10px 12px" }}
          >
            Clear
          </button>
        </div>

        {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
      </form>
    </div>
  );
}
