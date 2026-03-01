# orachat_mobile

Mobile (IOS & Android) orachat app. Made for friends, family, portfolio, and personal developemnt.

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

For IOS
```bash
EXPO_PUBLIC_RECIPIENT=bob EXPO_PUBLIC_USERNAME=alice EXPO_PUBLIC_ORACHAT_API_URL="http://localhost:8000" npx expo start -c
   ```

For Android
```bash
EXPO_PUBLIC_RECIPIENT=alice EXPO_PUBLIC_USERNAME=bob EXPO_PUBLIC_ORACHAT_API_URL="http://10.0.2.2:8000" npx expo start -c
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.
