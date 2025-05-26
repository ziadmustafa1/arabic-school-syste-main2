# Next.js App Directory

This directory contains the main application routes and components for the Arabic School System.

## Directory Structure

- `/actions`: Server-side actions
  - Contains server actions for handling data mutations and state changes
  - Used for forms, API functionality, and server-side operations

- `/admin`: Admin panel pages
  - Contains pages for administrator functionality
  - Includes user management, system configuration, and admin reports

- `/api`: API routes
  - Contains API endpoint handlers for server-side operations
  - Used for client-server communication and external integrations

- `/auth`: Authentication pages
  - Contains login, registration, and account management pages
  - Handles user authentication and authorization

- `/badges`: Badges system
  - Contains pages related to the student badge/achievement system
  - Displays earned badges and badge progress

- `/components`: App-specific components
  - Contains UI components that are specific to particular app features
  - Not meant to be shared across the entire project

- `/context`: React context providers
  - Contains context providers for global state management
  - Used for themes, user data, and other shared states

- `/dashboard`: Main dashboard pages
  - Contains the main dashboard views for different user roles
  - Entry point for authenticated users

- `/leaderboard`: Leaderboard pages
  - Contains pages showing student rankings and achievements
  - Displays points leaderboards and other competitive features

- `/my-records`: Student records
  - Contains pages for viewing and managing student records
  - Used by students to track their progress

- `/notifications`: Notification system
  - Contains pages for managing system notifications
  - Displays alerts, announcements, and personal notifications

- `/parent`: Parent portal
  - Contains pages specific to parent users
  - Includes student progress tracking and parent-specific features

- `/profile`: User profile
  - Contains pages for viewing and editing user profiles
  - Used for account settings and profile management

- `/settings`: System settings
  - Contains pages for configuring user and system settings
  - Used for preferences and application configuration

- `/shared`: Shared components and utilities
  - Contains components and utilities used across multiple app directories
  - For code that needs to be shared between different parts of the application

- `/student`: Student portal
  - Contains pages specific to student users
  - Includes learning tools, rewards, and student-specific features

- `/teacher`: Teacher portal
  - Contains pages specific to teacher users
  - Includes class management, grading, and teacher-specific features

## Global Files

- `globals.css`: Global stylesheet for the application
- `layout.tsx`: Root layout component that wraps all pages
- `page.tsx`: Home page component
- `error.tsx`: Global error handling component
- `fallback-page.tsx`: Fallback page when content is not available 