# Learning Platform Backend

A comprehensive learning management system backend built with Node.js, Express, and MongoDB.

## Features

- User management (Admin, Coordinator, Educator, Learner roles)
- Course management with image uploads
- Assignment and submission system
- Quiz system with automatic grading
- Payment processing integration
- Email notifications
- File upload handling
- Real-time features with Socket.io
- API documentation with Swagger

## Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- SMTP email service (Gmail, etc.)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## Deployment to Render

### Prerequisites
- MongoDB Atlas account (for cloud database)
- Email service credentials (Gmail App Password recommended)
- Render account

### Steps

1. **Set up MongoDB Atlas:**
   - Create a cluster at [MongoDB Atlas](https://cloud.mongodb.com)
   - Get your connection string
   - Whitelist Render's IP addresses (or use 0.0.0.0/0 for all IPs)

2. **Deploy to Render:**
   - Connect your GitHub repository to Render
   - Render will automatically detect the `render.yaml` configuration
   - Set the following environment variables in Render dashboard:

   **Required Environment Variables:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/learning_platform
   JWT_SECRET=your_strong_jwt_secret_here
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   SMTP_FROM_EMAIL=your_email@gmail.com
   ADMIN_EMAIL=admin@yourlearningplatform.com
   ```

   **Optional Environment Variables:**
   ```
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   STRIPE_SECRET_KEY=your_stripe_secret
   API_BASE_URL=https://your-app-name.onrender.com
   ```

3. **Deploy:**
   - Push your code to GitHub
   - Render will automatically build and deploy
   - Your API will be available at `https://your-app-name.onrender.com`

### Important Notes

- **File Uploads:** Render provides persistent disk storage mounted at `/opt/render/project/src/uploads`
- **Database:** Use MongoDB Atlas for production database
- **Email:** Configure SMTP settings for email notifications
- **Environment Variables:** Never commit sensitive data to your repository
- **Cold Starts:** Free tier apps may experience cold starts after inactivity

### API Documentation

Once deployed, API documentation will be available at:
`https://your-app-name.onrender.com/api-docs`

### Monitoring

- Check logs in Render dashboard
- Monitor database usage in MongoDB Atlas
- Set up alerts for critical errors

## Environment Variables Reference

See `.env.example` for a complete list of all available environment variables and their descriptions.

## Support

For deployment issues:
1. Check Render build logs
2. Verify all environment variables are set
3. Ensure MongoDB Atlas connection string is correct
4. Check SMTP credentials for email functionality