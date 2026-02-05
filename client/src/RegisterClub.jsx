// src/RegisterClub.jsx
import { useState } from "react";
import api from "./api";

/*
 RegisterClub
 - Separate from user registration.
 - Accepts: your name (or admin display name), email (adminEmail), club name, description.
 - Calls POST /api/clubs with { name, description, adminEmail }.
 - On success dispatches "clubsUpdated" so App/Join lists refresh.
 - If backend requires also creating a user record for admin, adjust server to create or link admin by email.
*/
export default function RegisterClub({ onRegisterSuccess }) {
  const [form, setForm] = useState({
    adminName: "",
    adminEmail: "",
    clubName: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e && e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      // send adminEmail so backend can set that email as club admin
      const payload = {
        name: form.clubName,
        description: form.description,
        adminEmail: form.adminEmail,
      };
      const res = await api.createClub(payload);
      // if you require auth for this endpoint, change to api.createClub(payload, token)
      if (res && (res._id || res.id)) {
        setMsg("Club created.");
        // notify other components to refresh
        window.dispatchEvent(new Event("clubsUpdated"));
        if (onRegisterSuccess) onRegisterSuccess();
      } else if (res && res.message) {
        setMsg(res.message);
      } else {
        setMsg("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      setMsg("Error: " + (err.message || err));
      console.error("RegisterClub error", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 920, margin: "18px auto", padding: 18 }}>
      <h1>Register a Club</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Your name (admin display name)"
          value={form.adminName}
          onChange={(e) => setForm({ ...form, adminName: e.target.value })}
        />
        <input
          placeholder="Your email (will be club admin)"
          value={form.adminEmail}
          onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          type="email"
          required
        />
        <input
          placeholder="Club name"
          value={form.clubName}
          onChange={(e) => setForm({ ...form, clubName: e.target.value })}
          required
        />
        <textarea
          placeholder="Club description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Please wait..." : "Register Club"}
          </button>
        </div>
        {msg && <div style={{ color: msg.toLowerCase().includes("error") ? "red" : "green" }}>{msg}</div>}
        <div style={{ marginTop: 6 }}>
          <button type="button" onClick={() => window.location.href = "#/club-login"}>
            Already have a club? Login
          </button>
        </div>
      </form>
    </div>
  );
}
