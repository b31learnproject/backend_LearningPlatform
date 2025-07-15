const fs = require('fs');
const path = require('path');

/**
 * Ensures that the avatar upload directory exists.
 * Creates the directory recursively if it does not exist.
 * @param {string} uploadDirPath - Relative or absolute path to the upload directory.
 * @returns {Promise<void>} Resolves when directory exists or is created.
 */
const createAvatarUploadDir = (uploadDirPath = path.join(__dirname, '../uploads/avatars')) => {
  return new Promise((resolve, reject) => {
    fs.mkdir(uploadDirPath, { recursive: true }, (err) => {
      if (err) {
        console.error(`Failed to create avatar upload directory at ${uploadDirPath}:`, err);
        return reject(err);
      }
      // Directory exists or created successfully
      resolve();
    });
  });
};

module.exports = createAvatarUploadDir;
