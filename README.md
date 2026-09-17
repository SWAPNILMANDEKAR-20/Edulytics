# 🎓 Edulytics – AI Powered Answer Sheet Evaluation System

An AI-powered cloud-based web application that automates answer sheet evaluation using OCR, NLP, and Large Language Models. Edulytics enables professors to upload reference answer keys, students to submit answer sheets, and automatically generates evaluation reports with analytics.

---

## 🚀 Features

### 👨‍🏫 Professor Module

- Secure Authentication
- Subject & Exam Management
- Upload Reference Answer Sheets
- OCR-based Question Extraction
- AI-assisted Answer Key Generation
- Rubrics Management
- Student Performance Analytics
- Publish Results

### 👨‍🎓 Student Module

- Secure Login
- Subject Enrollment
- Upload Answer Sheets
- Upload OMR Sheets
- Track Submission Status
- AI Feedback Report
- View Results

### 🤖 AI Evaluation Engine

- OCR for handwritten/printed answer sheets
- Gemini AI based answer extraction
- Semantic similarity using SBERT
- Automated Marks Calculation
- Confidence Score Generation
- Detailed Evaluation Report

### 📊 Analytics

- Class Performance
- Average Marks
- Pass Percentage
- Subject-wise Analysis
- AI Generated Insights

---
Professor Answer-Key Workflow
<img width="2738" height="2290" alt="mermaid-diagram (1)" src="https://github.com/user-attachments/assets/55d1269e-7629-43f5-8d30-f9be0ffcfbe0" />

Student Answer Evaluation Workflow
<img width="3960" height="2274" alt="mermaid-diagram" src="https://github.com/user-attachments/assets/e9ba7ec3-7ac1-4731-b56c-08b7cf643865" />


# 🏗️ System Architecture

```
                   React Frontend
                         │
                REST API (HTTPS)
                         │
               Node.js + Express Backend
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
  Supabase          Gemini API        File Storage
 PostgreSQL       AI Evaluation      Answer Sheets
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
               Evaluation Reports
```

---

# 🛠️ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- Lucide Icons

## Backend

- Node.js
- Express.js
- Multer
- JWT Authentication
- bcrypt
- PDFKit

## Database

- Supabase
- PostgreSQL

## AI & ML

- Google Gemini API
- SBERT
- OCR
- NLP
- Semantic Similarity

## Cloud

- Render (Backend Deployment)
- Vercel (Frontend Deployment)
- Supabase Cloud Database
- Supabase Storage

---

# ⚙️ Workflow

1. Professor creates an exam.
2. Uploads the reference answer sheet.
3. OCR extracts questions.
4. Gemini AI generates structured answer keys.
5. Professor reviews and confirms the answer key.
6. Students upload answer sheets.
7. OCR extracts student responses.
8. SBERT compares answers with reference answers.
9. Marks are calculated automatically.
10. Reports are generated.
11. Analytics dashboard updates.



---

# 📂 Project Structure

```
Edulytics/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── uploads/
│   ├── data/
│   ├── utils/
│   └── server.js
│
└── README.md
```

---

# ☁️ Cloud Computing Integration

Edulytics is designed as a cloud-native application.

### Platform as a Service (PaaS)

- Render hosts the backend APIs.

### Database as a Service (DBaaS)

- Supabase PostgreSQL stores users, exams, submissions, and results.

### Storage as a Service

- Supabase Storage stores uploaded answer sheets.

### AI as a Service

- Google Gemini API performs AI-based evaluation.

### Software as a Service (SaaS)

- Professors and students access the application through a web browser.

---

# 🔒 Security

- JWT Authentication
- Password Hashing using bcrypt
- HTTPS Communication
- Environment Variables
- Role-Based Access Control
- Secure Cloud Database

---

# 📈 Future Improvements

- Real-time Evaluation
- Multi-language Support
- Plagiarism Detection
- Voice Feedback
- AI-based Rubric Generation
- Mobile Application
- Kubernetes Deployment
- Docker Support


# 📦 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/Edulytics.git
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
npm install
npm start
```

---

# 🔑 Environment Variables

Create a `.env` file

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
GEMINI_API_KEY=
PORT=5000
```

---

# 📊 Key Features

✅ AI Powered Evaluation

✅ OCR Answer Extraction

✅ Semantic Similarity (SBERT)

✅ Cloud Deployment

✅ Professor Dashboard

✅ Student Dashboard

✅ OMR Evaluation

✅ Analytics Dashboard

✅ Automated Result Generation

---

# 👨‍💻 Developed By

**Swapnil Avinash Mandekar**

B.Tech Computer Science (AI & ML)

---

# 📄 License

This project is licensed under the MIT License.
