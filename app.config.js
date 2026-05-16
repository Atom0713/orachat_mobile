const path = require('path');
const dotenv = require('dotenv');
const appJson = require('./app.json');

// Load environment variables from the root .env file for Expo build config.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const extra = {
  ...(appJson.expo.extra || {}),
};

Object.keys(process.env).forEach((key) => {
  if (key.startsWith('EXPO_PUBLIC_')) {
    extra[key] = process.env[key];
  }
});

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra,
  },
};
