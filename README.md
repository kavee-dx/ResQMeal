# 🍱 ResQMeal

## Community Food-Sharing & Surplus Mobile Application

ResQMeal is a mobile application designed to reduce food waste and support communities by connecting food donors with recipients through real-time donor-recipient matching and a volunteer delivery network.

The platform enables individuals, hotels, and restaurants to share surplus food while helping recipients access available food resources efficiently.

---

# 🌱 SDG Alignment

ResQMeal supports the following Sustainable Development Goals:

## 🎯 SDG 2 - Zero Hunger

Helps reduce food insecurity by connecting surplus food with people and organizations that need food assistance.

## ♻️ SDG 12 - Responsible Consumption and Production

Reduces food waste by promoting responsible food sharing and sustainable consumption practices.

---

# 🚀 Key Features

## 🍽 Food Donation Management

- Add and manage surplus food donations.
- Upload food details including category, quantity, and expiry date.
- Track donation availability and status.

## 🤖 AI Food Donation Priority System

- Prioritizes donations based on:
  - Expiry time
  - Food type
  - Urgency level
  - Recipient requirements

## ⏰ Smart Expiry Alerts

- Sends alerts before food expires.
- Helps rescue food before it becomes unusable.

## 🗺 Digital Food Rescue Map

- Displays nearby food donations and rescue locations.
- Helps users find available food resources easily.

## 🏨 Hotel & Restaurant Integration

- Allows hotels and restaurants to donate surplus meals.
- Supports large-scale food sharing.

## 🚨 Emergency Food Requests

- Allows recipients to request urgent food assistance.
- Helps connect emergency requests with available donors.

## 🚚 Volunteer Delivery Network

- Enables volunteers to support food transportation.
- Tracks delivery progress.

## ⚡ Real-Time Donor-Recipient Matching

- Matches donors and recipients based on:
  - Location
  - Food availability
  - Urgency

---

# 🧩 Main System Components

ResQMeal is divided into four main components to organize the development and functionality of the system.

---

## 1. 🍽 Food Donation & Hotel/Restaurant Integration Module

Responsible for managing food donations from individual donors, hotels, and restaurants.

### Main Functionalities:

- Add and manage surplus food details.
- Upload food images and information.
- Specify food quantity, category, and expiry date.
- Manage hotel and restaurant food contributions.
- Track donation availability and status.

---

## 2. 🚨 Recipient Management & Emergency Food Request Module

Responsible for connecting recipients with available food resources.

### Main Functionalities:

- Recipient registration and profile management.
- Browse available food donations.
- Submit emergency food requests.
- Track request status.
- Receive donation updates.

---

## 3. 🤖 AI Matching & Volunteer Delivery Module

Responsible for intelligent matching between donors, recipients, and volunteers.

### Main Functionalities:

- Real-time donor-recipient matching.
- Location-based food matching.
- Volunteer delivery coordination.
- Delivery status tracking.
- Assign available volunteers efficiently.

---

## 4. 🗺 Donation Priority, Smart Expiry Alerts & Digital Food Rescue Map Module

Responsible for improving food rescue efficiency using intelligent monitoring and location services.

### Main Functionalities:

- AI-based donation priority calculation.
- Smart expiry notifications.
- Identify urgent food rescue requirements.
- Display nearby donations using digital maps.
- Help users locate available food resources.

---

# 🛠 Technology Stack

## 📱 Frontend

- React Native
- Expo
- TypeScript
- NativeWind (Tailwind CSS)
- React Navigation
- Zustand
- Axios

## ⚙ Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose

## 🔐 Services & APIs

- JWT Authentication
- bcrypt Password Hashing
- Cloudinary Image Storage
- Google Maps API
- Socket.IO
- Expo Notifications

---

# 📂 Project Structure

```

ResQMeal
│
├── frontend
│   │
│   ├── src
│   │   ├── screens
│   │   ├── navigation
│   │   ├── components
│   │   ├── services
│   │   └── store
│   │
│   └── package.json
│
├── backend
│   │
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   ├── middleware
│   │   └── services
│   │
│   └── package.json
│
└── README.md

````

---

# ⚙️ Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/kavee-dx/ResQMeal.git

cd ResQMeal
````

---

# Backend Setup

Navigate to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key
```

Start backend server:

```bash
npm run dev
```

Backend runs on:

```
http://localhost:5000
```

---

# Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the frontend folder:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Start Expo:

```bash
npm start
```

---

# 🔒 Environment Variables

The following files are excluded from GitHub:

```
.env
node_modules/
.expo/
```

Each developer must create their own `.env` files after cloning the repository.

---

# 👥 Team Development Workflow

Before starting development:

```bash
git pull origin main
```

Create a feature branch:

```bash
git checkout -b feature-name
```

Add changes:

```bash
git add .
```

Commit changes:

```bash
git commit -m "Describe your changes"
```

Push changes:

```bash
git push origin feature-name
```

---

# 👨‍💻 Development Team

ResQMeal is developed as a Software Engineering group project focused on sustainable technology, community engagement, and reducing food waste through digital solutions.

---

⭐ Building a smarter way to rescue food and support communities.

````