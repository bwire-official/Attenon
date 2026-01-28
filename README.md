# Attenon - Biometric Attendance System

**Attenon** is a next-generation school attendance platform that uses advanced face verification technology to streamline classroom management. It eliminates proxy attendance and simplifies the tracking process for both students and instructors.

---

## 🏛️ System Architecture

Attenon follows a **"Three-Legged"** architecture designed for security, scalability, and performance:

1.  **📱 The Interface (Mobile App)**
    *   **Tech**: React Native (Expo)
    *   **Role**: Acts as the user terminal. It captures high-quality images, handles user sessions (Student/Instructor), and provides real-time feedback.
    *   **Key Source**: `apps/mobile`

2.  **🧠 The Brain (Supabase)**
    *   **Tech**: PostgreSQL + pgvector + Edge Functions
    *   **Role**: The single source of truth. It stores user profiles, class schedules, and attendance logs.
    *   **Key Feature**: It performs the actual **face matching** by comparing vector embeddings using the `pgvector` extension.

3.  **👁️ The Eye (AI API)**
    *   **Tech**: Python (FastAPI + InsightFace + OpenCV)
    *   **Role**: The dedicated AI processor. It receives raw images, detects faces, validates image quality (lighting/centering), and converts them into **512-dimensional vector embeddings**.
    *   **Key Source**: `apps/api`

---

## 🚀 Key Features

*   **Biometric Registration**: Students register their face once. The system generates a unique cryptographic face encoding (we do NOT store raw photos for matching).
*   **Touchless Attendance**: Instructors start a session, and students simply look at the device to get marked "Present".
*   **Dual Dashboards**:
    *   **Students**: View attendance history, upcoming classes, and profile status.
    *   **Instructors**: Manage classes, view live attendance sessions, and export reports.
*   **Web Portal**: A dedicated web interface (`apps/student-portal`) for students to manage their academic profile from a browser.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Monorepo** | TurboRepo | Efficient build system for handling multiple apps |
| **Mobile** | React Native / Expo | Cross-platform mobile application |
| **Web** | Vite / React | Fast, modern web portal for students |
| **Backend** | Python / FastAPI | High-performance API for AI processing |
| **AI/ML** | InsightFace / OpenCV | Industrial-grade face detection & recognition |
| **Database** | Supabase (Postgres) | Real-time database with Vector support |
| **Auth** | Supabase Auth | Secure JWT-based authentication |

---

## 📂 Project Structure

```bash
Attenon/
├── android/                 # Native Android configuration & signing keys
├── apps/
│   ├── api/                 # Python FastAPI Backend (The "Eye")
│   ├── mobile/              # React Native Expo App (The "Interface")
│   └── student-portal/      # React Web App (Student Dashboard)
├── packages/                # Shared internal packages
└── docs/                    # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites

*   **Node.js** 18+
*   **Python** 3.9+
*   **Supabase** project with `pgvector` enabled.

### 1. Setup the Backend (AI API)

The API is responsible for face encoding.

```bash
cd apps/api
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

### 2. Run the Mobile App

```bash
cd apps/mobile
npm install

# Run on Android Emulator or Physical Device
npx expo start
```

### 3. Run the Student Web Portal

```bash
cd apps/student-portal
npm install
npm run dev
```

---

## 🔒 Security & Privacy

*   **Vector Storage**: We do not store user photos for identification. We store mathematical representations (vectors) of faces.
*   **Liveness Detection**: The API includes checks for face centering, eye status, and lighting conditions to ensure high-quality, genuine captures.
*   **Secure Auth**: All requests are authenticated using Supabase JWT tokens. User data is protected via Role-Level Security (RLS) policies.

---

## 🤝 Contribution

This project is a monorepo managed by **TurboRepo**.
To build all apps:

```bash
npx turbo build
```
