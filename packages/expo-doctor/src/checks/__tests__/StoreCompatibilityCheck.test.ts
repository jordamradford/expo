import { vol } from 'memfs';

import { existsAndIsNotIgnoredAsync } from '../../utils/files';
import { StoreCompatibilityCheck } from '../StoreCompatibilityCheck';

jest.mock('fs');
jest.mock('../../utils/files');

const projectRoot = '/tmp/project';

const expProjectProps = {
  name: 'name',
  slug: 'slug',
};

// required by runAsync
const additionalProjectProps = {
  projectRoot,
  hasUnusedStaticConfig: false,
  staticConfigPath: null,
  dynamicConfigPath: null,
};

describe('runAsync', () => {
  afterEach(() => {
    vol.reset();
    jest.resetAllMocks();
  });
  it('returns result with isSuccessful = true if SDK 50+ with default Android target API level', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(false);
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'expo', version: '1.0.0' },
      exp: { ...expProjectProps, sdkVersion: '50.0.0' },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeTruthy();
  });

  it('returns result with isSuccessful = true if ios/android folders but build.gradle indicates API level 34+', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(true);
    vol.fromJSON({
      [projectRoot + '/android/build.gradle']:
        `targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '34')`,
    });
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: { ...expProjectProps, sdkVersion: '49.0.0' },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeTruthy();
  });

  it('returns result with isSuccessful = true if ios/android folders but build.gradle indicates API level 34+ (direct assignment)', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(true);
    vol.fromJSON({
      [projectRoot + '/android/build.gradle']: `targetSdkVersion = '34'`,
    });
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: { ...expProjectProps, sdkVersion: '49.0.0' },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeTruthy();
  });

  it('returns result with isSuccessful = false if ios/android folders but build.gradle indicates API level <34', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(true);
    vol.fromJSON({
      [projectRoot + '/android/build.gradle']:
        `targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '33')`,
    });
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: { ...expProjectProps, sdkVersion: '49.0.0' },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeFalsy();
  });

  it('returns result with isSuccessful = false if expo-build-properties is set to target API level <34', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(false);
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: {
        ...expProjectProps,
        sdkVersion: '50.0.0',
        plugins: [['expo-build-properties', { android: { targetSdkVersion: 33 } }]],
      },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeFalsy();
  });

  it('returns result with isSuccessful = true if expo-build-properties plugin added but does not include any props', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(false);
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: {
        ...expProjectProps,
        sdkVersion: '50.0.0',
        plugins: ['expo-build-properties'],
      },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeTruthy();
  });

  it('returns result with isSuccessful = false if SDK <50', async () => {
    jest.mocked(existsAndIsNotIgnoredAsync).mockResolvedValue(false);
    const check = new StoreCompatibilityCheck();
    const result = await check.runAsync({
      pkg: { name: 'name', version: '1.0.0' },
      exp: {
        ...expProjectProps,
        sdkVersion: '49.0.0',
      },
      ...additionalProjectProps,
    });
    expect(result.isSuccessful).toBeFalsy();
  });
});
