# OwlEye System

## Structure
- backend: Django + MySQL API
- frontend: React app

## Setup

### Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver

### Frontend
cd frontend
npm install
npm run dev

## Environment Rule
- Backend must use only `backend/venv`.
- Do not create `.venv` in the project root.
