import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';
import { learnMore } from '../utils/TerminalLink';
import { existsAndIsNotIgnoredAsync } from '../utils/files';

export class StoreCompatibilityCheck implements DoctorCheck {
  description = 'Check if the project meets version requirements for submission to app stores';

  sdkVersionRange = '*';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    let issue: string | undefined = undefined;

    // *** non-CNG ***
    if (await existsAndIsNotIgnoredAsync(path.join(projectRoot, 'android', 'build.gradle'))) {
      const buildGradle = fs.readFileSync(
        path.join(projectRoot, 'android', 'build.gradle'),
        'utf8'
      );
      // checks for exact string from SDK 49 bare template, will not work if it was changed
      const targetSdkVersionRegex =
        /^\s*targetSdkVersion\s*=\s*(?:Integer\.parseInt\(findProperty\('android\.targetSdkVersion'\)\s*\?:\s*'(\d+)'\)|'(\d+)')/m;
      const match = buildGradle.match(targetSdkVersionRegex);
      const targetSdkVersion = match ? parseInt(match[1], 10) : undefined;
      if (targetSdkVersion && targetSdkVersion < 34) {
        issue = 'This project appears to be targeting Android API level 33 or lower. ';
      }
    } else {
      // *** CNG ***

      // check if build properties overrides to a lower target SDK
      const buildPropertiesConfig = exp.plugins?.find(
        (plugin) => plugin[0] === 'expo-build-properties'
      );
      if (
        buildPropertiesConfig &&
        buildPropertiesConfig.length > 1 &&
        buildPropertiesConfig[1].android.targetSdkVersion < 34
      ) {
        issue =
          'This project is using expo-build-properties to target Android API level 33 or lower. ';
      } else if (!semver.satisfies(exp.sdkVersion!, '>=50.0.0')) {
        issue =
          'This project is using an SDK version that by default targets Android API level 33 or lower. ';
      }
    }

    if (issue) {
      issue +=
        'To submit your app to the Google Play Store, you must target Android API level 34 or higher. ';
    }

    return {
      isSuccessful: !issue,
      issues: issue ? [issue] : [],
      advice: issue
        ? `Upgrade to Expo SDK 50 or later, which by default supports Android API level 34 ${learnMore(
            'https://support.google.com/googleplay/android-developer/answer/11926878?hl=en'
          )}`
        : undefined,
    };
  }
}
