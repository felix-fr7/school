# Upgrade Gradle and AGP to support Java 25

The build is failing with `Unsupported class file major version 69` because the current Gradle version (8.14.3) does not support Java 25. This plan upgrades Gradle and the Android Gradle Plugin (AGP) to versions that support Java 25.

## User Review Required

> [!IMPORTANT]
> Upgrading to Gradle 9.x and AGP 9.x may introduce breaking changes in build scripts if you have custom logic. This plan uses the latest stable versions found (Gradle 9.7.0 and AGP 9.3.1).

> [!NOTE]
> After these changes, you may need to run `npx cap update` or `npx cap copy` to ensure Capacitor plugins are correctly synced with the new build environment.

## Proposed Changes

### Build Configuration

#### [MODIFY] [gradle-wrapper.properties](file:///D:/School/frontend/android/gradle/wrapper/gradle-wrapper.properties)
- Update `distributionUrl` to Gradle 9.7.0.

#### [MODIFY] [build.gradle](file:///D:/School/frontend/android/build.gradle)
- Update `com.android.tools.build:gradle` to `9.3.1`.
- Update `com.google.gms:google-services` to `4.5.0`.

## Verification Plan

### Automated Tests
- Run `./gradlew clean` to verify the build script can now be parsed by Gradle using Java 25.
- Run a full build (e.g. `./gradlew assembleDebug`) to ensure compatibility.

### Manual Verification
- Verify the project syncs successfully in Android Studio.
