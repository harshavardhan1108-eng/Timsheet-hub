# 🚀 PulseResource - Resource & Timesheet Hub

A modern, full-featured web application for team resource planning, project management, capacity tracking, timesheet submissions, approval workflows, and business reporting.

---

## 🌟 Key Features

- **📊 Interactive Dashboard:** Real-time KPI summaries, active projects overview, team utilization metrics, and pending approvals counter.
- **👥 Resource Directory & Capacity:** Manage team members, skill tags, hourly billing and cost rates, and weekly capacity tracking.
- **📁 Projects & Allocation Management:** Plan projects, track status & budgets, and allocate team hours across projects.
- **⏱️ Timesheet Submission & Logging:** Intuitive interface for logging billable and non-billable hours with task descriptions.
- **✅ Manager Approval Workflows:** Streamlined review and one-click approve/reject actions for submitted timesheets.
- **📈 Comprehensive Reports & Analytics:** Utilization breakdowns, financial analytics, and one-click CSV data export.
- **⚡ Fast & Modern Backend:** Powered by FastAPI with automatic interactive Swagger API documentation.

---

## 🛠️ Tech Stack

- **Backend:** Python 3, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn
- **Database:** SQLite (lightweight, zero-configuration)
- **Frontend:** Responsive HTML5, Modern CSS3 with CSS variables, Vanilla JavaScript (component-based architecture)

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/resource-hub.git
cd resource-hub
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the application

**On Windows:**
Double-click `run.bat` or run:
```bash
python app.py
```

**On macOS / Linux:**
```bash
python3 app.py
```

### 4. Open in your browser
- **Web UI:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📁 Project Structure

```
resource-hub/
├── app.py                # FastAPI backend & REST API endpoints
├── database.py           # Database schema, migrations & seed data
├── requirements.txt      # Python dependencies
├── run.bat               # Windows launcher script
├── tests.py              # Automated test suite
├── static/
│   ├── css/styles.css    # Modern UI design & responsive styling
│   └── js/
│       ├── api.js        # Frontend API client
│       ├── store.js      # Central state management
│       ├── app.js        # Main UI router and initialization
│       └── components/   # Modular dashboard, resources, timesheets, approvals, reports
└── templates/
    └── index.html        # Main single-page application layout
```

---

## 🧪 Running Tests

To run the automated test suite:
```bash
python tests.py
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
