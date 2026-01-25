Project Proposal and Technical Specification: Attenon

Project Title: Attenon: A Biometric Mobile Attendance System using Facial Verification

Student Name: [Your Name Here]

Supervisor Name: [Supervisor Name Here]

Date: December 6, 2025

Table of Contents

1.0 Introduction 1.1 Background of Study

1.2 Problem Statement

1.3 Aim and Objectives

1.4 Significance of the Project

2.0 Literature Review 2.1 Overview of Attendance Systems

2.2 Biometric Technology in Education

2.3 Analysis of Facial Verification Algorithms

3.0 Methodology and System Analysis 3.1 System Architecture

3.2 Technology Stack Justification

3.3 Functional Modules

3.4 Biometric Verification Logic

4.0 System Design 4.1 Database Design (Schema)

4.2 API Logic Flow

4.3 User Interface Design (Wireframes)

5.0 Implementation Plan 5.1 Development Phases

5.2 Budget and Resources

6.0 Conclusion 7.0 References ---

1.0 Introduction

1.1 Background of Study

The administration of attendance in educational institutions is a critical routine that ensures student engagement and academic integrity. Traditionally, this process involves manual roll calls or paper-based signing sheets. While functional, these methods are increasingly incompatible with the demands of modern, large-scale educational environments due to time inefficiencies and data inaccuracy. This project proposes "Attenon," a mobile-first solution that leverages cloud computing and Artificial Intelligence (AI) to automate and secure this process.

1.2 Problem Statement

The current manual attendance system presents four significant challenges:

Time Inefficiency: In classes exceeding 50 students, manual roll calls can consume 10 to 15 minutes of lecture time.

Identity Fraud (Proxy Attendance): Students frequently sign attendance sheets on behalf of absent colleagues, compromising the integrity of academic records.

Data Redundancy: Physical records are prone to damage, loss, and errors during manual transcription to digital formats.

Lack of Transparency: Students lack real-time access to their attendance metrics, often leading to administrative disputes at the end of the semester.

1.3 Aim and Objectives

Aim: To design and implement a cross-platform mobile application that utilizes facial verification technology to authenticate student attendance in real-time.

Specific Objectives:

To develop a secure RESTful API using NestJS to handle user authentication and data processing.

To implement a relational database using Supabase (PostgreSQL) for the storage of academic records and image references.

To integrate the Face++ API for biometric comparison, ensuring a high confidence interval for identity verification.

To build a responsive mobile interface using React Native (Expo) for lecturers to administer attendance.

To generate automated attendance reports and analytics for administrative use.

1.4 Significance of the Project

This project bridges the gap between theoretical computer science concepts (AI, Cloud Computing, Database Management) and practical application. It offers the institution a cost-effective, hardware-independent solution to attendance fraud while providing the student developer with enterprise-level software engineering experience.

2.0 Literature Review

2.1 Overview of Attendance Systems

Historical analysis shows a shift from manual registers to early automated systems like punch cards and RFID. While RFID improved speed, it failed to solve the "buddy punching" problem, as cards can be shared.

2.2 Biometric Technology

Biometrics—identification based on physical characteristics—offers the highest security. Fingerprint scanners are common but require expensive hardware installation in every classroom and pose hygiene risks.

2.3 Analysis of Facial Verification

Facial verification (1:1 matching) compares a live image against a stored reference. Unlike facial recognition (1:N matching), which scans a database to find a match, verification simply validates a claim of identity. This project utilizes deep learning-based feature extraction (nodal point analysis), which remains robust against minor appearance changes such as facial hair growth or the wearing of corrective lenses, provided the confidence threshold is statistically calibrated (Zhang et al., 2021).

3.0 Methodology and System Analysis

3.1 System Architecture

The system adopts a Client-Server-Service architecture. The mobile client captures data, the backend server enforces security and business logic, and the third-party AI service performs the biometric computation.

