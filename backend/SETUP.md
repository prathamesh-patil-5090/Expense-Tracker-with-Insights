# Setup & Deployment Guide

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher (or yarn)
- Git (for version control)

## Local Development Setup

### 1. Clone Repository
```bash
cd Expense-Tracker-with-Insights
git init
git add .
git commit -m "Initial commit"
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

This will install:
- Express.js (web framework)
- Prisma (ORM)
- TypeScript (type safety)
- Development tools (tsx, ts-node)

### 3. Configure Environment
```bash
# .env.local already exists with default SQLite settings
# Review and adjust if needed
cat .env.local
```

**Default Configuration:**
```
DATABASE_URL="file:./dev.db"
PORT=5000
NODE_ENV="development"
```

For PostgreSQL (optional):
```
DATABASE_URL="postgresql://user:password@localhost:5432/expense_tracker"
```

### 4. Initialize Database

**Generate Prisma Client:**
```bash
npm run prisma:generate
```

**Create Database Schema:**
```bash
npm run prisma:migrate
```

This command will:
- Create migration files in `prisma/migrations/`
- Apply migrations to the database
- Generate Prisma Client

### 5. Seed Sample Data (Optional)
```bash
npm run prisma:seed
```

Creates sample data:
- 2 test users
- 5-7 categories per user
- 9 sample expenses

### 6. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
🚀 Server is running at http://localhost:5000
📊 API Documentation available at http://localhost:5000/api
```

### 7. Test the API
```bash
# Health check
curl http://localhost:5000/health

# Get all users
curl http://localhost:5000/api/users

# Get Prisma Studio (visual database manager)
npm run prisma:studio
# Opens http://localhost:5555
```

---

## Database Management

### View Database with Prisma Studio
```bash
npm run prisma:studio
```
- Opens browser at `http://localhost:5555`
- View, create, and edit database records visually
- No SQL knowledge required

### Check Migration Status
```bash
npx prisma migrate status
```

Shows:
- Applied migrations
- Pending migrations
- Schema drift status

### Reset Database (Caution ⚠️)
```bash
npx prisma migrate reset
```

This will:
- Drop and recreate database
- Reapply all migrations
- Reseed data (if seed script exists)

### View Database File
```bash
# SQLite database file location
ls -la prisma/dev.db
```

---

## Production Deployment

### 1. Build Application
```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` folder

### 2. Install Production Dependencies
```bash
npm ci --only=production
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Configure Production Database
```bash
# Use PostgreSQL or other production database
export DATABASE_URL="postgresql://user:password@host:5432/expense_tracker"
```

### 5. Run Migrations on Production
```bash
npx prisma migrate deploy
```

⚠️ **Important:** Always test migrations on staging first!

### 6. Start Production Server
```bash
npm start
# or with process manager
pm2 start dist/index.js --name "expense-tracker"
```

### 7. Monitor the Server
```bash
# Check health
curl https://your-domain.com/health

# View logs
pm2 logs expense-tracker
```

---

## Environment-Specific Configurations

### Development
```env
DATABASE_URL="file:./dev.db"
PORT=5000
NODE_ENV="development"
```

### Staging
```env
DATABASE_URL="postgresql://user:pass@staging-db:5432/expense_tracker"
PORT=5000
NODE_ENV="staging"
```

### Production
```env
DATABASE_URL="postgresql://user:pass@prod-db:5432/expense_tracker"
PORT=5000
NODE_ENV="production"
```

---

## Docker Deployment (Optional)

### Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY dist ./dist

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
```

### Create docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: expense_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/expense_tracker
      NODE_ENV: production
    depends_on:
      - db

volumes:
  db_data:
```

### Build and Run
```bash
docker-compose build
docker-compose up
```

---

## Troubleshooting

### Issue: "Cannot find module '@prisma/client'"
**Solution:**
```bash
npm run prisma:generate
```

### Issue: "Database file not found"
**Solution:**
```bash
npm run prisma:migrate
# This creates the database file
```

### Issue: "Port 5000 already in use"
**Solution:**
```bash
# Change PORT in .env.local
export PORT=5001
npm run dev

# Or kill the process using port 5000
lsof -i :5000
kill -9 <PID>
```

### Issue: "Migration failed"
**Solution:**
```bash
# Check migration status
npx prisma migrate status

# Reset if stuck
npx prisma migrate reset --force
```

### Issue: "Type errors in TypeScript"
**Solution:**
```bash
# Regenerate types
npm run prisma:generate

# Check compilation
npx tsc --noEmit
```

---

## Performance Tips

### 1. Enable Indexes
Indexes are already configured in schema for:
- User email lookups
- Category queries by user
- Expense queries by date/user/category

### 2. Connection Pooling
For PostgreSQL, configure in connection string:
```
postgresql://user:password@host:5432/db?schema=public&connection_limit=10
```

### 3. Query Optimization
- The API automatically includes related data
- Categories endpoint returns aggregate statistics
- Expenses endpoint supports filtering and sorting

### 4. Caching (Future Enhancement)
Consider implementing Redis for:
- User statistics
- Category summaries
- Frequently accessed expense lists

---

## Monitoring & Logging

### Basic Logging
All requests are logged to console:
```
[2024-01-15T10:30:00.000Z] POST /api/expenses
[2024-01-15T10:30:01.000Z] GET /api/expenses/stats/user123
```

### Implement Advanced Logging (Future)
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## Backup & Recovery

### SQLite Backup
```bash
# Backup database
cp prisma/dev.db prisma/dev.db.backup

# Restore from backup
cp prisma/dev.db.backup prisma/dev.db
```

### PostgreSQL Backup
```bash
# Backup
pg_dump expense_tracker > backup.sql

# Restore
psql expense_tracker < backup.sql
```

---

## Testing

### Manual API Testing
```bash
# Create test user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Get test user ID from response, then create category
curl -X POST "http://localhost:5000/api/categories?userId={userId}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","color":"#3B82F6"}'
```

### Automated Testing (Future)
```bash
npm install --save-dev jest supertest
npm test
```

---

## Continuous Deployment (CD)

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - run: cd backend && npm run prisma:generate
      - name: Deploy to server
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts
          scp -i ~/.ssh/deploy_key -r dist/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/app/
          ssh -i ~/.ssh/deploy_key ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} 'cd /app && npm ci && npm start'
```

---

## Scaling Considerations

### 1. Database
- Start with SQLite (dev)
- Move to PostgreSQL for production
- Use connection pooling for multiple instances
- Consider read replicas for high-traffic reads

### 2. Caching
- Implement Redis for session/user data
- Cache category summaries
- Cache expense statistics

### 3. Load Balancing
- Use nginx as reverse proxy
- Run multiple Node instances
- Use PM2 cluster mode

### 4. CDN
- Serve static assets from CDN
- Cache API responses (with appropriate headers)

---

## Security Checklist

- [ ] Environment variables properly configured
- [ ] HTTPS enabled in production
- [ ] CORS restricted to allowed origins
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma handles this)
- [ ] Rate limiting implemented
- [ ] Authentication/Authorization added
- [ ] Database backups automated
- [ ] Logs monitored for errors
- [ ] Dependencies kept updated

---

## Next Steps

1. **Frontend Development:** Create React/Vue frontend
2. **Authentication:** Implement JWT auth
3. **Additional Features:**
   - Budget tracking
   - Recurring expenses
   - Email notifications
   - Data export (CSV/PDF)
4. **Testing:** Add unit and integration tests
5. **Monitoring:** Set up error tracking (Sentry)
6. **Analytics:** Implement user behavior tracking

---

## Support & Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Last Updated: 2024-01-15
