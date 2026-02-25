# StreetFit - Business Management System 🧥💎 (Firebase Edition)

A premium, high-fidelity business management dashboard designed for **StreetFit** clothing brand partners. This application tracks financial contributions, expenses, and strategic business goals with a world-class user interface.

## 🚀 Permanent Setup Guide

To use this application permanently and from any device (Mobile/Desktop), follow these steps:

### 1. Hosting on GitHub Pages (Recommended)
1. **Upload to GitHub:** Create a new repository and upload all files.
2. **Enable Pages:** Go to `Settings > Pages`, select `Deploy from a branch`, choose `main`, and Save.
3. **Authorization:** 
   - Copy your GitHub URL (e.g., `yourname.github.io`).
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Navigate to `Authentication > Settings > Authorized Domains`.
   - Click `Add Domain` and paste your GitHub URL.

### 2. Firestore Security Rules
Ensure your data is private. In Firebase Console, go to `Firestore Database > Rules` and paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## ✨ Key Features

- **📊 Advanced Dashboard:** Real-time financial readiness tracking and budget management.
- **💰 Financial Tracking:** Comprehensive contribution and expense monitoring with PDF reporting.
- **📋 Collaborative Plans:** Custom dropdown assignment system for team tasks.
- **🔐 Secure Access:** Role-based authentication (Admin/Partner) powered by **Firebase**.
- **📱 Mobile-First Design:** Fully responsive high-end aesthetic optimized for all devices with **Offline Support**.

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, Javascript (ES6+)
- **Backend/Auth:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Icons:** FontAwesome 6.4.0
- **Fonts:** Google Fonts (Outfit & Inter)
- **PDF Reports:** jsPDF & jsPDF-AutoTable

## 📄 License
This project is for internal brand management by **StreetFit**.
