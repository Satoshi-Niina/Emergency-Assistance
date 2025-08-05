# Emergency Assistance System

AI-powered emergency assistance system with chat support, knowledge base management, and troubleshooting flows.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- PostgreSQL 12 or higher
- Git

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd Emergency-Assistance
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env with your configuration
   # Required variables:
   # - DATABASE_URL: PostgreSQL connection string
   # - SESSION_SECRET: Random secret for sessions
   # - OPENAI_API_KEY: Your OpenAI API key
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # (Optional) Seed initial data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start separately
   npm run dev:server  # Backend on port 3001
   npm run dev:client  # Frontend on port 5002
   ```

## 📁 Project Structure

```
Emergency-Assistance/
├── client/                 # React frontend (Vite)
├── server/                 # Express.js backend
├── shared/                 # Shared TypeScript types
├── knowledge-base/         # Knowledge base data
├── migrations/             # Database migrations
└── docs/                   # Documentation
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run lint` - Run linting
- `npm run test` - Run tests

### Database Management

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

## 🌐 Deployment

### Environment Variables

Required environment variables for production:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Session
SESSION_SECRET=your-secret-key

# API Keys
OPENAI_API_KEY=your-openai-key

# URLs
FRONTEND_URL=https://your-frontend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com

# Optional
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

### Deployment Options

1. **Separate Frontend/Backend Deployment**
   - Frontend: Vercel, Netlify, or static hosting
   - Backend: Railway, Heroku, or VPS
   - Database: Managed PostgreSQL (Supabase, Railway, etc.)

2. **Monolithic Deployment**
   - Single server with both frontend and backend
   - Use reverse proxy (nginx) to serve static files

## 🔒 Security

- All API keys should be stored as environment variables
- Database credentials should never be committed to version control
- Use HTTPS in production
- Implement proper CORS configuration

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details