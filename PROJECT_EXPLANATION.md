# Arcki Traders MIS — Complete Project Explanation

> This document explains every part of this project from scratch, line by line, in simple language.
> Written for someone who wants to understand how it works end to end.

---

## Table of Contents

1. [What is this project?](#1-what-is-this-project)
2. [How the project is organized](#2-how-the-project-is-organized)
3. [Backend — File by File](#3-backend--file-by-file)
   - [config.py](#31-configpy--settings-of-the-app)
   - [database.py](#32-databasepy--connecting-to-mongodb)
   - [main.py](#33-mainpy--starting-the-server)
   - [models/](#34-models--defining-allowed-values)
   - [schemas/lead.py](#35-schemaslead-py--validating-data)
   - [services/auth_service.py](#36-servicesauth_servicepy--login-logic)
   - [services/lead_service.py](#37-serviceslead_servicepy--lead-logic)
   - [routers/auth.py](#38-routersauthpy--login-api-endpoints)
   - [routers/leads.py](#39-routersleadspy--leads-api-endpoints)
   - [routers/followups.py](#310-routersfollowupspy--followup-endpoints)
   - [routers/sales_entries.py](#311-routerssales_entriespy--sales-endpoints)
4. [Frontend — File by File](#4-frontend--file-by-file)
   - [services/api.js](#41-servicesapijs--the-api-connection)
   - [store/authStore.js](#42-storeauthstorejs--login-state)
   - [App.jsx](#43-appjsx--page-routing)
   - [pages/sales/LeadForm.jsx](#44-pagessalesleadformjsx--create-lead-form)
5. [How Data Flows — Full Walkthrough](#5-how-data-flows--full-walkthrough)
6. [The Database Collections](#6-the-database-collections)
7. [Authentication System](#7-authentication-system)
8. [The Approval Workflow](#8-the-approval-workflow)
9. [What to Learn to Understand This Project](#9-what-to-learn-to-understand-this-project)

---

## 1. What is this project?

This is a **MIS (Management Information System)** for a construction materials company called **Arcki Traders**.

### The real-world problem

Arcki Traders sells **steel** and **cement** to construction sites. They have a team of salespersons who visit sites every day. Before this app:

- Salespersons wrote notes on paper or WhatsApp
- The manager (admin) had no real-time view of what was happening
- Follow-up visits were forgotten
- There was no way to verify if a reported sale actually happened

### What this app solves

| Problem | Solution |
|---|---|
| No record of site visits | Salesperson creates a **Lead** for every site |
| Forgetting follow-ups | System tracks **next follow-up date** |
| Unverified sales claims | Sales go through an **approval workflow** |
| No performance visibility | Admin sees **dashboard with charts and reports** |
| Fake location claims | GPS is captured when creating a lead |

### The two types of users

- **Salesperson** — Can create leads, log follow-ups, record sales. Can only see their own data.
- **Admin (Manager)** — Can see everything, approve/reject sales, export reports, manage users.

---

## 2. How the project is organized

```
MIS project/
├── backend/          ← Python server (handles data, logic, database)
│   └── app/
│       ├── main.py         ← Entry point, starts the server
│       ├── config.py       ← All settings (DB URL, secret keys)
│       ├── database.py     ← MongoDB connection
│       ├── models/         ← Enum definitions (allowed values)
│       ├── schemas/        ← Data validation rules
│       ├── routers/        ← API URL endpoints
│       ├── services/       ← Business logic
│       └── utils/          ← Helper functions
│
└── frontend/         ← React website (what the user sees)
    └── src/
        ├── App.jsx         ← Page routing
        ├── pages/          ← Each screen/page
        ├── services/       ← Functions to call the backend
        ├── store/          ← Global state (who is logged in)
        ├── components/     ← Reusable UI pieces
        └── utils/          ← Constants and helpers
```

Think of it as two separate programs that talk to each other:
- The **backend** is like a restaurant kitchen — it processes requests and stores data
- The **frontend** is the dining area — it's what the user interacts with
- They communicate using **HTTP requests** (like a waiter passing orders)

---

## 3. Backend — File by File

### 3.1 `config.py` — Settings of the App

```python
class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "construction_mis"
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    cors_origins: str = "http://localhost:5173,..."
    upload_dir: str = "uploads"
```

**What this does, line by line:**

- `mongodb_url` — The address of the database. `localhost:27017` means "on this same computer, port 27017".
- `database_name` — Inside MongoDB, data is organized in databases. This app uses one called `construction_mis`.
- `secret_key` — A password used to sign JWT tokens (login tokens). Must be changed before going live.
- `algorithm: "HS256"` — The mathematical method used to sign tokens. HS256 is a secure hashing algorithm.
- `access_token_expire_minutes: 1440` — Login tokens last 1440 minutes = 24 hours. After that, re-login required.
- `cors_origins` — CORS is a browser security rule. This lists which websites are allowed to call our API.
- `upload_dir` — The folder where uploaded site photos are saved.

```python
@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

- `@lru_cache()` — This means "create the Settings object only once, then reuse it". Without this, settings would be re-read from the `.env` file on every single request, which is slow.

---

### 3.2 `database.py` — Connecting to MongoDB

```python
client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None
```

- These are **global variables**. They start as `None` and get filled when the app starts.
- `AsyncIOMotorClient` is the MongoDB driver that works with Python's async system.

```python
async def connect_to_mongodb():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    await create_indexes()
```

- `global client, db` — We're modifying the global variables, not creating new local ones.
- `AsyncIOMotorClient(settings.mongodb_url)` — Opens a connection to the database.
- `client[settings.database_name]` — Selects the specific database inside MongoDB.
- `create_indexes()` — Creates search indexes for faster queries (like a book's index).

```python
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.leads.create_index("sales_person_id")
    await db.leads.create_index([("created_at", -1)])
```

- `unique=True` on email — MongoDB will reject duplicate emails automatically.
- `[("created_at", -1)]` — The `-1` means "sort newest first". This makes sorting by date very fast.
- Indexes work like a book's index page — without them, MongoDB reads every single record to find a match.

```python
def get_database() -> AsyncIOMotorDatabase:
    return db
```

- Every service calls this function to get the database object. It returns the same global `db`.

---

### 3.3 `main.py` — Starting the Server

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongodb()
    from .services.auth_service import AuthService
    await AuthService.create_default_admin()
    yield
    await close_mongodb_connection()
```

- `@asynccontextmanager` — This is a setup/teardown pattern. Code before `yield` runs at **startup**, code after `yield` runs at **shutdown**.
- `connect_to_mongodb()` — When the server starts, it connects to the database.
- `create_default_admin()` — If no users exist in the database yet, it creates a default admin account automatically.
- `yield` — This is where the app "lives" and serves requests.
- `close_mongodb_connection()` — When the server stops (e.g., Ctrl+C), it cleanly closes the DB connection.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- **CORS middleware** — Browsers block websites from calling APIs on different domains by default. This middleware tells browsers "it's OK, allow these specific origins to make requests".
- `allow_methods=["*"]` — Allow GET, POST, PUT, DELETE — all HTTP methods.

```python
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
```

- This makes the `uploads/` folder publicly accessible via URL.
- So a photo saved at `uploads/photo.jpg` can be viewed at `http://localhost:8000/uploads/photo.jpg`.

```python
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(followups.router, prefix="/api/followups", tags=["Follow-ups"])
app.include_router(sales_entries.router, prefix="/api/sales-entries", tags=["Sales Entries"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(master_data.router, prefix="/api/master-data", tags=["Master Data"])
```

- Each `router` is a group of related API endpoints defined in a separate file.
- `prefix="/api/leads"` — All lead-related URLs will start with `/api/leads`.
- Example: The `get_leads` function in `leads.py` is accessible at `GET /api/leads`.

---

### 3.4 `models/` — Defining Allowed Values

```python
# models/lead.py
class ConstructionStage(str, Enum):
    BASEMENT = "basement"
    GROUND_STAGE = "ground_stage"
    LINTEL = "lintel"
    FIRST_RC = "1st_rc"
    SECOND_RC = "2nd_rc"
    PLASTERING = "plastering"

class LeadType(str, Enum):
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"

class LeadStatus(str, Enum):
    FOLLOW_UP = "follow_up"
    WON = "won"
    LOST = "lost"

class BuilderType(str, Enum):
    IHB = "ihb"
    ENGINEER = "engineer"
    CONTRACTOR = "contractor"
```

- **Enum** means "only these specific values are allowed". If you try to save `lead_type = "lukewarm"`, it will be rejected.
- `(str, Enum)` — The enum inherits from `str`, which means each value can be compared and stored as a plain string.
- `BASEMENT = "basement"` — The left side (`BASEMENT`) is the Python name used in code. The right side (`"basement"`) is what gets stored in the database.
- These models represent the **business rules** of construction — a site goes from Basement → Ground → Lintel → RC (roof casting) → Plastering.

---

### 3.5 `schemas/lead.py` — Validating Data

Schemas are the "contract" for what data must look like when it comes in or goes out.

```python
class LeadLocation(BaseModel):
    latitude: float
    longitude: float
    maps_link: str
    captured_at: Optional[datetime] = None
```

- This defines what a location object must contain: two decimal numbers (lat/lng), a Google Maps URL, and optionally a timestamp.

```python
class LeadCreate(BaseModel):
    site_location_name: str = Field(..., min_length=2)
    area: str = Field(..., min_length=2)
    steel_brand: Optional[str] = None
    construction_stage: ConstructionStage
    lead_type: LeadType = LeadType.COLD
    customer_name: str = Field(..., min_length=2)
    phone_number: str = Field(..., min_length=10, max_length=10)
    builder_type: BuilderType
    location: Optional[LeadLocation] = None
```

- `Field(..., min_length=2)` — The `...` means "this field is required". `min_length=2` means at least 2 characters.
- `Optional[str] = None` — This field is not required. If not provided, it defaults to `None` (empty).
- `lead_type: LeadType = LeadType.COLD` — If not provided, defaults to "cold" automatically.
- `construction_stage: ConstructionStage` — Must be one of the allowed enum values. Any other value causes an error.

```python
@field_validator('phone_number')
@classmethod
def validate_phone_number(cls, v):
    if not re.match(r'^[6-9]\d{9}$', v):
        raise ValueError('Enter a valid 10-digit Indian mobile number')
    return v
```

- `@field_validator` — Runs custom validation on the `phone_number` field.
- `r'^[6-9]\d{9}$'` — This is a **regex** (pattern matcher). It means: "must start with 6, 7, 8, or 9, followed by exactly 9 more digits". This matches valid Indian mobile numbers.
- If the pattern doesn't match, it raises a `ValueError` and the request is rejected.

```python
class LeadResponse(BaseModel):
    id: str
    site_location_name: str
    ...
    sales_person_name: Optional[str] = None
    created_at: datetime
```

- This is what gets **sent back** to the frontend. It controls exactly what fields are included in the response.
- Note: `sales_person_name` is added by a MongoDB join (lookup), not stored directly in the lead document.

---

### 3.6 `services/auth_service.py` — Login Logic

```python
class AuthService:
    @staticmethod
    async def create_user(user_data: UserCreate) -> dict:
        db = get_database()
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise ValueError("Email already registered")
```

- `@staticmethod` — This method belongs to the class but doesn't need access to `self`. It's a utility function.
- `db.users.find_one({"email": user_data.email})` — Search the `users` collection for a document where email matches. If found, the email is already taken.

```python
        user_doc = {
            "email": user_data.email,
            "password_hash": get_password_hash(user_data.password),
            "name": user_data.name,
            "role": user_data.role,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        result = await db.users.insert_one(user_doc)
```

- `get_password_hash(user_data.password)` — The password is **never stored as plain text**. It's converted to an irreversible hash (e.g., `"admin123"` becomes `"$2b$12$..."`). Even if the database is stolen, passwords can't be read.
- `insert_one(user_doc)` — Saves the document to MongoDB.

```python
    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[dict]:
        user = await db.users.find_one({"email": email})
        if not user:
            return None
        if not verify_password(password, user["password_hash"]):
            return None
        if not user.get("is_active", False):
            return None
        return user
```

- Step 1: Find user by email.
- Step 2: `verify_password` — Takes the plain text password the user typed and the stored hash. Runs the same hashing algorithm to check if they match. Returns `True` or `False`.
- Step 3: Check if account is active (admin can deactivate accounts).
- If all 3 checks pass, return the user document.

```python
    @staticmethod
    def create_token(user: dict) -> Token:
        token_data = {
            "sub": str(user["_id"]),   # sub = subject (who this token belongs to)
            "role": user["role"]
        }
        access_token = create_access_token(data=token_data)
        return Token(access_token=access_token)
```

- `"sub"` is a standard JWT field meaning "subject" — the user ID.
- `"role"` is added so the backend knows if a request is from an admin or salesperson without hitting the database every time.
- The token is a long encoded string like `eyJhbGci...` that the frontend stores and sends with every request.

---

### 3.7 `services/lead_service.py` — Lead Logic

```python
    @staticmethod
    async def create_lead(lead_data: LeadCreate, sales_person_id: str) -> dict:
        db = get_database()

        lead_doc = {
            "site_location_name": lead_data.site_location_name,
            ...
            "location": lead_data.location.model_dump() if lead_data.location else None,
            "sales_person_id": ObjectId(sales_person_id),
            "visit_count": 1,
            "created_at": datetime.utcnow(),
        }

        result = await db.leads.insert_one(lead_doc)
```

- `ObjectId(sales_person_id)` — MongoDB uses a special ID type called `ObjectId`. This converts the string ID from the token into that type.
- `lead_data.location.model_dump()` — Converts the Pydantic location object into a plain Python dictionary so it can be stored in MongoDB.
- `visit_count: 1` — Every new lead starts with 1 visit (the one that created it).

```python
        # Create initial visit record
        visit_doc = {
            "lead_id": result.inserted_id,
            "sales_person_id": ObjectId(sales_person_id),
            "visit_date": datetime.utcnow(),
            "construction_stage_at_visit": lead_data.construction_stage,
            "remarks": lead_data.remarks or "Initial visit",
        }
        await db.visits.insert_one(visit_doc)
```

- When a lead is created, a **visit record** is also automatically created. This records the first visit.
- Every future follow-up adds another visit record, building a complete history.

```python
    @staticmethod
    async def get_leads(user: dict, page: int = 1, ...):
        filter_dict = {}

        # Role-based filtering — salesperson sees only their own leads
        if user.get("role") == UserRole.SALESPERSON:
            filter_dict["sales_person_id"] = user["_id"]
```

- This is the **data isolation** rule: salespersons can only see their own leads. Admins see everything.
- The filter is applied at the database query level — not just hidden in the UI. This is the secure way to do it.

```python
        pipeline = [
            {"$match": filter_dict},
            {"$sort": {"created_at": -1}},        # newest first
            {"$skip": skip},                        # skip previous pages
            {"$limit": page_size},                  # take only this page
            {
                "$lookup": {                        # JOIN with users collection
                    "from": "users",
                    "localField": "sales_person_id",
                    "foreignField": "_id",
                    "as": "sales_person"
                }
            },
            {
                "$addFields": {
                    "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]}
                }
            },
            {"$project": {"sales_person": 0}}      # remove the raw array, keep only name
        ]
```

- This is a **MongoDB aggregation pipeline**. Each `{}` is a stage that transforms the data.
- `$match` — Filter (like SQL `WHERE`).
- `$sort` — Order results (like SQL `ORDER BY`).
- `$skip` + `$limit` — Pagination. If page=2, page_size=20: skip 20, take next 20.
- `$lookup` — Join with another collection (like SQL `JOIN`). Gets the salesperson's name from the `users` collection.
- `$addFields` — Add a new field (`sales_person_name`) calculated from the join result.
- `$project` — Remove fields you don't want in the final result.

---

### 3.8 `routers/auth.py` — Login API Endpoints

```python
router = APIRouter()

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await AuthService.authenticate_user(
        credentials.email, credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    return AuthService.create_token(user)
```

- `@router.post("/login")` — This creates a URL: `POST /api/auth/login` (prefix `/api/auth` is added in `main.py`).
- `response_model=Token` — The response will always match the `Token` schema.
- `credentials: UserLogin` — FastAPI automatically reads the JSON body of the request and validates it against `UserLogin`.
- `raise HTTPException(status_code=401)` — If login fails, send back a 401 error. The frontend will see this and show "Invalid credentials".

```python
@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
```

- `Depends(require_admin)` — This is a **dependency**. Before running this function, FastAPI first runs `require_admin`. If the current user is not an admin, it raises a 403 error and this function never runs.
- This means: only admins can create new users.

---

### 3.9 `routers/leads.py` — Leads API Endpoints

```python
@router.get("", response_model=LeadListResponse)
async def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    area: Optional[str] = None,
    lead_status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
```

- `Query(1, ge=1)` — URL query parameter with default value `1`, minimum value `1` (`ge` = greater than or equal).
- `Query(20, ge=1, le=100)` — Default 20, min 1, max 100 (`le` = less than or equal). Prevents someone requesting 1 million records.
- `Optional[str] = None` — These are optional filters. If not provided in the URL, they default to `None` and are ignored.
- Example URL: `GET /api/leads?page=2&lead_status=won&search=Sharma`

```python
@router.post("/{lead_id}/photos", response_model=LeadResponse)
async def upload_photos(
    lead_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    photo_urls = []
    for file in files:
        ext = os.path.splitext(file.filename)[1]           # get file extension like .jpg
        filename = f"{lead_id}_{uuid.uuid4()}{ext}"        # create unique filename
        filepath = os.path.join(settings.upload_dir, filename)

        async with aiofiles.open(filepath, 'wb') as f:
            content = await file.read()
            await f.write(content)

        photo_urls.append(f"/uploads/{filename}")
```

- `List[UploadFile] = File(...)` — Accepts multiple file uploads at once.
- `uuid.uuid4()` — Generates a random unique ID (e.g., `a7b3c...`). This prevents file name conflicts.
- `async with aiofiles.open` — Writes the file to disk asynchronously. `'wb'` = write binary mode (for images).
- The URL `/uploads/filename.jpg` is then stored in the database, and the browser can load it via the static file server.

---

### 3.10 `routers/followups.py` — Follow-up Endpoints

```python
@router.post("/leads/{lead_id}/followup", response_model=VisitResponse)
async def add_followup(lead_id: str, followup_data: FollowupCreate, ...):
    # Create visit record
    visit_doc = {
        "lead_id": ObjectId(lead_id),
        "visit_date": datetime.utcnow(),
        "construction_stage_at_visit": followup_data.construction_stage_at_visit,
        "remarks": followup_data.remarks,
        "next_followup_date": followup_data.next_followup_date,
    }
    result = await db.visits.insert_one(visit_doc)

    # Update the lead itself
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$set": {
                "construction_stage": followup_data.construction_stage_at_visit,
                "next_followup_date": followup_data.next_followup_date,
            },
            "$inc": {"visit_count": 1}    # increment visit count by 1
        }
    )
```

- Each follow-up does **two things**: creates a visit record AND updates the lead.
- `$set` — Update these specific fields.
- `$inc: {"visit_count": 1}` — Increment `visit_count` by 1 atomically. This is safer than reading the count, adding 1, and writing it back (which could cause race conditions with simultaneous requests).

```python
@router.get("/overdue", response_model=FollowupListResponse)
async def get_overdue_followups(...):
    filter_dict = {
        "lead_status": LeadStatus.FOLLOW_UP,
        "next_followup_date": {"$lt": today}     # next_followup_date is in the PAST
    }
```

- `"$lt": today` — MongoDB operator `$lt` means "less than". So this finds all leads whose follow-up date is before today — these are overdue.
- Only `FOLLOW_UP` status leads are included — `WON` and `LOST` leads don't need follow-ups.

---

### 3.11 `routers/sales_entries.py` — Sales Endpoints

```python
@router.post("/leads/{lead_id}/entry", response_model=SalesEntryResponse)
async def create_sales_entry(lead_id: str, entry_data: SalesEntryCreate, ...):
    entry_doc = {
        "lead_id": ObjectId(lead_id),
        "steel_quantity_kg": entry_data.steel_quantity_kg,
        "cement_quantity_bags": entry_data.cement_quantity_bags,
        "approval_status": ApprovalStatus.PENDING,   # always starts as PENDING
        "approved_by": None,
        "approval_date": None,
        "rejection_reason": None,
    }
```

- Every new sales entry starts with `approval_status = PENDING`. It cannot be "pre-approved".
- `approved_by`, `approval_date` are `None` until the admin takes action.

```python
@router.put("/{entry_id}/approve", response_model=SalesEntryResponse)
async def approve_entry(entry_id: str, current_user: dict = Depends(require_admin)):
    entry = await db.sales_entries.find_one({"_id": ObjectId(entry_id)})

    if entry["approval_status"] != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Entry is not pending approval")

    await db.sales_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {
            "approval_status": ApprovalStatus.APPROVED,
            "approved_by": current_user["_id"],
            "approval_date": datetime.utcnow(),
        }}
    )
```

- `Depends(require_admin)` — Only admins can reach this endpoint.
- Check if it's still `PENDING` — you can't approve something already approved or rejected.
- Records **who** approved it and **when** — full audit trail.

---

## 4. Frontend — File by File

### 4.1 `services/api.js` — The API Connection

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

- `axios.create(...)` — Creates a pre-configured HTTP client. All requests made through `api` will automatically use this base URL and headers.
- `import.meta.env.VITE_API_URL` — Reads from the `.env` file. In production (Vercel), this is set to the deployed backend URL. In development, it falls back to `/api` (which the Vite proxy redirects to `localhost:8000`).

```javascript
// Request interceptor — attach token to every request
api.interceptors.request.use((config) => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const token = stored?.state?.token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  } catch {
    // ignore parse errors
  }
  return config
})
```

- **Interceptors** run automatically on every request — you don't have to add the token manually each time.
- `localStorage.getItem(STORAGE_KEY)` — Reads the saved login data from the browser's local storage.
- `Authorization: Bearer <token>` — This is the standard way to send a JWT token. The backend reads this header and knows who is making the request.

```javascript
// Response interceptor — handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

- If any request gets back a `401 Unauthorized` (expired token), this interceptor automatically:
  1. Removes the saved token from localStorage
  2. Removes the Authorization header
  3. Redirects to `/login`
- This handles token expiry gracefully — the user is sent to login instead of seeing confusing errors.

---

### 4.2 `store/authStore.js` — Login State

```javascript
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
```

- `create(...)` — Creates a Zustand store. A **store** is like a global variable that any component can read.
- `persist(...)` — Wraps the store so it's saved to `localStorage`. Even after refreshing the page, the login state is remembered.
- `set` — Function to update the store's values.
- `get` — Function to read the store's current values.

```javascript
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        const { access_token } = response.data

        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

        const userResponse = await api.get('/auth/me')

        set({
          token: access_token,
          user: userResponse.data,
          isAuthenticated: true
        })
      },
```

- Step 1: POST to `/auth/login`, get back a token.
- Step 2: Set the token as the default header for all future requests.
- Step 3: GET `/auth/me` using that token to get full user info (name, role, email).
- Step 4: Save everything to the store (and `localStorage` via persist).

```javascript
      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ user: null, token: null, isAuthenticated: false })
      },
```

- Clears the token from Axios headers and resets the store to the "not logged in" state.
- Because of `persist`, this also removes it from `localStorage`.

---

### 4.3 `App.jsx` — Page Routing

```javascript
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/leads" replace />
  }

  return children
}
```

- `ProtectedRoute` is a wrapper component. If you try to visit a protected page:
  - Not logged in → redirected to `/login`
  - Logged in but not admin (for admin routes) → redirected to `/leads`
  - Logged in and authorized → the actual page is shown

```javascript
<Route path="leads/new" element={<LeadForm />} />
<Route path="leads/:id" element={<LeadDetails />} />
<Route path="leads/:id/edit" element={<LeadForm />} />
```

- `leads/new` — The `LeadForm` component is used for creating new leads.
- `leads/:id/edit` — The **same** `LeadForm` component is reused for editing. The `:id` is a variable — if the URL is `/leads/abc123/edit`, then `id = "abc123"` inside the component.
- `leads/:id` — `LeadDetails` shows the full details of one lead.

---

### 4.4 `pages/sales/LeadForm.jsx` — Create Lead Form

```javascript
const isEdit = Boolean(id)
```

- `id` comes from the URL parameter. If we're at `/leads/new`, `id` is `undefined`, so `isEdit = false`.
- If we're at `/leads/abc123/edit`, `id = "abc123"`, so `isEdit = true`.
- This single flag controls the entire form's behavior.

```javascript
const [gpsLocation, setGpsLocation] = useState(null)
const [gpsStatus, setGpsStatus] = useState('idle')
// States: idle | capturing | captured | denied | unavailable
```

- The form tracks GPS state separately from the form data.
- This drives the status badge shown at the top of the form and whether the submit button is enabled.

```javascript
useEffect(() => {
  if (isEdit) return    // don't capture GPS when editing
  if (!navigator.geolocation) {
    setGpsStatus('unavailable')
    return
  }
  setGpsStatus('capturing')
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setGpsLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        maps_link: `https://www.google.com/maps?q=${lat},${lng}`,
        captured_at: new Date().toISOString()
      })
      setGpsStatus('captured')
    },
    () => { setGpsStatus('denied') },
    { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
  )
}, [isEdit])
```

- `useEffect` runs after the component first loads on screen.
- `navigator.geolocation` — Built into every modern browser. Asks the user for location permission.
- `timeout: 10000` — If location isn't found within 10 seconds, it gives up.
- `maximumAge: 0` — Don't use a cached location. Get fresh GPS coordinates right now.
- `enableHighAccuracy: true` — Use GPS chip (more accurate) instead of cell tower triangulation.

```javascript
const onSubmit = (data) => {
  if (!isEdit && !gpsLocation) {
    toast.error('Location is required...')
    return    // ← stops here, doesn't submit
  }
  ...
  if (!isEdit && gpsLocation) {
    payload.location = gpsLocation
  }
  createMutation.mutate(payload)
}
```

- If creating a new lead and GPS wasn't captured, show an error and block submission.
- If GPS was captured, include it in the data sent to the backend.

```javascript
const createMutation = useMutation({
  mutationFn: async (payload) => {
    const lead = await leadsService.create(leadPayload)
    if (selectedFiles.length > 0) {
      await leadsService.uploadPhotos(lead.id, selectedFiles)
    }
    if (leadPayload.lead_status === 'won' && ...) {
      await salesEntriesService.create(lead.id, {...})
    }
    return lead
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    toast.success('Lead created successfully!')
    navigate('/leads')
  },
  onError: (error) => {
    toast.error(error.response?.data?.detail || 'Failed to create lead')
  }
})
```

- `useMutation` from React Query manages the API call — handles loading state, success, and error automatically.
- The mutation does **3 things in sequence**:
  1. Create the lead
  2. Upload photos (if any were selected)
  3. Create a sales entry (only if status is "won")
- `queryClient.invalidateQueries(...)` — After creating, tell React Query to re-fetch the leads list so it shows the new lead immediately.
- `toast.success/error` — Shows a small pop-up notification.

---

## 5. How Data Flows — Full Walkthrough

Here is the complete journey when a salesperson creates a new lead:

```
1. Salesperson opens the app on their phone
   └── App.jsx loads, checks localStorage for saved token
   └── Token found → isAuthenticated = true → show /leads

2. Salesperson clicks "New Lead"
   └── Navigate to /leads/new
   └── LeadForm.jsx loads
   └── useEffect fires → browser asks for location permission
   └── GPS coordinates captured → gpsStatus = 'captured'

3. Salesperson fills the form and clicks "Create Lead"
   └── handleSubmit (react-hook-form) validates all required fields
   └── onSubmit() is called
   └── Checks: gpsLocation exists? ✓
   └── Calls createMutation.mutate(payload)

4. createMutation calls leadsService.create(data)
   └── leadsService.js: api.post('/leads', data)
   └── api.js interceptor attaches Authorization header
   └── HTTP POST sent to http://localhost:8000/api/leads

5. FastAPI backend receives the request
   └── main.py routes it to leads router
   └── leads.py: create_lead() function runs
   └── Depends(get_current_active_user) → reads JWT token
   └── Decodes token → extracts user ID and role
   └── Validates request body against LeadCreate schema
   └── Calls LeadService.create_lead(data, user_id)

6. LeadService.create_lead() runs
   └── Builds lead_doc dictionary
   └── Saves to MongoDB: db.leads.insert_one(lead_doc)
   └── Also saves visit record: db.visits.insert_one(visit_doc)
   └── Returns the created lead document

7. Backend sends response: 200 OK with lead data (JSON)

8. Frontend receives response
   └── createMutation.onSuccess fires
   └── queryClient.invalidateQueries(['leads']) — refresh list
   └── toast.success("Lead created successfully!")
   └── navigate('/leads') — go back to the list

9. LeadsList re-fetches and shows the new lead at the top
```

---

## 6. The Database Collections

MongoDB stores data in **collections** (similar to tables in SQL). Each item in a collection is a **document** (similar to a row, but as a JSON object).

### `users` collection
```json
{
  "_id": "ObjectId(...)",
  "email": "sathish@arckitraders.com",
  "password_hash": "$2b$12$...",
  "name": "Sathish Kumar",
  "role": "salesperson",
  "phone": "9876543210",
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z"
}
```

### `leads` collection
```json
{
  "_id": "ObjectId(...)",
  "site_location_name": "Green Meadows Project",
  "area": "Anna Nagar",
  "customer_name": "Ravi Shankar",
  "phone_number": "9123456789",
  "steel_brand": "TATA Steel",
  "cement_brand": "Ultratech",
  "construction_stage": "lintel",
  "lead_type": "warm",
  "lead_status": "follow_up",
  "builder_type": "ihb",
  "visit_count": 3,
  "next_followup_date": "2025-03-15T10:00:00Z",
  "location": {
    "latitude": 13.0827,
    "longitude": 80.2707,
    "maps_link": "https://www.google.com/maps?q=13.0827,80.2707",
    "captured_at": "2025-01-15T10:30:00Z"
  },
  "sales_person_id": "ObjectId(...)",  ← links to users collection
  "site_photos": ["/uploads/abc123_xyz.jpg"],
  "created_at": "2025-01-15T10:30:00Z"
}
```

### `visits` collection
```json
{
  "_id": "ObjectId(...)",
  "lead_id": "ObjectId(...)",           ← links to leads collection
  "sales_person_id": "ObjectId(...)",   ← links to users collection
  "visit_date": "2025-01-20T14:00:00Z",
  "construction_stage_at_visit": "ground_stage",
  "remarks": "Customer interested, cement needed next week",
  "next_followup_date": "2025-01-27T10:00:00Z",
  "created_at": "2025-01-20T14:00:00Z"
}
```

### `sales_entries` collection
```json
{
  "_id": "ObjectId(...)",
  "lead_id": "ObjectId(...)",
  "sales_person_id": "ObjectId(...)",
  "steel_quantity_kg": 5000,
  "cement_quantity_bags": 200,
  "approval_status": "pending",   ← pending / approved / rejected
  "approved_by": null,
  "approval_date": null,
  "rejection_reason": null,
  "created_at": "2025-02-01T09:00:00Z"
}
```

### `master_data` collection
```json
{ "type": "area", "value": "Anna Nagar" }
{ "type": "area", "value": "T. Nagar" }
{ "type": "steel_brand", "value": "TATA Steel" }
{ "type": "cement_brand", "value": "Ultratech" }
```
- This powers all the dropdown menus in the app. Admin can add/remove options.

---

## 7. Authentication System

### How login works (step by step)

```
User types email + password → clicks Login
         ↓
Frontend sends POST /api/auth/login
         ↓
Backend finds user in DB by email
Backend hashes the typed password and compares to stored hash
If match → creates a JWT token
         ↓
Token sent back to frontend
Frontend stores token in localStorage
         ↓
Every future request includes: Authorization: Bearer <token>
         ↓
Backend decodes token → knows who is making the request
```

### What is a JWT Token?

A JWT (JSON Web Token) looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N...
```

It has 3 parts separated by dots. The middle part decodes to:
```json
{
  "sub": "67a1b2c3d4e5f6",    ← user's MongoDB ID
  "role": "salesperson",
  "exp": 1710000000            ← expiry timestamp
}
```

- The backend uses the `secret_key` to verify the token wasn't tampered with.
- No need to look up the database for every request — the user info is **inside** the token.
- After 24 hours, `exp` is in the past → token rejected → user must login again.

### Role-based access

```python
# In utils/security.py (concept)
def require_admin(current_user = Depends(get_current_active_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

- Any route that uses `Depends(require_admin)` automatically blocks non-admins.

---

## 8. The Approval Workflow

```
Salesperson marks lead as "Won"
         ↓
Creates a Sales Entry → status = PENDING
         ↓
Admin sees it in "Sales Approvals" page
         ↓
Admin clicks APPROVE or REJECT
         ↓
If APPROVED:
  - approval_status = "approved"
  - approved_by = admin's user ID
  - approval_date = now
  - This sale counts in performance reports

If REJECTED:
  - approval_status = "rejected"
  - rejection_reason = admin's explanation
  - Salesperson can see why it was rejected
```

This workflow exists because:
- Salespersons might over-report quantities
- Admin needs to verify against actual delivery records
- Creates an audit trail (who approved, when)

---

## 9. What to Learn to Understand This Project

### Essential (must know)

| Topic | Why needed | Learn from |
|---|---|---|
| **JavaScript** | All frontend code | javascript.info |
| **Python** | All backend code | python.org/tutorial |
| **HTML + CSS basics** | Frontend structure and styling | MDN Web Docs |
| **What is an API / REST** | How frontend talks to backend | Any REST API tutorial |
| **HTTP methods** | GET, POST, PUT, DELETE | MDN HTTP docs |
| **JSON** | Data format used everywhere | json.org |

### Frontend specific

| Topic | Used where |
|---|---|
| **React** (components, props, state, hooks) | Every frontend file |
| **React Router** | App.jsx routing, navigation |
| **React Hook Form** | All forms (LeadForm, etc.) |
| **React Query (TanStack)** | Data fetching, caching (useQuery, useMutation) |
| **Zustand** | authStore.js — global login state |
| **Axios** | services/api.js — HTTP requests |
| **TailwindCSS** | All className styling |

### Backend specific

| Topic | Used where |
|---|---|
| **FastAPI** | All routers, dependency injection |
| **Pydantic v2** | All schemas — data validation |
| **async / await in Python** | All service and router functions |
| **MongoDB basics** | All database queries |
| **MongoDB aggregation pipelines** | lead_service.py, followups.py |
| **JWT tokens** | auth_service.py, security.py |
| **bcrypt / password hashing** | auth_service.py |

### Recommended learning order

```
1. JavaScript basics (variables, functions, arrays, objects)
2. Python basics (same concepts, different syntax)
3. What is HTML + CSS (just enough to read it)
4. What is an API — watch a beginner REST API video
5. React — components, useState, useEffect
6. FastAPI — build a simple todo API
7. MongoDB — understand documents vs tables
8. Then read this project top to bottom — it will all make sense
```

---

*Document generated: March 2026*
*Project: Arcki Traders MIS v1.0.0*