graph TD
    User((User))
    Mobile[Mobile App\nReact Native]
    API[Backend API\nNestJS]
    DB[(Database\nSupabase)]
    FaceAI[Face++ AI Service]

    User <-->|Interaction| Mobile
    Mobile <-->|JSON/HTTPS| API
    API <-->|SQL Queries| DB
    API <-->|Image Comparison| FaceAI
    
    style Mobile fill:#ffffff,stroke:#333,stroke-width:2px
    style API fill:#ffffff,stroke:#333,stroke-width:2px
    style DB fill:#ffffff,stroke:#333,stroke-width:2px
    style FaceAI fill:#ffffff,stroke:#333,stroke-width:2px


3.2 Technology Stack Justification

NestJS (Backend): Selected for its modular architecture and native TypeScript support, ensuring scalable and maintainable code.

Supabase (Database): Chosen for its PostgreSQL foundation, offering relational data integrity and real-time subscription capabilities.

Face++ (AI Engine): Selected for its industry-leading accuracy in diverse lighting conditions compared to AWS Rekognition for this specific use case.

React Native (Frontend): Allows for the deployment of both Android and iOS applications from a single codebase.

3.3 Functional Modules

Authentication Module: Handles secure login for Teachers and Students (JWT-based).

Course Management Module: Allows teachers to create courses and schedule sessions.

Biometric Module: Captures images, compresses them, and communicates with the AI service.

Reporting Module: Calculates attendance percentages and exports logs.

3.4 Biometric Verification Logic

The core logic dictates the integrity of the attendance record. The system uses a confidence score returned by the AI.

sequenceDiagram
    participant Teacher
    participant MobileApp
    participant Backend
    participant Face++
    
    Teacher->>MobileApp: Select Student & Take Photo
    MobileApp->>Backend: POST /verify (Image + ID)
    Backend->>Face++: Compare(LiveImg, RefImg)
    Face++-->>Backend: Return Confidence (0-100)
    
    loop Logic Check
        Backend->>Backend: Check Thresholds
    end
    
    alt Score > 80%
        Backend->>Backend: Mark PRESENT
        Backend-->>MobileApp: Success (200 OK)
    else Score < 80%
        Backend-->>MobileApp: Verification Failed (401)
    end


4.0 System Design

4.1 Database Design (Schema Specification)

The database will be normalized to Third Normal Form (3NF).

User Table: UUID (PK), Email, PasswordHash, Role (Enum: TEACHER, STUDENT)

StudentProfile Table: UserID (FK), MatricNumber, FaceReferenceURL, Department

Course Table: CourseID (PK), CourseCode, TeacherID (FK)

AttendanceLog Table: LogID (PK), StudentID (FK), SessionID (FK), Timestamp, Status, ConfidenceScore

4.2 User Interface Design

Landing Dashboard: Upon login, the user is presented with a clean interface.

Teacher View: List of active courses, "Start Class" button, and "View Reports" button.

Student View: Attendance summary (Circular Progress Bar) and list of recent classes.

5.0 Implementation Plan

5.1 Development Phases

Phase I (Weeks 1-2): Environment setup, Database schema creation (Prisma setup), and Authentication API development.

Phase II (Weeks 3-5): Integration of Face++ API and development of the image handling pipeline in NestJS.

Phase III (Weeks 6-8): Mobile application development (React Native) including Camera and Dashboard interfaces.

Phase IV (Weeks 9-10): System integration testing, bug fixing, and final documentation.

5.2 Budget and Resources

The project leverages open-source software and free-tier cloud services to minimize costs.

Hosting: Render/Vercel (Free Tier)

Database: Supabase (Free Tier - 500MB)

AI Service: Face++ (Developer License)

Hardware: Existing Development Laptop and Android Smartphone.

6.0 Conclusion

Attenon represents a significant step forward in educational administration. By automating attendance, the system saves time and enforces discipline. The modular design ensures that the system is scalable and can be adopted by other faculties or institutions in the future.

7.0 References

Jain, A. K., Ross, A., & Prabhakar, S. (2004). An Introduction to Biometric Recognition. IEEE Transactions on Circuits and Systems for Video Technology.

Olatunji, T. & Bright, K. (2020). Smart Attendance Management System Using Face Recognition. International Journal of Engineering Research & Technology.

Zhang, H. et al. (2021). Deep Learning for Robust Facial Recognition. Journal of Computer Vision.