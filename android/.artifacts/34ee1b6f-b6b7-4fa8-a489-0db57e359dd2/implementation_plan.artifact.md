# Remove flatDir from Gradle build files

The `flatDir` repository is deprecated in modern Gradle and causes sync errors. This plan removes `flatDir` and ensures local dependencies are handled via `fileTree`.

## Proposed Changes

### [Component Name] :app

#### [MODIFY] [build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/app/build.gradle)
- Remove the `repositories` block that contains `flatDir`.
- Update the `dependencies` block to include `*.aar` files in the `fileTree`.

### [Component Name] :capacitor-cordova-android-plugins

#### [MODIFY] [build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/capacitor-cordova-android-plugins/build.gradle)
- Remove `flatDir` from the `repositories` block.
- Update the `dependencies` block to include `*.aar` files in the `fileTree`.

## Verification Plan

### Automated Tests
- Run Gradle sync to verify the error is gone.
- Run `./gradlew assembleDebug` to ensure the project still builds.

### Manual Verification
- None required.
