// src/ClubPortal.jsx
import { useState, useEffect } from "react";
import api from "./api";
import "./styles.css";

export default function ClubPortal({ onLoginGlobal }) {
  const [mode, setMode] = useState("join"); // "join" | "register" | "dashboard"
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [clubs, setClubs] = useState([]);

  // forms
  const [joinForm, setJoinForm] = useState({ email: "", password: "", clubSelect: "" });
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    password: "",
    clubSelect: "new",
    newClubName: "",
    newClubDescription: "",
  });

  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    maxAttendees: 100,
  });

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (user?.clubs && user.clubs.length > 0) {
      // set dashboard when a logged-in user has clubs
      setMode("dashboard");
      loadMyClubsEvents();
    }
  }, [user]);

  async function loadClubs() {
    try {
      const res = await api.fetchClubs();
      if (Array.isArray(res)) {
        setClubs(res);
        setJoinForm((s) => ({ ...s, clubSelect: res[0]?._id || "" }));
        setRegForm((s) => ({ ...s, clubSelect: res[0]?._id ? res[0]._id : "new" }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMyClubsEvents() {
    if (!token) return;
    setBusy(true);
    try {
      const evs = await api.fetchMyClubsEvents(token);
      if (Array.isArray(evs)) setEvents(evs);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  // JOIN: existing user joins an existing club (login required or allow login-first)
  // We'll first login with email+password and clubSelect enforced server-side
  const handleJoin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      // Login and require membership? For join flow, we will first authenticate user
      // If login succeeds (user exists) we then call joinClub to add selected club to their clubs
      const loginRes = await api.loginUser({ email: joinForm.email, password: joinForm.password });
      if (!loginRes || !loginRes.token) {
        setMsg(loginRes.message || "Login failed");
        setBusy(false);
        return;
      }
      // store token & user
      localStorage.setItem("token", loginRes.token);
      localStorage.setItem("user", JSON.stringify(loginRes.user));
      setToken(loginRes.token);
      setUser(loginRes.user);
      if (onLoginGlobal) onLoginGlobal();

      // Now call joinClub (authenticated)
      const res = await api.joinClub(joinForm.clubSelect, loginRes.token);
      if (res && res.message) {
        setMsg(res.message);
        // refresh local user to include new club (re-login)
        const reLogin = await api.loginUser({ email: joinForm.email, password: joinForm.password });
        if (reLogin && reLogin.user) {
          localStorage.setItem("user", JSON.stringify(reLogin.user));
          setUser(reLogin.user);
        }
        await loadClubs();
        loadMyClubsEvents();
        setMode("dashboard");
      } else {
        setMsg("Failed to join club");
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // REGISTER: register user and optionally create new club or attach existing club
  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      let body = {
        name: regForm.name,
        email: regForm.email,
        password: regForm.password,
        role: "student", // default is student; to register a club admin, use register-club flow
      };

      // If user wants to join an existing club at registration
      if (regForm.clubSelect && regForm.clubSelect !== "new") {
        body.joinClubId = regForm.clubSelect;
      }

      const res = await api.registerUser(body);
      if (res && res.user) {
        setMsg("Registered successfully. Please login to continue.");
        setMode("join");
        await loadClubs();
      } else {
        setMsg(res.message || "Registration failed");
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // REGISTER CLUB: registers a new club AND attaches it to user as club_admin
  const handleRegisterClub = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (regForm.clubSelect === "new" && !regForm.newClubName) {
        setMsg("Please provide a new club name.");
        setBusy(false);
        return;
      }
      const body = {
        name: regForm.name,
        email: regForm.email,
        password: regForm.password,
        role: "club_admin",
        clubName: regForm.clubSelect === "new" ? regForm.newClubName : undefined,
        clubDescription: regForm.newClubDescription,
      };
      // If they selected an existing club but want to be club_admin for it, we still try to create/assign
      if (regForm.clubSelect && regForm.clubSelect !== "new") {
        const selected = clubs.find((c) => String(c._id) === String(regForm.clubSelect));
        if (selected) body.clubName = selected.name;
      }

      const res = await api.registerUser(body);
      if (res && res.user) {
        setMsg("Club registered. Now login as the club admin.");
        await loadClubs();
        setMode("join");
      } else {
        setMsg(res.message || "Register club failed");
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // Login (for verification or straight login)
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await api.loginUser({ email: joinForm.email, password: joinForm.password, clubId: joinForm.clubSelect });
      if (res && res.token) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        setMsg("Login successful");
        if (onLoginGlobal) onLoginGlobal();
        setMode("dashboard");
        loadMyClubsEvents();
      } else {
        setMsg(res.message || "Login failed");
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!token) return setMsg("Not authenticated");
    setBusy(true);
    try {
      // create event — backend will use user's club automatically for club_admins; for regular users attaching to club is not allowed unless admin
      const res = await api.createEvent(newEvent, token);
      if (res && res.event) {
        setMsg("Event created");
        setNewEvent({ title: "", description: "", date: "", location: "", maxAttendees: 100 });
        loadMyClubsEvents();
      } else {
        setMsg(res.message || "Failed to create event");
      }
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setMode("join");
    if (onLoginGlobal) onLoginGlobal();
  };

  // Dashboard for users who are club_admin or who simply belong to clubs
  if (mode === "dashboard" && user) {
    return (
      <div className="centered-portal">
        <div className="card portal-card">
          <h2>Club Dashboard</h2>
          <p>Logged in as: <strong>{user.email}</strong> <button onClick={logout} style={{ marginLeft: 12 }}>Logout</button></p>

          <section>
            <h3>Your Clubs</h3>
            <ul>
              {user.clubs && user.clubs.length > 0 ? (
                user.clubs.map((c) => <li key={c._id || c}>{c.name || c}</li>)
              ) : (
                <li>No clubs yet</li>
              )}
            </ul>
          </section>

          <section style={{ marginTop: 12 }}>
            <h3>My Clubs' Events</h3>
            {busy ? <p>Loading...</p> : events.length === 0 ? <p>No events yet.</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {events.map((ev) => (
                  <div key={ev._id} className="card" style={{ padding: 8 }}>
                    <strong>{ev.title}</strong><br />
                    <small>{ev.description}</small><br />
                    <small>{ev.location} — {ev.date ? new Date(ev.date).toLocaleString() : "TBD"}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 16 }}>
            <h3>Create Event (club_admin only)</h3>
            <form onSubmit={handleCreateEvent} className="club-form">
              <input placeholder="Title" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
              <input placeholder="Date (ISO)" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
              <input placeholder="Location" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
              <textarea placeholder="Description" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
              <input type="number" placeholder="Max Attendees" value={newEvent.maxAttendees} onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: Number(e.target.value) })} />
              <button type="submit" disabled={busy}>{busy ? "Please wait..." : "Create Event"}</button>
            </form>
          </section>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </div>
      </div>
    );
  }

  // Render Join / Register / Register Club UI
  return (
    <div className="centered-portal">
      <div className="card portal-card">
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
          <button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>Join Clubs</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register (Join)</button>
          <button className={mode === "register-club" ? "active" : ""} onClick={() => setMode("register-club")}>Register Club</button>
        </div>

        {mode === "join" && (
          <form onSubmit={handleJoin} className="club-form">
            <input placeholder="Email" type="email" value={joinForm.email} onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={joinForm.password} onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })} required />
            <label>Select club to join</label>
            <select value={joinForm.clubSelect} onChange={(e) => setJoinForm({ ...joinForm, clubSelect: e.target.value })}>
              {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <button type="submit" disabled={busy}>{busy ? "Please wait..." : "Login & Join"}</button>
            <small style={{ display: "block", marginTop: 8, color: "#666" }}>If you are not registered, use Register (Join)</small>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="club-form">
            <input placeholder="Your Name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required />
            <label>Join an existing club (or choose Create new)</label>
            <select value={regForm.clubSelect} onChange={(e) => setRegForm({ ...regForm, clubSelect: e.target.value })}>
              <option value="new">— Create new club —</option>
              {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {regForm.clubSelect === "new" && (
              <>
                <input placeholder="New Club Name" value={regForm.newClubName} onChange={(e) => setRegForm({ ...regForm, newClubName: e.target.value })} />
                <input placeholder="New Club Description" value={regForm.newClubDescription} onChange={(e) => setRegForm({ ...regForm, newClubDescription: e.target.value })} />
              </>
            )}

            <button type="submit" disabled={busy}>{busy ? "Please wait..." : "Register & Join"}</button>
            <small style={{ display: "block", marginTop: 8, color: "#666" }}>Registers you as a student and optionally joins/creates a club</small>
          </form>
        )}

        {mode === "register-club" && (
          <form onSubmit={handleRegisterClub} className="club-form">
            <input placeholder="Your Name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required />
            <label>Create or select club to register as admin</label>
            <select value={regForm.clubSelect} onChange={(e) => setRegForm({ ...regForm, clubSelect: e.target.value })}>
              <option value="new">— Create new club —</option>
              {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {regForm.clubSelect === "new" && (
              <>
                <input placeholder="New Club Name" value={regForm.newClubName} onChange={(e) => setRegForm({ ...regForm, newClubName: e.target.value })} required />
                <input placeholder="New Club Description" value={regForm.newClubDescription} onChange={(e) => setRegForm({ ...regForm, newClubDescription: e.target.value })} />
              </>
            )}

            <button type="submit" disabled={busy}>{busy ? "Please wait..." : "Register Club"}</button>
          </form>
        )}

        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </div>
  );
}
