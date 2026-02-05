# CampusConnect 🎓🚀

CampusConnect is a **club and recruitment management platform** built for college campuses.  
It enables students to **discover clubs, join them, view events, and apply for recruitments**, while allowing club admins to **manage clubs, events, and recruitment drives**.

---

## ✨ Features

### 👤 Authentication & Roles
- User registration and login
- Role-based access:
  - **Student**
  - **Club Admin**
- Secure authentication using **JWT**

### 🏛️ Clubs
- View all clubs on campus
- Join existing clubs
- Register a new club as a **club admin**
- Club admins are automatically linked to their clubs

### 📅 Events
- Club admins can create events
- Events are associated with specific clubs
- Members can view events of their clubs
- Support for limited or unlimited attendees

### 📢 Recruitments
- Club admins can create recruitment drives
- Recruitments include:
  - Position title
  - Number of openings
  - Open / Closed status
- Students can see clubs that are currently recruiting
- Club admins can review applicants

### 🔐 Security
- Password hashing using **bcrypt**
- Protected routes with **JWT authentication**
- Role-based authorization checks

---

## 🛠️ Tech Stack

### Frontend
- **React**
- **Vite**
- **CSS**
- **localStorage**

### Backend
- **Node.js**
- **Express.js**
- **JWT**
- **bcrypt**

### Database
- **MongoDB**
- **Mongoose**

---

## 🧱 Architecture

Frontend (React + Vite)
|
| REST API (JSON)
v
Backend (Node.js + Express)
|
v
Database (MongoDB)

🚀 Getting Started
Prerequisites

Node.js (v16 or higher)

MongoDB (local or MongoDB Atlas)

Git

1️⃣ Clone the repository

git clone https://github.com/ayaan193/campus-connect.git

cd campus-connect

2️⃣ Install dependencies

npm install

3️⃣ Environment Variables

Create a .env file in the root directory:

MONGO_URI=mongodb://localhost:27017/campusconnect
JWT_SECRET=your_secret_key_here
PORT=5000

⚠️ Do not commit the .env file to GitHub.

4️⃣ Run the backend server

node server.js

Backend runs at:
http://localhost:5000

5️⃣ Run the frontend

npm run dev

Frontend runs at:
http://localhost:5173

📁 Project Structure

campus-connect/
├── src/ # React frontend
│ ├── ClubPortal.jsx
│ ├── ClubDashboard.jsx
│ ├── ClubLogin.jsx
│ └── api.js
│
├── server.js # Express backend
├── package.json
├── .env # Environment variables (ignored)
├── .gitignore
└── README.md

🔮 Future Enhancements

Email notifications for recruitment updates

Event attendance tracking

Admin analytics dashboard

UI enhancement using Tailwind CSS

Approval workflow for club registrations

👨‍💻 Author

Ayaan Ahmed
GitHub: https://github.com/ayaan193

📜 License

This project is open-source and intended for educational and learning purposes.