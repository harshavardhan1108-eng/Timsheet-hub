"""
FastAPI Application for Resource Management & Timesheet Hub.
Provides RESTful APIs for Resources, Allocations, Projects, Timesheets, Approvals, and Reports.
"""

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import os
import io
import csv
import json

from database import get_db_connection, init_db, seed_database

# Initialize database schema and data
init_db()
seed_database()

app = FastAPI(title="Resource & Timesheet Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Pydantic Request Models
class UserCreate(BaseModel):
    name: str
    email: str
    role: str = "employee"
    job_title: str
    department: str
    hourly_rate: float = 50.0
    cost_rate: float = 35.0
    weekly_capacity: float = 40.0
    avatar_url: Optional[str] = None
    skills: List[str] = []
    status: str = "active"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    hourly_rate: Optional[float] = None
    cost_rate: Optional[float] = None
    weekly_capacity: Optional[float] = None
    avatar_url: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None

class ProjectCreate(BaseModel):
    client_id: Optional[int] = None
    name: str
    code: str
    description: Optional[str] = None
    status: str = "active"
    start_date: str
    end_date: Optional[str] = None
    budget_hours: float = 0.0
    budget_amount: float = 0.0
    billing_type: str = "hourly"
    hourly_rate: float = 0.0
    color: str = "#3B82F6"

class ProjectUpdate(BaseModel):
    client_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    color: Optional[str] = None

class TaskCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None
    billable: int = 1
    is_default: int = 0

class AllocationCreate(BaseModel):
    user_id: int
    project_id: int
    role: Optional[str] = None
    start_date: str
    end_date: str
    hours_per_week: float = 20.0
    notes: Optional[str] = None

class AllocationUpdate(BaseModel):
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hours_per_week: Optional[float] = None
    notes: Optional[str] = None

class TimesheetEntryItem(BaseModel):
    id: Optional[int] = None
    project_id: int
    task_id: Optional[int] = None
    entry_date: str
    hours: float
    description: Optional[str] = ""
    is_billable: int = 1

class TimesheetSaveRequest(BaseModel):
    user_id: int
    week_start_date: str
    entries: List[TimesheetEntryItem]

class TimesheetSubmitRequest(BaseModel):
    user_id: int
    week_start_date: str
    entries: Optional[List[TimesheetEntryItem]] = None

class ApprovalActionRequest(BaseModel):
    reviewer_id: int
    rejection_reason: Optional[str] = None

class BulkApprovalRequest(BaseModel):
    reviewer_id: int
    timesheet_ids: List[int]

class ClientCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


# Helpers
def get_monday(d: Optional[date] = None) -> date:
    if d is None:
        d = date.today()
    return d - timedelta(days=d.weekday())


# ==========================================
# AUTH & USER SELECTION ENDPOINTS
# ==========================================
@app.get("/api/auth/users")
def get_auth_users():
    """Returns list of users for switcher."""
    conn = get_db_connection()
    users = conn.execute("SELECT id, name, email, role, job_title, department, avatar_url, weekly_capacity FROM users WHERE status = 'active' ORDER BY role, name").fetchall()
    conn.close()
    return [dict(u) for u in users]


# ==========================================
# DASHBOARD STATS
# ==========================================
@app.get("/api/dashboard/stats")
def get_dashboard_stats(user_id: Optional[int] = None):
    conn = get_db_connection()
    today = date.today()
    monday = get_monday(today)
    sunday = monday + timedelta(days=6)

    # 1. Total resources
    total_resources = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'active'").fetchone()[0]

    # 2. Active Projects
    active_projects = conn.execute("SELECT COUNT(*) FROM projects WHERE status = 'active'").fetchone()[0]

    # 3. Hours logged this current week
    week_hours_row = conn.execute("""
        SELECT 
            COALESCE(SUM(hours), 0) as total_hours,
            COALESCE(SUM(CASE WHEN is_billable = 1 THEN hours ELSE 0 END), 0) as billable_hours
        FROM timesheet_entries
        WHERE entry_date BETWEEN ? AND ?
    """, (monday.isoformat(), sunday.isoformat())).fetchone()

    total_week_hours = week_hours_row["total_hours"]
    billable_week_hours = week_hours_row["billable_hours"]

    # 4. Total Team Capacity this week
    total_capacity = conn.execute("SELECT COALESCE(SUM(weekly_capacity), 0) FROM users WHERE status = 'active'").fetchone()[0]
    utilization_rate = round((total_week_hours / total_capacity * 100), 1) if total_capacity > 0 else 0

    # 5. Pending approvals count
    pending_approvals = conn.execute("SELECT COUNT(*) FROM timesheets WHERE status = 'submitted'").fetchone()[0]

    # 6. Projects summary with burn rate
    projects = conn.execute("""
        SELECT 
            p.id, p.name, p.code, p.status, p.budget_hours, p.budget_amount, p.color,
            c.name as client_name,
            COALESCE(SUM(te.hours), 0) as logged_hours,
            COALESCE(SUM(te.hours * p.hourly_rate), 0) as billable_value
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN timesheet_entries te ON p.id = te.project_id
        WHERE p.status = 'active'
        GROUP BY p.id
        ORDER BY logged_hours DESC
        LIMIT 5
    """).fetchall()

    project_list = []
    for p in projects:
        p_dict = dict(p)
        budget = p_dict["budget_hours"]
        logged = p_dict["logged_hours"]
        p_dict["burn_percentage"] = round((logged / budget * 100), 1) if budget > 0 else 0
        project_list.append(p_dict)

    # 7. Department Workload
    dept_workload = conn.execute("""
        SELECT 
            u.department,
            COUNT(DISTINCT u.id) as head_count,
            COALESCE(SUM(u.weekly_capacity), 0) as total_capacity,
            COALESCE(SUM(a.hours_per_week), 0) as allocated_hours
        FROM users u
        LEFT JOIN allocations a ON u.id = a.user_id 
            AND ? BETWEEN a.start_date AND a.end_date
        WHERE u.status = 'active'
        GROUP BY u.department
    """, (today.isoformat(),)).fetchall()

    dept_list = []
    for d in dept_workload:
        d_dict = dict(d)
        cap = d_dict["total_capacity"]
        alloc = d_dict["allocated_hours"]
        d_dict["allocation_rate"] = round((alloc / cap * 100), 1) if cap > 0 else 0
        dept_list.append(d_dict)

    # 8. Recent Timesheet Activity
    recent_activity = conn.execute("""
        SELECT 
            t.id, t.week_start_date, t.status, t.total_hours, t.submitted_at, t.approved_at,
            u.name as user_name, u.avatar_url, u.job_title
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE t.status IN ('submitted', 'approved', 'rejected')
        ORDER BY COALESCE(t.approved_at, t.submitted_at, t.updated_at) DESC
        LIMIT 6
    """).fetchall()

    conn.close()

    return {
        "total_resources": total_resources,
        "active_projects": active_projects,
        "total_week_hours": round(total_week_hours, 1),
        "billable_week_hours": round(billable_week_hours, 1),
        "total_capacity": total_capacity,
        "utilization_rate": utilization_rate,
        "pending_approvals": pending_approvals,
        "top_projects": project_list,
        "department_workload": dept_list,
        "recent_activity": [dict(r) for r in recent_activity]
    }


# ==========================================
# RESOURCES ENDPOINTS
# ==========================================
@app.get("/api/resources")
def get_resources(department: Optional[str] = None, role: Optional[str] = None, status: Optional[str] = None):
    conn = get_db_connection()
    today = date.today()
    monday = get_monday(today)

    query = """
        SELECT 
            u.*,
            COALESCE((
                SELECT SUM(a.hours_per_week) 
                FROM allocations a 
                WHERE a.user_id = u.id 
                AND ? BETWEEN a.start_date AND a.end_date
            ), 0) as current_allocated_hours,
            COALESCE((
                SELECT SUM(te.hours)
                FROM timesheets t
                JOIN timesheet_entries te ON t.id = te.timesheet_id
                WHERE t.user_id = u.id AND t.week_start_date = ?
            ), 0) as current_logged_hours
        FROM users u
        WHERE 1=1
    """
    params = [today.isoformat(), monday.isoformat()]

    if department and department != "all":
        query += " AND u.department = ?"
        params.append(department)
    if role and role != "all":
        query += " AND u.role = ?"
        params.append(role)
    if status and status != "all":
        query += " AND u.status = ?"
        params.append(status)

    query += " ORDER BY u.department, u.name"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    resources = []
    for r in rows:
        r_dict = dict(r)
        if r_dict.get("skills"):
            try:
                r_dict["skills"] = json.loads(r_dict["skills"])
            except Exception:
                r_dict["skills"] = []
        else:
            r_dict["skills"] = []
        
        cap = r_dict["weekly_capacity"]
        alloc = r_dict["current_allocated_hours"]
        r_dict["utilization_percentage"] = round((alloc / cap * 100), 1) if cap > 0 else 0
        resources.append(r_dict)

    return resources

@app.post("/api/resources")
def create_resource(user: UserCreate):
    conn = get_db_connection()
    skills_json = json.dumps(user.skills)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (name, email, role, job_title, department, hourly_rate, cost_rate, weekly_capacity, avatar_url, skills, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user.name, user.email, user.role, user.job_title, user.department, user.hourly_rate, user.cost_rate, user.weekly_capacity, user.avatar_url, skills_json, user.status))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return {"id": user_id, "message": "Resource created successfully"}
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email already exists")

