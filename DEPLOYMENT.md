# Production Deployment Guide

This guide outlines how to deploy the Teacher Management Portal (Next.js Frontend + Django Backend) to production.

---

## 1. Environment Configuration

### Frontend (`.env.local` or environment variables)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Backend (`backend/.env`)
```env
DJANGO_SECRET_KEY=generate-a-strong-random-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.yourdomain.com
DJANGO_CORS_ALLOWED_ORIGINS=https://portal.yourdomain.com

# Database (PostgreSQL)
DB_ENGINE=postgresql
DB_NAME=teacher_portal_db
DB_USER=teacher_portal_user
DB_PASSWORD=your_secure_password
DB_HOST=127.0.0.1
DB_PORT=5432

# Production Email (SMTP)
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your_smtp_api_key
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL="EDCU Kaski <noreply@yourdomain.com>"
```

---

## 2. Backend Setup (Django + PostgreSQL + Gunicorn)

1. **Install dependencies in virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   pip install psycopg2-binary gunicorn
   ```

2. **Run Migrations & Collect Static Files:**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

3. **Run WSGI Server (Gunicorn):**
   ```bash
   gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 4
   ```

---

## 3. Frontend Setup (Next.js)

1. **Install & Build:**
   ```bash
   npm install
   npm run build
   ```

2. **Run Production Server:**
   ```bash
   npm run start -p 3000
   ```

---

## 4. Reverse Proxy Setup (Nginx)

Example Nginx configuration proxying traffic to both Next.js and Django:

```nginx
server {
    listen 80;
    server_name portal.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded media documents pass through Django auth checks (serve_document view)
    location /media/ {
        proxy_pass http://127.0.0.1:8000/media/;
        proxy_set_header Host $host;
    }
}
```
