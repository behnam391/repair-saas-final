# Remove flatDir repositories

This plan removes the use of `flatDir` repositories in the Gradle build files and replaces them with the more modern and robust `fileTree` approach for handling local JAR and AAR files. `flatDir` is discouraged because it doesn't support metadata formats like Maven or Ivy, leading to potential issues with transitive dependencies and resolution.

## User Review Required

> [!IMPORTANT]
> The `flatDir` blocks being removed were pointing to directories that currently do not exist in the project (`src/main/libs`, `libs`). These are likely default placeholders from the Capacitor/Cordova template.

## Proposed Changes

### :capacitor-cordova-android-plugins

#### [MODIFY] [build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/capacitor-cordova-android-plugins/build.gradle)
- Remove the `flatDir` block from `repositories`.
- Update `dependencies` to include `*.aar` files in the `fileTree` if they are ever added.

### :app

#### [MODIFY] [build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/app/build.gradle)
- Remove the `flatDir` block from `repositories`.
- Update `dependencies` to include `*.aar` files in the `fileTree`.

## Verification Plan

### Automated Tests
- Run `./gradlew help` to ensure the Gradle configuration is still valid and there are no syntax errors.
- Run `./gradlew :app:assembleDebug` to verify the project still builds successfully.

### Manual Verification
- Verify that no local JARs/AARs were actually being used that relied on `flatDir` resolution by name. (I have already checked for `name:` usages and found none).
