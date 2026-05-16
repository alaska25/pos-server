# ⚓ Shipyard POS System

A full-featured **Point of Sale system for shipyard companies** built with the MERN stack — MongoDB, Express.js, React, and Node.js.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

---

## Features

- 🔐 **JWT Authentication** — Role-based access control (Admin, Supervisor, Cashier)
- ⚙️ **Work Orders** — Create and manage service jobs with multi-line billing
- 🔧 **Service Catalog** — Categorized services with unit pricing, tax rates & discounts
- 🚢 **Customer Management** — Vessel info, contact details, full job/invoice history
- 📄 **Invoice Generation** — Auto-generated from completed work orders with sequential numbering
- 💴 **Payment Recording** — Cash, bank transfer, check, credit card with balance tracking
- 📊 **Reports & Dashboard** — Monthly revenue charts, top customers, overdue invoice alerts
- 👥 **User Management** — Admin-only user CRUD with role assignment
- 🐳 **Docker Ready** — Full `docker-compose` setup for one-command deployment

---

## Screenshots

> Dashboard · Work Order POS · Invoice Detail · Reports

*(Add screenshots here after first deployment)*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, TanStack Query, Recharts |
| Backend | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB 7 |
| Auth | JSON Web Tokens (JWT) + bcryptjs |
| Deployment | Docker + Nginx |

---

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) — local install or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- npm 9+

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/shipyard-pos.git
cd shipyard-pos
```

### 2. Install Dependencies

```bash
npm install           # installs root dev tools (concurrently)
npm run install:all   # installs backend + frontend dependencies
```

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and update the values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/shipyard_pos
JWT_SECRET=your_strong_secret_here
JWT_EXPIRE=30d
NODE_ENV=development
```

> **MongoDB Atlas:** Replace `MONGO_URI` with your Atlas connection string:
> `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/shipyard_pos`

### 4. Seed the Database

```bash
npm run seed
```

This creates:
- ✅ Admin user account
- ✅ 8 sample shipyard services (Hull Cleaning, Engine Overhaul, Welding, etc.)
- ✅ 3 sample customers

### 5. Start Development Servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |

---

## Default Login

```
Email:    admin@shipyard.com
Password: admin123
```

> ⚠️ **Change these credentials immediately in any non-local environment.**

---

## Docker Deployment

Build and run the full stack with a single command:

```bash
docker-compose up --build -d
```

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:5000 |

Seed inside Docker:

```bash
docker exec shipyard_backend node config/seed.js
```

Stop all services:

```bash
docker-compose down
```

---

## Project Structure

```
shipyard-pos/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── seed.js                # Database seeder
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   ├── serviceController.js
│   │   ├── jobController.js
│   │   ├── invoiceController.js
│   │   ├── paymentController.js
│   │   ├── reportController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js                # JWT protect + role authorize
│   ├── models/
│   │   ├── User.js
│   │   ├── Customer.js
│   │   ├── Service.js
│   │   ├── Job.js                 # Work order with line items
│   │   ├── Invoice.js
│   │   └── Payment.js
│   ├── routes/                    # Express route files
│   ├── .env                       # Your local env (git-ignored)
│   ├── .env.example               # Template — commit this
│   ├── Dockerfile
│   └── server.js                  # App entry point
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/            # Sidebar + main layout
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx      # KPI cards + revenue chart
│   │   │   ├── Jobs.jsx           # Work order list
│   │   │   ├── NewJob.jsx         # POS interface
│   │   │   ├── JobDetail.jsx      # Job status + invoice trigger
│   │   │   ├── Invoices.jsx
│   │   │   ├── InvoiceDetail.jsx  # Payment recording
│   │   │   ├── Customers.jsx
│   │   │   ├── CustomerDetail.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Users.jsx
│   │   ├── utils/
│   │   │   ├── api.js             # Axios instance + interceptors
│   │   │   └── format.js          # Currency (JPY), date helpers
│   │   ├── App.jsx                # Routes + providers
│   │   └── index.css              # Global dark theme styles
│   ├── Dockerfile
│   └── nginx.conf                 # SPA routing + API proxy
│
├── docker-compose.yml
├── package.json                   # Root scripts (concurrently)
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Auth | Get current user |
| PUT | `/api/auth/password` | Auth | Change password |

### Customers
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/customers` | Auth | List (search, paginate) |
| POST | `/api/customers` | Auth | Create customer |
| GET | `/api/customers/:id` | Auth | Get customer |
| PUT | `/api/customers/:id` | Auth | Update customer |
| DELETE | `/api/customers/:id` | Auth | Soft-delete |

### Jobs (Work Orders)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/jobs` | Auth | List (filter by status) |
| POST | `/api/jobs` | Auth | Create work order |
| GET | `/api/jobs/:id` | Auth | Get with line items |
| PUT | `/api/jobs/:id` | Auth | Update / advance status |
| DELETE | `/api/jobs/:id` | Auth | Cancel job |

### Invoices & Payments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/invoices` | Auth | List invoices |
| POST | `/api/invoices` | Auth | Generate from job |
| GET | `/api/invoices/:id` | Auth | Invoice + payment history |
| PUT | `/api/invoices/:id` | Auth | Update status |
| GET | `/api/payments` | Auth | List payments |
| POST | `/api/payments` | Auth | Record payment |

### Services & Reports
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/services` | Auth | Service catalog |
| POST | `/api/services` | Supervisor+ | Create service |
| PUT | `/api/services/:id` | Supervisor+ | Update service |
| GET | `/api/reports/dashboard` | Auth | KPIs + top customers |
| GET | `/api/reports/revenue?year=2025` | Auth | Monthly revenue |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Deactivate user |

---

## Roles & Permissions

| Feature | Cashier | Supervisor | Admin |
|---------|:-------:|:----------:|:-----:|
| View all data | ✅ | ✅ | ✅ |
| Create work orders & invoices | ✅ | ✅ | ✅ |
| Record payments | ✅ | ✅ | ✅ |
| Manage service catalog | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWTs |
| `JWT_EXPIRE` | ❌ | `30d` | Token expiry duration |
| `PORT` | ❌ | `5000` | Backend server port |
| `NODE_ENV` | ❌ | `development` | Environment mode |

---

## .gitignore Recommendations

Make sure your `.gitignore` includes:

```gitignore
# Dependencies
node_modules/
backend/node_modules/
frontend/node_modules/

# Environment — never commit secrets
backend/.env

# React build output
frontend/build/

# Logs
*.log
npm-debug.log*
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

Built for shipyard operations management. Handles vessel service billing, labor tracking, and payment collection in a single integrated system.