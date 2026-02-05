# 🦉 OwlEye

**Real-Time Event Safety, Crowd Monitoring & Emergency Response Platform**

OwlEye is a comprehensive web platform designed to improve safety and situational awareness during public events. The system provides a unified environment where attendees, event organizers, volunteers, and authorities can interact through live maps, safety alerts, and incident reporting tools.

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Event Creation & Management** | Create, publish, and manage events with capacity limits and safety guidelines |
| **Role-Based Authentication** | Secure access control for Attendees, Organizers, Volunteers, and Authorities |
| **Real-Time Crowd Heatmap** | Live visualization of crowd density to identify high-risk zones |
| **Live Map with Location Clusters** | Track attendees and volunteers with clustered markers |
| **Incident Reporting System** | Report emergencies with category, description, and location |
| **Panic / SOS Button** | One-tap emergency alert with live location sharing |
| **Safety Alerts & Push Notifications** | Broadcast critical information to all users instantly |
| **Volunteer & Organizer Tracking** | Real-time responder location for faster coordination |
| **QR-Based Ticketing** | Digital tickets with QR validation for secure entry |
| **Live Monitoring Dashboard** | Centralized view of all event activity and incidents |
| **Incident Logs & Transparency** | Secure storage of all reports for accountability |

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Django + Django REST Framework
- **Real-time:** Django Channels + WebSockets
- **Database:** MySQL (MariaDB)
- **Cache/Queue:** Redis
- **Authentication:** JWT (Simple JWT)

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Maps:** Leaflet / React-Leaflet
- **Real-time:** WebSocket Client
- **HTTP Client:** Axios

---

## 📁 Project Structure

```
OwlEye/
├── backend/                 # Django Backend
│   ├── owleye/             # Main Django Project
│   ├── core/               # Core API App
│   ├── venv/               # Python Virtual Environment
│   ├── .env                # Backend Environment Variables
│   ├── manage.py           # Django Management Script
│   └── requirements.txt    # Python Dependencies
│
├── frontend/               # React Frontend
│   ├── src/               # Source Code
│   ├── public/            # Static Assets
│   ├── .env               # Frontend Environment Variables
│   └── package.json       # Node Dependencies
│
├── .gitignore             # Git Ignore Rules
└── README.md              # This File
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL/MariaDB
- Redis

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure your environment
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env      # Configure your environment
npm run dev
```

---

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **Attendee** | View events, report incidents, use SOS, view alerts |
| **Volunteer** | All attendee permissions + location visible to coordinators |
| **Organizer** | Manage events, verify reports, broadcast alerts, view dashboard |
| **Authority** | Full access including incident management and emergency controls |

---

## 📡 API Endpoints (Coming Soon)

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/events/` - List events
- `POST /api/incidents/` - Report incident
- `POST /api/sos/` - Trigger SOS alert
- `WS /ws/events/<event_id>/` - Real-time event updates

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat(scope): add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed for educational purposes.

---

## 👥 Team

- **Usha Bajgain** - Developer

---

*Built with ❤️ for safer events*
