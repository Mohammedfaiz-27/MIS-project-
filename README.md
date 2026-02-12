# Construction MIS

A Production-ready Management Information System for construction companies to manage sales leads, site visits, follow-ups, sales entries, and admin tracking.

## Tech Stack

### Backend
- **Python 3.10+** with FastAPI
- **Motor** (async MongoDB driver)
- **Pydantic** for data validation
- **JWT** for authentication
- **MongoDB** for database

### Frontend
- **React 18** with Vite
- **TailwindCSS** for styling
- **React Query** for data fetching and caching
- **React Router** for navigation
- **Recharts** for data visualization
- **Zustand** for state management

## Features

### For Salespersons
- Create and manage leads with site details
- Upload site photos
- Track construction stages
- Add follow-ups and visit history
- Submit sales entries for approval
- View today's, overdue, and upcoming follow-ups

### For Admins
- Dashboard with KPIs and charts
- Follow-up control table
- Sales entry approval workflow
- Salesperson performance analytics
- Area-wise analysis
- User management
- Master data management (brands, areas)
- Export reports (Excel/CSV)

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (running locally on default port 27017)

## Installation

### 1. Clone the repository

```bash
cd "F:\MIS project"
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (already created)
# Edit .env if needed to change MongoDB URL or secret key
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### 1. Start MongoDB

Make sure MongoDB is running on `localhost:27017`

### 2. Start the Backend

```bash
cd backend
# Activate virtual environment first
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Default Credentials

On first startup, a default admin user is created:

- **Email:** admin@construction.com
- **Password:** admin123

**Important:** Change these credentials in production!

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/{id}` - Get lead details
- `PUT /api/leads/{id}` - Update lead
- `POST /api/leads/{id}/photos` - Upload photos
- `PUT /api/leads/{id}/stage` - Update construction stage
- `PUT /api/leads/{id}/status` - Update lead status

### Follow-ups
- `POST /api/followups/leads/{id}/followup` - Add follow-up
- `GET /api/followups/leads/{id}/visits` - Get visit history
- `GET /api/followups/today` - Today's follow-ups
- `GET /api/followups/overdue` - Overdue follow-ups
- `GET /api/followups/upcoming` - Upcoming follow-ups

### Sales Entries
- `POST /api/sales-entries/leads/{id}/entry` - Create sales entry
- `GET /api/sales-entries/leads/{id}/entries` - Get entries for lead
- `GET /api/sales-entries` - List all entries
- `PUT /api/sales-entries/{id}/approve` - Approve entry (admin)
- `PUT /api/sales-entries/{id}/reject` - Reject entry (admin)

### Dashboard
- `GET /api/dashboard/kpis` - KPI data
- `GET /api/dashboard/followup-table` - Follow-up control table
- `GET /api/dashboard/salesperson-performance` - Performance metrics
- `GET /api/dashboard/area-analysis` - Area analysis
- `GET /api/dashboard/charts/sales-trend` - Sales trend data
- `GET /api/dashboard/charts/contribution` - Contribution data

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{id}` - Update user
- `GET /api/admin/export/leads` - Export leads
- `GET /api/admin/export/sales-entries` - Export sales entries

### Master Data
- `GET /api/master-data` - Get all master data
- `POST /api/master-data` - Create master data
- `DELETE /api/master-data/{id}` - Delete master data
- `POST /api/master-data/seed` - Seed default data

## Project Structure

```
F:\MIS project\
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # MongoDB connection
│   │   ├── models/              # Pydantic enums
│   │   ├── schemas/             # Request/Response schemas
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   └── utils/               # Utilities
│   ├── requirements.txt
│   ├── .env
│   └── uploads/                 # Uploaded photos
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── store/               # Zustand stores
│   │   ├── utils/               # Utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## MongoDB Collections

- **users** - User accounts
- **leads** - Sales leads
- **visits** - Follow-up/visit history
- **sales_entries** - Sales entries with quantities
- **master_data** - Dropdown values (brands, areas)

## Role-Based Access

### Salesperson
- View only their own leads
- Create and update leads
- Add follow-ups and sales entries
- View their follow-up schedule

### Admin
- View all leads and data
- Full dashboard access
- Approve/reject sales entries
- Manage users
- Manage master data
- Export reports

## Production Deployment

1. Update `.env` with secure values:
   - Change `SECRET_KEY` to a secure random string
   - Update `MONGODB_URL` for production database
   - Update `CORS_ORIGINS` for production frontend URL

2. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Deploy with a production server (e.g., Gunicorn, Docker)

## License

MIT License
