# Remove flatDir repositories

This plan removes the use of `flatDir` repositories in the Gradle build files and replaces them with standard dependency declarations where necessary. The `flatDir` repository is deprecated and causes sync warnings/errors in newer Gradle versions.

## User Review Required

> [!IMPORTANT]
> The `flatDir` blocks being removed were pointing to directories that currently do not exist or are empty (`libs`, `src/main/libs`). If you manually add `.aar` files to these directories in the future, you should use `implementation files('libs/your-library.aar')` instead of relying on `flatDir` resolution.

## Proposed Changes

### app component

#### [MODIFY] [app/build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/app/build.gradle)
- Remove the `flatDir` block from `repositories`.

### capacitor-cordova-android-plugins component

#### [MODIFY] [capacitor-cordova-android-plugins/build.gradle](file:///C:/Users/Behnam/Desktop/repair-saas-clone/repair-saas-final/android/capacitor-cordova-android-plugins/build.gradle)
- Remove the `flatDir` block from `repositories`.

## Verification Plan

### Automated Tests
- Run Gradle sync to ensure the error is resolved.
- Run `./gradlew assembleDebug` (or equivalent) to ensure the project still builds.

### Manual Verification
- Check that no other `flatDir` usages remain in the project.
