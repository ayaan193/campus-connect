// src/EventRegistrationForm.jsx
import { useState } from "react";
import "./styles.css";

export default function EventRegistrationForm({ event, user, onCancel, onConfirm }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    studentId: "",
    studentIdConfirm: "",
    email: user?.email || "",
    department: "",
    year: "",
    reason: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.studentId !== form.studentIdConfirm) {
      setError("Student ID entries do not match.");
      return;
    }

    // we send data to backend (or parent)
    onConfirm(form);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>Register for {event?.title || "Event"}</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <label>Student ID</label>
          <input
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            required
          />

          <label>Confirm Student ID</label>
          <input
            value={form.studentIdConfirm}
            onChange={(e) => setForm({ ...form, studentIdConfirm: e.target.value })}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="row">
            <div>
              <label>Major/Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Year of Study</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                required
              />
            </div>
          </div>

          <label>Tell us why you’re interested (Optional)</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Share what excites you about this event!"
          />

          {error && <p className="error-text">{error}</p>}

          <div className="register-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="confirm-btn">
              Confirm Registration
            </button>
          </div>
        </form>
      </div>
      <footer className="footer-links">
        <a href="#">About Us</a>
        <a href="#">Contact</a>
        <a href="#">Terms</a>
      </footer>
    </div>
  );
}
