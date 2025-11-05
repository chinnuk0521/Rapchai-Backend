# Rapchai Café - Backend API

Fastify-based REST API for Rapchai Café restaurant management system with PostgreSQL database and Prisma ORM.

## 🚀 Features

- **RESTful API** - Fastify framework with TypeScript
- **PostgreSQL Database** - Prisma ORM for database management
- **JWT Authentication** - Secure token-based authentication for admin
- **Comprehensive Routes** - Menu, Orders, Events, Bookings, Admin operations
- **Image Storage** - Integration with Supabase Storage
- **Swagger Documentation** - Auto-generated API docs at `/docs`
- **Error Handling** - Centralized error handling middleware
- **Input Validation** - Zod schema validation

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database or Supabase
- npm or yarn
- Supabase account (optional, for image storage)

## 🛠️ Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd rapchai/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp env.example .env
```

4. **Configure `.env` file:**
```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
DATABASE_URL="postgresql://username:password@localhost:5432/rapchai_db?schema=public"
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

5. **Set up the database:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

6. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`
API documentation at `http://localhost:3001/docs`

## 🗄️ Database Schema

### Main Models

- **User** - Admin and customer accounts
- **Category** - Menu categories
- **MenuItem** - Individual menu items with pricing
- **Order** - Customer orders
- **OrderItem** - Items within orders
- **Event** - Restaurant events
- **Booking** - Event reservations
- **Media** - Image/media storage references

### Database Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Deploy migrations (production)
npm run prisma:migrate:deploy
```

## 📡 API Endpoints

### Public Endpoints

#### Menu
- `GET /api/menu/categories` - Get all categories
- `GET /api/menu/categories/:id` - Get category by ID
- `GET /api/menu/items` - Get all menu items
- `GET /api/menu/items/:id` - Get menu item by ID

#### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/customer/:phone` - Get orders by customer phone

#### Events
- `GET /api/events` - Get all active events
- `GET /api/events/:id` - Get event by ID

### Protected Endpoints (Admin)

#### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `POST /api/auth/refresh` - Refresh access token

#### Admin Dashboard
- `GET /api/admin/dashboard` - Get dashboard analytics
- `GET /api/admin/events` - Get all events (admin)
- `GET /api/admin/events/:id` - Get event by ID (admin)
- `POST /api/admin/events` - Create event
- `PUT /api/admin/events/:id` - Update event
- `DELETE /api/admin/events/:id` - Delete event

