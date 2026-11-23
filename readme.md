# SmartRecover — Lost & Found JDCOEM

<p align="center">
  <strong>A Campus-Based Lost & Found Platform for JDCOEM Students</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Backend-green?logo=node.js" />
  <img src="https://img.shields.io/badge/Express.js-Framework-black?logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb" />
  <img src="https://img.shields.io/badge/EJS-Templating-orange" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel" />
</p>

---

## 🌐 Live Demo

**Live Website:** [SmartRecover – Lost & Found JDCOEM](YOUR_VERCEL_DEPLOYMENT_URL)

---

## 📌 About the Project

SmartRecover is a web-based Lost & Found platform designed to help students of JD College of Engineering and Management (JDCOEM) report, discover, and recover lost belongings within the campus.

Losing personal belongings on a college campus can be frustrating, and finding their rightful owners can be difficult. SmartRecover provides a centralized platform where students can report lost or found items, browse listings, submit claims, and communicate through a structured recovery process.

The platform aims to make the lost-and-found process more organized, accessible, and efficient for the campus community.

---

## ✨ Features

### 🔐 Authentication & User Management
- User Registration and Login.
- Secure password hashing.
- Session-based authentication.
- User profile management.
- Profile photo upload.
- College ID card upload.

### 📦 Lost & Found Item Management
- Report lost items.
- Report found items.
- Browse reported items.
- View item details.
- Upload item images.
- Categorize belongings.
- Add item location, date and description.

### 🤝 Item Claim System
- Submit claims for reported items.
- Claim-related information management.
- Email notifications for claim submissions.
- Organized item recovery workflow.

### 📧 Email Notifications
- Email notifications using Nodemailer.
- Gmail SMTP integration.
- Automated communication during the claim process.

### 🖼️ Image Uploads
- Upload item images.
- Profile image uploads.
- College ID card uploads.
- Cloudinary cloud-based image storage.

### 📱 Responsive UI
- Clean and modern interface.
- Responsive design for desktop and mobile devices.
- Easy navigation for students.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | Web framework |
| EJS | Server-side rendering |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB object modeling |
| HTML5 | Structure |
| CSS3 | Styling and responsive UI |
| JavaScript | Application logic |
| Cloudinary | Image storage |
| Nodemailer | Email notifications |
| Express Session | Session management |
| Connect-Mongo | Session storage |
| Vercel | Deployment |

---

## 🏗️ Project Architecture

SmartRecover follows the MVC (Model–View–Controller) architecture.

```text
SmartRecover/
│
├── config/
│   └── Database and application configurations
│
├── controllers/
│   └── Application controllers
│
├── models/
│   └── MongoDB schemas and models
│
├── routes/
│   └── Application routes
│
├── views/
│   ├── layouts/
│   ├── partials/
│   └── Application EJS pages
│
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
├── middleware/
│   └── Authentication and application middleware
│
├── server.js
├── package.json
└── README.md
```

*The directory structure above represents the architectural organization; individual folders may vary according to the current implementation.*

---

## 🔄 How SmartRecover Works

1. Students register and log in to the platform.
2. Users report belongings they have lost or found.
3. Reports include details such as title, description, category, location, date and images.
4. Students browse available lost and found reports.
5. Users submit claims when they identify an item they believe belongs to them.
6. Email notifications help communicate the claim process.
7. The platform supports an organized process for reuniting belongings with their owners.

---

## 🗃️ Item Categories

- Electronics
- ID Cards
- Books & Notes
- Wallet & Money
- Keys
- Bags
- Clothing
- Accessories
- Documents
- Other

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the project directory

```bash
cd SmartRecover
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

SESSION_SECRET=your_session_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
```

Configure the variable names according to the actual environment variable names used in the application.

### 5. Run the application

```bash
npm start
```

Or, if Nodemon is configured:

```bash
npx nodemon server.js
```

### 6. Open in your browser

```text
http://localhost:5000
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port |
| `MONGO_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Secret used for session configuration |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_USER` | SMTP sender email |
| `EMAIL_PASS` | SMTP app password |

**Note:** Never commit your `.env` file or expose credentials publicly.

---

## 🚀 Deployment

SmartRecover is deployed on Vercel.

The application uses MongoDB Atlas for cloud database storage and Cloudinary for image management.

### Deployment Requirements

- MongoDB Atlas database.
- Cloudinary account.
- SMTP email configuration.
- Vercel deployment.
- Production environment variables configured in Vercel.

---

## 🔒 Security

- Password hashing.
- Session-based authentication.
- Environment-based secret management.
- Authentication middleware.
- Login rate limiting.
- Secure password handling.
- Cloud-based database access.

---

## 📸 Screenshots

Add screenshots of the actual application here.

| Home Page | Lost & Found Listings |
|---|---|
| Add home page screenshot | Add items page screenshot |

| Login Page | User Profile |
|---|---|
| Add login screenshot | Add profile screenshot |

| Report Item | Item Details |
|---|---|
| Add report screenshot | Add details screenshot |

---

## 🎯 Project Objectives

- Digitize the campus lost-and-found process.
- Create a centralized platform for reporting belongings.
- Improve accessibility of lost and found information.
- Simplify the process of identifying and claiming items.
- Build a secure and user-friendly web application.
- Provide an efficient campus-oriented recovery workflow.

---

## 🔮 Future Enhancements

- Forgot Password and password reset functionality.
- Advanced search and filtering.
- Admin dashboard and moderation.
- Real-time notifications.
- Improved item matching.
- Enhanced analytics and reporting.

---

## 👨‍💻 Developer

**Developed as a campus-oriented web application project for JDCOEM.**

---

## 📄 License

This project is developed for educational and project demonstration purposes.