@app.put("/api/resources/{user_id}")
def update_resource(user_id: int, user: UserUpdate):
    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Resource not found")

    fields = []
    params = []
    user_data = user.model_dump(exclude_unset=True)

    for key, value in user_data.items():
        if key == "skills" and value is not None:
            fields.append("skills = ?")
            params.append(json.dumps(value))
        else:
            fields.append(f"{key} = ?")
            params.append(value)

    if fields:
        params.append(user_id)
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()

    conn.close()
    return {"message": "Resource updated successfully"}

@app.delete("/api/resources/{user_id}")
def delete_resource(user_id: int):
    conn = get_db_connection()
    conn.execute("UPDATE users SET status = 'inactive' WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Resource deactivated successfully"}


# ==========================================
# ALLOCATIONS & HEATMAP ENDPOINTS
# ==========================================
@app.get("/api/allocations")
def get_allocations(user_id: Optional[int] = None, project_id: Optional[int] = None):
    conn = get_db_connection()
    query = """
        SELECT 
            a.*,
            u.name as user_name, u.avatar_url, u.job_title, u.department, u.weekly_capacity,
            p.name as project_name, p.code as project_code, p.color as project_color
        FROM allocations a
        JOIN users u ON a.user_id = u.id
        JOIN projects p ON a.project_id = p.id
        WHERE 1=1
    """
    params = []
    if user_id:
        query += " AND a.user_id = ?"
        params.append(user_id)
    if project_id:
        query += " AND a.project_id = ?"
        params.append(project_id)

    query += " ORDER BY a.start_date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/allocations/heatmap")
