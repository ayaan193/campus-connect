// src/App.jsx
import { useEffect, useState } from "react";
import api from "./api";
import "./styles.css";
import EventRegistrationForm from "./EventRegistrationForm";
import ClubLogin from "./ClubLogin";
import RegisterClub from "./RegisterClub";
import ClubDashboard from "./ClubDashboard";
import JoinAClub from "./JoinAClub";

function Auth({ onLogin, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => setMode(initialMode), [initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const fn = mode === "register" ? api.registerUser : api.loginUser;
      const res = await fn(form);
      if (res && res.token) {
        localStorage.setItem("token", res.token);
        const userObj = res.user || { email: form.email, name: form.name || null, clubs: [] };
        localStorage.setItem("user", JSON.stringify(userObj));
        setMsg("✅ " + (mode === "register" ? "Registered" : "Login successful"));
        if (onLogin) onLogin();
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
    <div style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="card auth-card" style={{ maxWidth: 540, margin: "20px auto" }}>
        <h2 style={{ textAlign: "center" }}>{mode === "register" ? "Register" : "Login"}</h2>
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          {mode === "register" && <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={busy}>{busy ? "Please wait..." : "Submit"}</button>
            <button type="button" className="link" onClick={() => setMode(mode === "register" ? "login" : "register")}>
              Switch to {mode === "register" ? "Login" : "Register"}
            </button>
          </div>
        </form>
        {msg && <div style={{ marginTop: 10, textAlign: "center" }}><small style={{ color: msg.startsWith("✅") ? "green" : "orange" }}>{msg}</small></div>}
      </div>
    </div>
  );
}

function EventCard({ e, onRegister }) {
  return (
    <div className="event-card">
      <div className="event-icon">🎟️</div>
      <h3 className="event-title">{e.title}</h3>
      <p className="event-desc">{e.description}</p>
      <p className="muted"><b>Date:</b> {e.date ? new Date(e.date).toLocaleString() : "TBD"}</p>
      <p className="muted"><b>Location:</b> {e.location || "Online"}</p>
      <p className="muted"><b>Attendees:</b> {Array.isArray(e.attendees) ? e.attendees.length : 0}</p>
      <button onClick={() => onRegister(e)}>Register Now!</button>
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  const [view, setView] = useState("events"); // events | clubPortal | joinAClub | registerClub | auth
  const [authMode, setAuthMode] = useState("login");
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    loadEvents();
    loadClubs();
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  async function loadEvents() {
    setStatusMsg("Loading events...");
    const res = await api.fetchEvents();
    if (Array.isArray(res)) {
      setEvents(res);
      setFiltered(res);
      setStatusMsg("");
    } else {
      setStatusMsg("Could not load events");
    }
  }

  async function loadClubs() {
    try {
      const cs = await api.fetchClubs();
      if (Array.isArray(cs)) setClubs(cs);
    } catch (err) {
      console.error("Could not load clubs", err);
    }
  }

  const handleLoginGlobal = async () => {
    const t = localStorage.getItem("token");
    setToken(t);
    try {
      setUser(JSON.parse(localStorage.getItem("user")));
    } catch {
      setUser(null);
    }
    await loadEvents();
    await loadClubs();
    setView("clubPortal");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setView("events");
    setFiltered(events);
  };

  const handleSearch = (e) => {
    const val = (e.target.value || "").toLowerCase();
    setSearch(val);
    if (val.trim() === "") {
      setFiltered(events);
      return;
    }
    setFiltered(events.filter((ev) => (ev.title || "").toLowerCase().includes(val) || (ev.description || "").toLowerCase().includes(val)));
  };

  return (
    <div className="page">
      <header className="navbar fixed">
        <div className="logo">CampusConnect</div>
        <nav className="nav-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setView("events"); }}>Events</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView("clubPortal"); }}>Login to Club Portal</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView("joinAClub"); }}>Join a Club</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView("registerClub"); }}>Register Club</a>
        </nav>

        <div className="profile-area">
          {user ? (
            <>
              <span className="hi">{user.name || user.email} {user.role ? (user.role === "club_admin" ? "(Admin)" : "(Member)") : ""}</span>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => { setAuthMode("login"); setView("auth"); }} className="small-btn" style={{ marginRight: 8 }}>Login</button>
              <button onClick={() => { setAuthMode("register"); setView("auth"); }} className="small-btn">Register</button>
            </>
          )}
        </div>
      </header>

      <div style={{ paddingTop: 88, paddingBottom: 40 }}>
        {selectedEvent ? (
          <EventRegistrationForm
            event={selectedEvent}
            user={user}
            onCancel={() => setSelectedEvent(null)}
            onConfirm={async () => {
              await api.registerToEvent(selectedEvent._id, token);
              setSelectedEvent(null);
              await loadEvents();
            }}
          />
        ) : view === "auth" ? (
          <Auth onLogin={handleLoginGlobal} initialMode={authMode} />
        ) : view === "clubPortal" ? (
          user && Array.isArray(user.clubs) && user.clubs.length > 0 ? (
            <ClubDashboard user={user} token={token} onLogout={handleLogout} onEventCreated={loadEvents} />
          ) : (
            <ClubLogin onLoginGlobal={handleLoginGlobal} />
          )
        ) : view === "joinAClub" ? (
          <JoinAClub />
        ) : view === "registerClub" ? (
          <RegisterClub onRegisterSuccess={() => { loadClubs(); setView("clubPortal"); }} onSwitchToLogin={() => { setAuthMode("login"); setView("auth"); }} />
        ) : (
          <main className="main" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 className="page-title">Discover Exciting Events & Clubs!</h1>

            <div className="filters" style={{ marginBottom: 18 }}>
              <input type="text" placeholder="Search events..." value={search} onChange={handleSearch} className="search-input" />
              <button onClick={() => {
                const now = new Date();
                const weekEnd = new Date();
                weekEnd.setDate(now.getDate() + 7);
                setFiltered(events.filter(ev => ev.date && new Date(ev.date) >= now && new Date(ev.date) <= weekEnd));
              }}>Filter: Today/This Week</button>
              <button onClick={() => {
                if (!user || !Array.isArray(user.interests) || user.interests.length === 0) {
                  setStatusMsg("Login and set interests to use this filter.");
                  setTimeout(() => setStatusMsg(""), 2500);
                  return;
                }
                const interests = user.interests.map(i => i.toLowerCase());
                setFiltered(events.filter(ev => Array.isArray(ev.tags) && ev.tags.some(t => interests.includes(String(t).toLowerCase()))));
              }}>Filter: My Interests</button>
              <button onClick={() => { setSearch(""); setFiltered(events); setStatusMsg(""); }}>Reset</button>
            </div>

            <div className="grid">
              <aside className="clubs">
                <h2>Featured Clubs</h2>
                <input type="text" placeholder="Search Clubs" />
                <div className="club-list">
                  {(clubs && clubs.length > 0 ? clubs : []).slice(0, 6).map((club) => (
                    <div key={club._id || club.name} className="club-card">
                      <h3>{club.name}</h3>
                      <p>{club.description}</p>
                      <button>View Club</button>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="events">
                <h2>Upcoming Events</h2>
                {statusMsg && <p className="status-msg">{statusMsg}</p>}
                <div className="event-grid">
                  {filtered.length === 0 ? <p>No events found.</p> : filtered.map(e => <EventCard key={e._id} e={e} onRegister={(ev) => setSelectedEvent(ev)} />)}
                </div>
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
