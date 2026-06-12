# Teacher Portal — Frontend

Teacher self-service portal for the Gandaki Pradesh Education Office teacher management system. Built with Next.js 14.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **TypeScript**
- **JWT** authentication (djangorestframework-simplejwt)

## Project Structure
src/app/
├── login/              # Login page
├── register/           # 4-step teacher registration wizard
└── (portal)/           # Protected pages (requires login)
├── layout.tsx      # Shared navbar + sidebar
├── dashboard/      # Teacher dashboard
├── profile/        # View + edit profile, change password
└── documents/      # Upload and view documents

## Getting Started

### 1. Clone the repo and switch to the frontend branch

```bash
git clone https://github.com/Pratik-upadhyaya/teacher-management.git
cd teacher-management
git checkout frontend/teacher-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment

Create a `.env.local` file in the root:
NEXT_PUBLIC_API_URL=http://localhost:8000

Change the URL to wherever the Django backend is running.

### 4. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` — redirects to `/login`.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Login with email + password |
| `/register` | 4-step teacher registration wizard |
| `/dashboard` | Overview — teacher info + stats |
| `/profile` | Edit profile + change password |
| `/documents` | Upload and manage documents |

## Expected API Endpoints

These are the Django endpoints this frontend expects:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token/` | Login — returns `access`, `refresh`, `role` |
| POST | `/api/token/refresh/` | Refresh access token |
| POST | `/api/register/` | Teacher registration |
| GET | `/api/teachers/me/` | Logged-in teacher profile |
| PATCH | `/api/teachers/me/` | Update profile |
| POST | `/api/change-password/` | Change password |
| GET | `/api/documents/` | List teacher's documents |
| POST | `/api/documents/` | Upload a document |
| DELETE | `/api/documents/:id/` | Delete a document |

## Expected API Response Shape

### `/api/teachers/me/`
```json
{
  "name": "placeholder="राम श्रेष्ठ"",
  "email": "ram@school.edu.np",
  "phone": "98XXXXXXXX",
  "position": "Science Teacher",
  "subject": "Science",
  "classes": "8, 9, 10",
  "tsc_no": "TSC-2080-04521",
  "join_date": "2080/03/15",
  "member_since": "2080 BS",
  "address": "Pokhara-10, Kaski",
  "status": "ACTIVE",
  "document_count": 4,
  "school": {
    "name": "Shree Bal Kalyan Ma. Vi.",
    "district": "Kaski",
    "province": "Gandaki"
  }
}
```

### `/api/documents/`
```json
[
  {
    "id": 1,
    "type": "CITIZENSHIP",
    "label": "Citizenship Certificate",
    "file_url": "/media/documents/citizenship.jpg",
    "uploaded_at": "2024-01-15"
  }
]
```

## Auth Flow

1. POST `/api/token/` with email + password
2. Store `access` and `refresh` in localStorage
3. Send `Authorization: Bearer <access>` on every request
4. On 401, call `/api/token/refresh/` to get a new access token
5. If refresh fails → redirect to `/login`

## Notes for Backend Team

- `/api/token/` response must include `role` field (`"admin"` or `"teacher"`) so the frontend can redirect correctly after login
- Document `file_url` should be a path that can be appended to `NEXT_PUBLIC_API_URL` to view the file
- CORS must allow `http://localhost:3000` during development
Then push it:
bashgit add README.md
git commit -m "update README with project info and API docs"
git push
#Aayam ghimire
#Alina subedi
#pratik dhakal