def get_allocation_heatmap(weeks_count: int = 8, start_week: Optional[str] = None):
    """Returns resource allocation matrix for N upcoming weeks."""
    conn = get_db_connection()
    
    if start_week:
        try:
            base_monday = datetime.strptime(start_week, "%Y-%m-%d").date()
        except ValueError:
            base_monday = get_monday()
    else:
        base_monday = get_monday()

    weeks = []
    for i in range(weeks_count):
        w_monday = base_monday + timedelta(days=i * 7)
        w_sunday = w_monday + timedelta(days=6)
        weeks.append({
            "start": w_monday.isoformat(),
            "end": w_sunday.isoformat(),
            "label": f"W{w_monday.isocalendar()[1]} ({w_monday.strftime('%b %d')})"
        })

    users = conn.execute("SELECT id, name, job_title, department, avatar_url, weekly_capacity FROM users WHERE status = 'active' ORDER BY department, name").fetchall()
    
    matrix = []
    for u in users:
        u_dict = dict(u)
        user_allocations = conn.execute("""
            SELECT a.*, p.name as project_name, p.code as project_code, p.color as project_color
            FROM allocations a
            JOIN projects p ON a.project_id = p.id
            WHERE a.user_id = ?
        """, (u["id"],)).fetchall()

        week_data = []
        for w in weeks:
            w_start = w["start"]
            w_end = w["end"]
            
            # Find active allocations in this week
            matching_allocs = [
                dict(a) for a in user_allocations 
                if a["start_date"] <= w_end and a["end_date"] >= w_start
            ]
            total_hours = sum(a["hours_per_week"] for a in matching_allocs)
            capacity = u["weekly_capacity"]
            percentage = round((total_hours / capacity * 100), 1) if capacity > 0 else 0

            status_tag = "optimal"
            if percentage > 100:
                status_tag = "overloaded"
            elif percentage < 75:
                status_tag = "available"

            week_data.append({
                "week_start": w_start,
                "week_label": w["label"],
                "total_hours": total_hours,
                "percentage": percentage,
                "status": status_tag,
                "allocations": matching_allocs
            })

        u_dict["weeks"] = week_data
        matrix.append(u_dict)

    conn.close()
    return {"weeks": weeks, "resources": matrix}

