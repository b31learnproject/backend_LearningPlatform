// One-time migration script to fix quizzes with undefined scheduledDateTime
require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');

async function fixQuizDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find quizzes with undefined or null scheduledDateTime
    const quizzesWithoutDates = await Quiz.find({
      $or: [
        { scheduledDateTime: { $exists: false } },
        { scheduledDateTime: null },
        { scheduledDateTime: undefined }
      ]
    });

    console.log(`🔍 Found ${quizzesWithoutDates.length} quizzes without proper scheduledDateTime`);

    if (quizzesWithoutDates.length > 0) {
      const currentTime = new Date();
      
      // Update all quizzes without dates to use current time
      const result = await Quiz.updateMany(
        {
          $or: [
            { scheduledDateTime: { $exists: false } },
            { scheduledDateTime: null },
            { scheduledDateTime: undefined }
          ]
        },
        {
          $set: {
            scheduledDateTime: currentTime,
            availableFrom: currentTime
          }
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} quizzes with default scheduledDateTime`);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📛 Disconnected from MongoDB');
  }
}

// Run the migration
fixQuizDates(); 