#### Menu Management
- `POST /api/menu/categories` - Create category
- `PUT /api/menu/categories/:id` - Update category
- `DELETE /api/menu/categories/:id` - Delete category
- `POST /api/menu/items` - Create menu item
- `PUT /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item

#### Order Management
- `GET /api/orders` - Get all orders (admin)
- `PATCH /api/orders/:id/status` - Update order status
- `PATCH /api/orders/:id/payment` - Update payment status

#### Bookings
- `GET /api/admin/bookings` - Get all bookings
- `POST /api/admin/bookings` - Create booking

## 🔐 Authentication System

### Overview
The Rapchai application implements a robust token-based authentication system with proper role-based access control.

### Admin Authentication Flow

1. **Admin Login Process**
   - Admin clicks "Admin Login" → Frontend calls `/api/auth/login`
   - Backend validates credentials → Returns JWT access token + refresh token
   - Frontend stores tokens → Admin APIs become accessible
   - All admin routes require valid JWT token → Token verified on each request

2. **Admin Logout Process**
   - Admin clicks "Logout" → Frontend calls `/api/auth/logout`
   - Backend invalidates all user tokens → Tokens marked as revoked in database
   - Frontend clears stored tokens → Admin APIs immediately become inaccessible

### Token Management
- **Access Tokens**: Short-lived (15 minutes), used for API requests
- **Refresh Tokens**: Long-lived (7 days), used to get new access tokens
- **Token Revocation**: Tokens marked as revoked in database on logout
- **Token Validation**: Every admin request validates token + checks revocation status

### Usage Examples

#### Login
```javascript
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'password' })
});
const { accessToken, refreshToken } = await loginResponse.json();
```

#### Authenticated Request
```javascript
const eventsResponse = await fetch('/api/admin/events', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Logout
```javascript
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Security Features
1. **Token-Based Authentication**: JWT tokens with proper expiration
2. **Role-Based Access Control**: Admin vs Customer role separation
3. **Token Revocation**: Immediate invalidation on logout
4. **User Status Checking**: Inactive users cannot authenticate
5. **Secure Token Storage**: Tokens stored in database with revocation tracking

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create new project: `rapchai-restaurant`
   - Save database password

2. **Get Connection String**
   - Go to **Settings** → **Database**
   - Copy connection string (format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)

3. **Update `.env`:**
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

4. **Run Migrations:**
```bash
npm run prisma:migrate
```

5. **Seed Database:**
```bash
npm run prisma:seed
```

### Option 2: Local PostgreSQL

1. **Install PostgreSQL**
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS**: `brew install postgresql && brew services start postgresql`
   - **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`

2. **Create Database**
```sql
psql -U postgres
CREATE DATABASE rapchai_db;
CREATE USER rapchai_user WITH PASSWORD 'rapchai_password';
GRANT ALL PRIVILEGES ON DATABASE rapchai_db TO rapchai_user;
\q
```

3. **Update `.env`:**
```env
DATABASE_URL="postgresql://rapchai_user:rapchai_password@localhost:5432/rapchai_db?schema=public"
```

4. **Run Migrations:**
```bash
npm run prisma:migrate
npm run prisma:seed
```

### Database Schema
The database includes:
- **Users** - Admin and customer accounts
- **Categories** - Menu categories (Chai/Coffee, Burgers, etc.)
- **MenuItems** - All menu items with prices, descriptions, images
- **Orders** - Customer orders with items and status
- **Events** - Rapchai events and workshops
- **Bookings** - Event bookings and reservations

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.ts              # Fastify app configuration
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   ├── middleware/         # Custom middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/             # API routes
│   │   ├── admin.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── events.routes.ts
│   │   ├── menu.routes.ts
│   │   └── order.routes.ts
│   ├── services/            # Business logic
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── menu.service.ts
│   │   └── order.service.ts
│   ├── schemas/            # Zod validation schemas
│   └── utils/              # Utility functions
│       ├── jwt.ts
│       └── hash.ts
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Seed script
└── tests/                  # Test files
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | ❌ | `development` |
| `PORT` | Server port | ❌ | `3001` |
| `HOST` | Server host | ❌ | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `REDIS_URL` | Redis connection string | ❌ | - |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✅ | - |
| `JWT_REFRESH_SECRET` | JWT refresh secret (min 32 chars) | ✅ | - |
| `SUPABASE_URL` | Supabase project URL | ❌ | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ❌ | - |

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set all required environment variables
2. Run database migrations: `npm run prisma:migrate:deploy`
3. Seed database if needed: `npm run prisma:seed`

### Docker Deployment
```bash
docker-compose -f docker/docker-compose.local.yml up -d
```

### Vercel Deployment (CI/CD)

This project includes automated CI/CD pipeline for zero-error deployments to Vercel.

#### Automatic Deployment

The pipeline automatically deploys when:
- **Production**: Push to `main` branch
- **Preview**: Push to any other branch (e.g., `develop`, `staging`)
- **Manual**: Trigger via GitHub Actions UI

#### Pipeline Steps (Automatic)

1. ✅ **Pre-Deployment Checks**
   - TypeScript type checking
   - ESLint code quality checks
   - Prettier formatting validation
   - Unit tests execution

2. ✅ **Build Verification**
   - Prisma client generation
   - TypeScript compilation (`tsc`)
   - Build output verification (`dist/` folder)
   - Vercel configuration validation

3. ✅ **Deployment**
   - Production deployment (main branch)
   - Preview deployment (other branches)
   - Health check after deployment

#### Setup Instructions

1. **Add Vercel Secrets to GitHub**:
   Go to: `Settings → Secrets and variables → Actions` and add:
   - `VERCEL_TOKEN` - Get from [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` - Found in Vercel project dashboard → Settings → General
   - `VERCEL_PROJECT_ID` - Found in Vercel project dashboard → Settings → General
   - `VERCEL_PROJECT_DOMAIN` (optional) - Your Vercel project domain

2. **Configure Environment Variables in Vercel**:
   Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   Add all required variables from `env.example`

3. **Deploy**:
   ```bash
   # Automatic deployment (on push to main)
   git push origin main
   
   # Manual deployment via GitHub Actions
   # Go to: Actions → Deploy Backend to Vercel → Run workflow
   ```

#### Manual Deployment Trigger

To manually trigger deployment:

1. Go to **GitHub Repository → Actions tab**
2. Select **"Deploy Backend to Vercel"** workflow
3. Click **"Run workflow"**
4. Choose:
   - **Environment**: `production` or `preview`
   - **Skip tests**: Only if absolutely necessary
5. Click **"Run workflow"**

#### Deployment Flow

```
Push to main branch
    ↓
Pre-deployment checks (lint, type-check, tests)
    ↓
Build verification (tsc, prisma generate)
    ↓
Deploy to Vercel Production
    ↓
Health check
    ↓
✅ Deployment complete
```

#### Troubleshooting

- **Build fails**: Check GitHub Actions logs for specific error
- **Tests fail**: Ensure all tests pass locally before pushing
- **Missing secrets**: Verify all Vercel secrets are added in GitHub Settings
- **Environment variables**: Ensure all required vars are set in Vercel dashboard

#### Monitoring Deployments

- View deployment status: GitHub Actions → Deploy Backend to Vercel
- View deployment logs: Vercel Dashboard → Deployments
- Check health endpoint: `https://your-domain.vercel.app/api/health`

## 📊 API Documentation

Swagger documentation is available at:
- Development: `http://localhost:3001/docs`
- Interactive API testing interface

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## 🔗 Related Documentation

- **Frontend Application**: See root `README.md`
- **Database Schema**: See `prisma/schema.prisma`
- **Database Setup SQL**: See root `database-setup.sql`
- **API Routes**: See `src/routes/`

## 📄 License

MIT
