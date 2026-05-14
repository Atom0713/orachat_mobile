# orachat_mobile

Mobile (IOS & Android) orachat app. Made for friends, family, portfolio, and personal developemnt.

## Development

###  Install dependencies

```bash
npm install
```

### Start the app

For IOS
```bash
EXPO_PUBLIC_ORACHAT_API_URL="http://localhost:8000" npx expo start -c
   ```

For Android
```bash
EXPO_PUBLIC_ORACHAT_API_URL="http://10.0.2.2:8000" npx expo start -c
```
### Build and run the native apps locally

```
npx expo run:ios/android
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


## Release process

### Android Bundle build

#### 1. Generate android project

```bash
npx expo prebuild --platform android --clean
```
**NOTE**: re-generates `android` directory which will require additional setup in `android/app/build.gradle`.

#### 2. Change app version in the `app.json`
#### 3. Change app version in the `android/app/build.gradle`
#### 4. Build bundle
```bash
cd android/ && ./gradlew bundleRelease
```
#### 5. Upload `.aab` file to Google Play console.

### Common issues
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### IOS Bundle build

#### 1. Generate ios project
```bash
npx expo prebuild --platform ios --clean
```
#### 2. ```cd ios && pod install && cd ..```
#### 3. Open project in XCode
```bash
open ios/*.xcworkspace
```
#### 4. Signing & Capabilities
- Ensure a Team is selected
- Check "Automatically manage signing"

#### 5. Build and Archive
- Set Destination: In the top menu bar, set the target device to Any iOS Device (arm64).
- Scheme: Go to Product > Scheme > Edit Scheme and ensure the Archive > Build Configuration is set to Release.
- Archive: Go to Product > Archive. Xcode will compile your app and bundle the JavaScript locally.

#### 6. Distribute to App Store/TestFlight 
- Distribute App: Click the Distribute App button.
- Method: Select App Store Connect and then Upload.
- Final Steps: Follow the prompts to upload the build to App Store Connect. Once uploaded, you can manage the build for TestFlight or final App Store review through your App Store Connect dashboard

### Debugging
#### Upload '.jks' debugging
```bash
keytool -list -v -keystore upload-keystore.jks
```