@app.post("/api/allocations")
def create_allocation(allocation: AllocationCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO allocations (user_id, project_id, role, start_date, end_date, hours_per_week, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (allocation.user_id, allocation.project_id, allocation.role, allocation.start_date, allocation.end_date, allocation.hours_per_week, allocation.notes))
    conn.commit()
    alloc_id = cursor.lastrowid
    conn.close()
    return {"id": alloc_id, "message": "Allocation created successfully"}

@app.put("/api/allocations/{allocation_id}")
def update_allocation(allocation_id: int, allocation: AllocationUpdate):
    conn = get_db_connection()
    fields = []
    params = []
    for key, value in allocation.model_dump(exclude_unset=True).items():
        fields.append(f"{key} = ?")
        params.append(value)

    if fields:
        params.append(allocation_id)
        conn.execute(f"UPDATE allocations SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return {"message": "Allocation updated successfully"}

@app.delete("/api/allocations/{allocation_id}")
def delete_allocation(allocation_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM allocations WHERE id = ?", (allocation_id,))
    conn.commit()
    conn.close()
    return {"message": "Allocation deleted successfully"}


# ==========================================
# PROJECTS & CLIENTS ENDPOINTS
# ==========================================
@app.get("/api/projects")
def get_projects(status: Optional[str] = None):
    conn = get_db_connection()
    query = """
        SELECT 
            p.*,
            c.name as client_name, c.company as client_company,
            COALESCE(SUM(te.hours), 0) as logged_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END), 0) as billable_hours,
            COUNT(DISTINCT a.user_id) as allocated_members_count
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN timesheet_entries te ON p.id = te.project_id
        LEFT JOIN allocations a ON p.id = a.project_id
        WHERE 1=1
    """
    params = []
    if status and status != "all":
        query += " AND p.status = ?"
        params.append(status)

    query += " GROUP BY p.id ORDER BY p.status, p.name"
    rows = conn.execute(query, params).fetchall()

    projects = []
    for r in rows:
        p_dict = dict(r)
        budget = p_dict["budget_hours"]
        logged = p_dict["logged_hours"]
        p_dict["burn_percentage"] = round((logged / budget * 100), 1) if budget > 0 else 0
        p_dict["financial_burn"] = round(logged * (p_dict.get("hourly_rate") or 0), 2)
        projects.append(p_dict)

    conn.close()
    return projects

@app.post("/api/projects")
def create_project(project: ProjectCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO projects (client_id, name, code, description, status, start_date, end_date, budget_hours, budget_amount, billing_type, hourly_rate, color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (project.client_id, project.name, project.code, project.description, project.status, project.start_date, project.end_date, project.budget_hours, project.budget_amount, project.billing_type, project.hourly_rate, project.color))
        project_id = cursor.lastrowid

        # Insert default project tasks
        default_tasks = [
            (project_id, "General Development", "Core feature implementation", 1, 1),
            (project_id, "Design & Wireframing", "UI/UX prototypes and reviews", 1, 1),
            (project_id, "Quality Assurance", "Testing and verification", 1, 1),
            (project_id, "Project Management & Syncs", "Meetings and backlog coordination", 1, 0)
        ]
        cursor.executemany("""
            INSERT INTO tasks (project_id, name, description, billable, is_default)
            VALUES (?, ?, ?, ?, ?)
        """, default_tasks)

        conn.commit()
        conn.close()
        return {"id": project_id, "message": "Project created successfully with default tasks"}
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Project with this code already exists")

@app.put("/api/projects/{project_id}")
def update_project(project_id: int, project: ProjectUpdate):
    conn = get_db_connection()
    fields = []
    params = []
    for key, value in project.model_dump(exclude_unset=True).items():
        fields.append(f"{key} = ?")
        params.append(value)

    if fields:
        params.append(project_id)
        conn.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return {"message": "Project updated successfully"}

@app.get("/api/projects/{project_id}/tasks")
def get_project_tasks(project_id: int):
    conn = get_db_connection()
    tasks = conn.execute("SELECT * FROM tasks WHERE project_id = ? ORDER BY is_default DESC, name", (project_id,)).fetchall()
    conn.close()
    return [dict(t) for t in tasks]

@app.post("/api/projects/{project_id}/tasks")
def create_project_task(project_id: int, task: TaskCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (project_id, name, description, billable, is_default)
        VALUES (?, ?, ?, ?, ?)
    """, (project_id, task.name, task.description, task.billable, task.is_default))
    conn.commit()
    task_id = cursor.lastrowid
    conn.close()
    return {"id": task_id, "message": "Task created successfully"}

@app.get("/api/clients")
def get_clients():
    conn = get_db_connection()
    clients = conn.execute("SELECT * FROM clients ORDER BY name").fetchall()
    conn.close()
    return [dict(c) for c in clients]

@app.post("/api/clients")
def create_client(client: ClientCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO clients (name, company, email, phone)
        VALUES (?, ?, ?, ?)
    """, (client.name, client.company, client.email, client.phone))
    conn.commit()
    client_id = cursor.lastrowid
    conn.close()
    return {"id": client_id, "message": "Client created successfully"}


# ==========================================
# TIMESHEETS & ENTRIES ENDPOINTS
# ==========================================
@app.get("/api/timesheets")
def get_timesheet(user_id: int, week_start_date: str):
    """
    Returns weekly timesheet details, matrix rows (grouped by project & task),
    and daily entries for Monday through Sunday.
    """
    conn = get_db_connection()
    
    # Check if timesheet record exists
    ts = conn.execute("""
        SELECT t.*, u.name as user_name, u.job_title, u.weekly_capacity,
               a.name as approver_name
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.approved_by = a.id
        WHERE t.user_id = ? AND t.week_start_date = ?
    """, (user_id, week_start_date)).fetchone()

    # Calculate Monday through Sunday dates
    try:
        monday = datetime.strptime(week_start_date, "%Y-%m-%d").date()
    except ValueError:
        monday = get_monday()
        week_start_date = monday.isoformat()

    week_days = [(monday + timedelta(days=i)).isoformat() for i in range(7)]

    entries = []
    if ts:
        entries_rows = conn.execute("""
            SELECT 
                te.*,
                p.name as project_name, p.code as project_code, p.color as project_color,
                tk.name as task_name
            FROM timesheet_entries te
            JOIN projects p ON te.project_id = p.id
            LEFT JOIN tasks tk ON te.task_id = tk.id
            WHERE te.timesheet_id = ?
            ORDER BY p.name, te.entry_date
        """, (ts["id"],)).fetchall()
        entries = [dict(e) for e in entries_rows]

    # User's active assigned projects for convenience
    user_assigned_projects = conn.execute("""
        SELECT DISTINCT p.id, p.name, p.code, p.color
        FROM projects p
        JOIN allocations a ON p.id = a.project_id
        WHERE a.user_id = ? AND p.status = 'active'
    """, (user_id,)).fetchall()

    conn.close()

    return {
        "timesheet": dict(ts) if ts else {
            "id": None,
            "user_id": user_id,
            "week_start_date": week_start_date,
            "status": "draft",
            "total_hours": 0.0,
            "billable_hours": 0.0,
            "rejection_reason": None
        },
        "week_days": week_days,
        "entries": entries,
        "assigned_projects": [dict(p) for p in user_assigned_projects]
    }

@app.post("/api/timesheets/save")
def save_timesheet_draft(req: TimesheetSaveRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find or create timesheet
    ts = conn.execute("SELECT * FROM timesheets WHERE user_id = ? AND week_start_date = ?", (req.user_id, req.week_start_date)).fetchone()
    
    if ts and ts["status"] in ["submitted", "approved"]:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Timesheet is currently in '{ts['status']}' state and cannot be modified.")

    total_hours = sum(e.hours for e in req.entries)
    billable_hours = sum(e.hours for e in req.entries if e.is_billable == 1)

    if not ts:
        cursor.execute("""
            INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, updated_at)
            VALUES (?, ?, 'draft', ?, ?, CURRENT_TIMESTAMP)
        """, (req.user_id, req.week_start_date, total_hours, billable_hours))
        timesheet_id = cursor.lastrowid
    else:
        timesheet_id = ts["id"]
        cursor.execute("""
            UPDATE timesheets 
            SET total_hours = ?, billable_hours = ?, status = 'draft', rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (total_hours, billable_hours, timesheet_id))

    # Replace entries
    cursor.execute("DELETE FROM timesheet_entries WHERE timesheet_id = ?", (timesheet_id,))

    for e in req.entries:
        if e.hours > 0 or e.description:
            cursor.execute("""
                INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (timesheet_id, e.project_id, e.task_id, e.entry_date, e.hours, e.description, e.is_billable))

    conn.commit()
    conn.close()
    return {"message": "Timesheet draft saved successfully", "timesheet_id": timesheet_id}

@app.post("/api/timesheets/submit")
def submit_timesheet(req: TimesheetSubmitRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    ts = conn.execute("SELECT * FROM timesheets WHERE user_id = ? AND week_start_date = ?", (req.user_id, req.week_start_date)).fetchone()

    # If entries were passed along with submission, save them first
    if req.entries is not None:
        total_hours = sum(e.hours for e in req.entries)
        billable_hours = sum(e.hours for e in req.entries if e.is_billable == 1)
        
        if not ts:
            cursor.execute("""
                INSERT INTO timesheets (user_id, week_start_date, status, total_hours, billable_hours, submitted_at, updated_at)
                VALUES (?, ?, 'submitted', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (req.user_id, req.week_start_date, total_hours, billable_hours))
            timesheet_id = cursor.lastrowid
        else:
            timesheet_id = ts["id"]
            cursor.execute("""
                UPDATE timesheets 
                SET total_hours = ?, billable_hours = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (total_hours, billable_hours, timesheet_id))

        cursor.execute("DELETE FROM timesheet_entries WHERE timesheet_id = ?", (timesheet_id,))
        for e in req.entries:
            if e.hours > 0 or e.description:
                cursor.execute("""
                    INSERT INTO timesheet_entries (timesheet_id, project_id, task_id, entry_date, hours, description, is_billable)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (timesheet_id, e.project_id, e.task_id, e.entry_date, e.hours, e.description, e.is_billable))
    else:
        if not ts:
            conn.close()
            raise HTTPException(status_code=400, detail="No timesheet entries found to submit.")
        cursor.execute("""
            UPDATE timesheets 
            SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (ts["id"],))

    conn.commit()
    conn.close()
    return {"message": "Timesheet submitted for approval successfully"}

@app.get("/api/timesheets/history")
def get_timesheet_history(user_id: int):
    conn = get_db_connection()
    history = conn.execute("""
        SELECT 
            t.*,
            a.name as approver_name
        FROM timesheets t
        LEFT JOIN users a ON t.approved_by = a.id
        WHERE t.user_id = ?
        ORDER BY t.week_start_date DESC
    """, (user_id,)).fetchall()
    conn.close()
    return [dict(h) for h in history]


# ==========================================
# APPROVALS ENDPOINTS (MANAGER / ADMIN)
# ==========================================
@app.get("/api/approvals")
def get_approvals(status: Optional[str] = "submitted", department: Optional[str] = None):
    conn = get_db_connection()
    query = """
        SELECT 
            t.*,
            u.name as user_name, u.email as user_email, u.job_title, u.department, u.avatar_url, u.weekly_capacity,
            a.name as approver_name
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.approved_by = a.id
        WHERE 1=1
    """
    params = []
    if status and status != "all":
        query += " AND t.status = ?"
        params.append(status)
    if department and department != "all":
        query += " AND u.department = ?"
        params.append(department)

    query += " ORDER BY t.submitted_at DESC, t.week_start_date DESC"
    rows = conn.execute(query, params).fetchall()

    approvals = []
    for r in rows:
        r_dict = dict(r)
        # Fetch entries breakdown summary
        entries = conn.execute("""
            SELECT 
                p.name as project_name, p.code as project_code, p.color as project_color,
                tk.name as task_name,
                SUM(te.hours) as total_project_hours,
                SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END) as billable_project_hours
            FROM timesheet_entries te
            JOIN projects p ON te.project_id = p.id
            LEFT JOIN tasks tk ON te.task_id = tk.id
            WHERE te.timesheet_id = ?
            GROUP BY p.id, tk.id
        """, (r["id"],)).fetchall()
        r_dict["project_breakdown"] = [dict(e) for e in entries]
        approvals.append(r_dict)

    conn.close()
    return approvals

@app.post("/api/approvals/{timesheet_id}/approve")
def approve_timesheet(timesheet_id: int, req: ApprovalActionRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE timesheets 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (req.reviewer_id, timesheet_id))
    conn.commit()
    conn.close()
    return {"message": "Timesheet approved successfully"}

@app.post("/api/approvals/{timesheet_id}/reject")
def reject_timesheet(timesheet_id: int, req: ApprovalActionRequest):
    if not req.rejection_reason or not req.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE timesheets 
        SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (req.reviewer_id, req.rejection_reason.strip(), timesheet_id))
    conn.commit()
    conn.close()
    return {"message": "Timesheet rejected with feedback"}

@app.post("/api/approvals/bulk-approve")
def bulk_approve_timesheets(req: BulkApprovalRequest):
    if not req.timesheet_ids:
        return {"message": "No timesheets specified"}

    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in req.timesheet_ids)
    cursor.execute(f"""
        UPDATE timesheets 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id IN ({placeholders}) AND status = 'submitted'
    """, [req.reviewer_id] + req.timesheet_ids)
    conn.commit()
    count = cursor.rowcount
    conn.close()
    return {"message": f"Successfully approved {count} timesheet(s)"}


# ==========================================
# REPORTS & ANALYTICS ENDPOINTS
# ==========================================
@app.get("/api/reports/utilization")
def get_utilization_report(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    if not start_date or not end_date:
        today = date.today()
        start_date = (today - timedelta(days=30)).isoformat()
        end_date = today.isoformat()

    # Per resource utilization
    resources = conn.execute("""
        SELECT 
            u.id, u.name, u.job_title, u.department, u.weekly_capacity, u.avatar_url,
            COALESCE(SUM(te.hours), 0) as total_logged_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END), 0) as billable_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 0 THEN te.hours ELSE 0 END), 0) as non_billable_hours
        FROM users u
        LEFT JOIN timesheet_entries te ON u.id = (SELECT user_id FROM timesheets WHERE id = te.timesheet_id)
            AND te.entry_date BETWEEN ? AND ?
        WHERE u.status = 'active'
        GROUP BY u.id
        ORDER BY u.department, total_logged_hours DESC
    """, (start_date, end_date)).fetchall()

    res_list = []
    for r in resources:
        r_dict = dict(r)
        logged = r_dict["total_logged_hours"]
        billable = r_dict["billable_hours"]
        r_dict["billable_percentage"] = round((billable / logged * 100), 1) if logged > 0 else 0
        res_list.append(r_dict)

    # Department level aggregation
    departments = conn.execute("""
        SELECT 
            u.department,
            COUNT(DISTINCT u.id) as team_size,
            COALESCE(SUM(te.hours), 0) as total_logged_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END), 0) as billable_hours
        FROM users u
        LEFT JOIN timesheet_entries te ON u.id = (SELECT user_id FROM timesheets WHERE id = te.timesheet_id)
            AND te.entry_date BETWEEN ? AND ?
        WHERE u.status = 'active'
        GROUP BY u.department
        ORDER BY total_logged_hours DESC
    """, (start_date, end_date)).fetchall()

    dept_list = []
    for d in departments:
        d_dict = dict(d)
        logged = d_dict["total_logged_hours"]
        billable = d_dict["billable_hours"]
        d_dict["billable_rate"] = round((billable / logged * 100), 1) if logged > 0 else 0
        dept_list.append(d_dict)

    conn.close()
    return {
        "date_range": {"start_date": start_date, "end_date": end_date},
        "resources": res_list,
        "departments": dept_list
    }

@app.get("/api/reports/profitability")
def get_profitability_report():
    conn = get_db_connection()
    projects = conn.execute("""
        SELECT 
            p.id, p.name, p.code, p.status, p.budget_hours, p.budget_amount, p.hourly_rate as billing_rate,
            c.name as client_name,
            COALESCE(SUM(te.hours), 0) as logged_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours ELSE 0 END), 0) as billable_hours,
            COALESCE(SUM(CASE WHEN te.is_billable = 1 THEN te.hours * p.hourly_rate ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(te.hours * u.cost_rate), 0) as total_internal_cost
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN timesheet_entries te ON p.id = te.project_id
        LEFT JOIN timesheets ts ON te.timesheet_id = ts.id
        LEFT JOIN users u ON ts.user_id = u.id
        GROUP BY p.id
        ORDER BY total_revenue DESC
    """).fetchall()

    prof_list = []
    for p in projects:
        p_dict = dict(p)
        rev = p_dict["total_revenue"]
        cost = p_dict["total_internal_cost"]
        profit = rev - cost
        p_dict["gross_profit"] = round(profit, 2)
        p_dict["margin_percentage"] = round((profit / rev * 100), 1) if rev > 0 else 0
        p_dict["budget_consumed_percentage"] = round((p_dict["logged_hours"] / p_dict["budget_hours"] * 100), 1) if p_dict["budget_hours"] > 0 else 0
        prof_list.append(p_dict)

    conn.close()
    return prof_list

@app.get("/api/reports/audit-log")
def get_time_audit_log(
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    is_billable: Optional[int] = None
):
    conn = get_db_connection()
    query = """
        SELECT 
            te.id, te.entry_date, te.hours, te.description, te.is_billable,
            u.id as user_id, u.name as user_name, u.avatar_url, u.department,
            p.id as project_id, p.name as project_name, p.code as project_code, p.color as project_color,
            tk.name as task_name,
            ts.status as timesheet_status
        FROM timesheet_entries te
        JOIN timesheets ts ON te.timesheet_id = ts.id
        JOIN users u ON ts.user_id = u.id
        JOIN projects p ON te.project_id = p.id
        LEFT JOIN tasks tk ON te.task_id = tk.id
        WHERE 1=1
    """
    params = []
    if user_id:
        query += " AND u.id = ?"
        params.append(user_id)
    if project_id:
        query += " AND p.id = ?"
        params.append(project_id)
    if start_date:
        query += " AND te.entry_date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND te.entry_date <= ?"
        params.append(end_date)
    if is_billable is not None:
        query += " AND te.is_billable = ?"
        params.append(is_billable)

    query += " ORDER BY te.entry_date DESC, u.name LIMIT 500"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/reports/export-csv")
def export_timesheet_csv(
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    logs = get_time_audit_log(user_id, project_id, start_date, end_date)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(["Entry Date", "User Name", "Department", "Project Code", "Project Name", "Task", "Hours", "Billable", "Timesheet Status", "Description"])
    
    for row in logs:
        writer.writerow([
            row.get("entry_date", ""),
            row.get("user_name", ""),
            row.get("department", ""),
            row.get("project_code", ""),
            row.get("project_name", ""),
            row.get("task_name", "General"),
            row.get("hours", 0),
            "Yes" if row.get("is_billable") == 1 else "No",
            row.get("timesheet_status", ""),
            row.get("description", "")
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=timesheet_export_{date.today().isoformat()}.csv"}
    )


# ==========================================
# ROOT HTML ROUTE
# ==========================================
@app.get("/", response_class=HTMLResponse)
def get_root():
    index_file = os.path.join(TEMPLATES_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Resource & Timesheet Hub is starting up...</h1>"


if __name__ == "__main__":
    import uvicorn
    print("Starting Resource Management & Timesheet Hub on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
