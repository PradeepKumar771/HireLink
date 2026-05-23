# HireLink: The College-Isolated Training & Placement (TNP) Portal

An enterprise-grade, high-isolation full-stack microservices portal for college placements. It features a robust multi-service monorepo architecture, logical data isolation boundaries, an automated skill-matching pipeline, a dynamic student career milestones roadmap, and built-in testing presets.

---

## 🛠️ Microservices Architecture & Ports

The monorepo contains four primary services communicating over the internal cluster loop:

1. **`api-gateway` (Port `5000`)**: Node.js/Express. Implements Helmet headers protection, rate limiting, and JWT decoding to automatically inject credentials context (`X-User-Id`, `X-User-College-Id`) to internal services.
2. **`auth-service` (Port `5001`)**: Node.js/Express/Prisma. Manages authentication, password encryption via bcrypt, role validation, and seeds default sandbox accounts.
3. **`tnp-core-service` (Port `5002`)**: Node.js/Express/Prisma. Manages Job openings, student applications, and multi-tenant isolation rules. Triggers matching engine on database write.
4. **`matching-service` (Port `5003`)**: Node.js/Express. Manages MongoDB/JSON student profiles, skill similarities weighting, and coordinates background auto-email notifications.
5. **`frontend` (Port `5173`)**: React / Vite / TypeScript. Custom glassmorphic dark theme dashboard supporting dynamic roadmaps, email simulator feeds, recruiter controls, and campus analytical metrics.

---

## 🚀 Instant Local Setup (Zero-Install Database)

Since your system currently has Node.js/npm installed but does not have Java/Spring Boot or Docker in the PATH, the entire application has been built in Node.js/TypeScript to run smoothly on your local system out-of-the-box.

### Step 1: Install Dependencies
Run the following at the root workspace directory to install all monorepo dependencies:
```bash
npm install
```

### Step 2: Start All Microservices Simultaneously
Launch the entire microservices network (Gateway, Auth, Core, Matching, Frontend) with a single command:
```bash
# In Windows PowerShell/CMD
npm run dev
```

The system will start running immediately:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **API Gateway**: [http://localhost:5000](http://localhost:5000)

---

## 🧪 Quick Sandbox Credentials Fill (One-Click Testing)

To make evaluation simple and efficient, the Login dashboard features **clickable sandbox quick-preset buttons** to instantly authenticate as one of the following simulated profiles:

| Account Profile | Sandbox Email | Sandbox Password | Role Scope | Tenant College |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Johnson** | `alice@mit.edu` | `student123` | `STUDENT` | `MIT` |
| **Bob Miller** | `bob@stanford.edu` | `student123` | `STUDENT` | `STANFORD` |
| **Prof. Charles** | `officer@mit.edu` | `officer123` | `COLLEGE_TNP_OFFICER` | `MIT` |
| **Sarah Williams** | `recruiter@google.com` | `recruiter123` | `RECRUITER` | `MIT` ( Google Pilot ) |

---

## ⚡ How to Verify the Automated Pipeline

1. Open your browser to the local frontend dashboard at [http://localhost:5173](http://localhost:5173).
2. **Login as Sarah Williams (Google Recruiter)** using the preset button.
3. On her dashboard, fill out the **Post New Job Opening** form:
   - **Job Title**: *Frontend Architect*
   - **Company**: *Google Enterprise*
   - **Skills**: *React, TypeScript, CSS*
   - **Min GPA**: *3.5*
   - Click **Post Job & Run Matching Engine**.
4. Observe the **Pipeline Observer** logs on the left:
   - You will see the database write trigger the Matching Engine background scan.
   - Alice Johnson (MIT) will be found as a qualified candidate (having *React*, *TypeScript*, *CSS* and *3.8 GPA*).
   - An automated system email matching notification will be dispatched!
   - Bob Miller (Stanford) remains strictly isolated and is not scanned, proving our **Multi-Tenant College Isolation** works.
5. **Log Out** and click the **Alice Johnson (Student)** quick preset to log in.
6. Under Alice's dashboard:
   - Look at the **Automated Email Logs Inbox** panel on the right. You will see the system notification containing a direct application link!
   - Navigate to the **Job Directory** tab: You will see the Google *Frontend Architect* posting highlighted with a **"100% Match"** badge computed on the fly!
   - Click **Apply Now**.
7. Observe the logs:
   - An immediate reverse applicant alert notification is logged for the Google Recruiter!
8. **Log Out** and return as **Sarah Williams (Recruiter)**:
   - You will see the **Applicant Tracker** has Alice Johnson's resume logged, with actions to screen, approve, or reject her application in real time!
