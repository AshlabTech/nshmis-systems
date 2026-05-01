import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'niger_hmis_device_id';
const USER_ID_KEY = 'niger_hmis_user_id';

export const getOrCreateDeviceId = async () => {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = `device_${uuidv4()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
};

export const getUserId = async () => AsyncStorage.getItem(USER_ID_KEY);

export const setUserId = async (userId: string) => {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
};

export const getLocalIdentity = async () => {
  const [deviceId, userId] = await Promise.all([getOrCreateDeviceId(), getUserId()]);
  return { deviceId, userId: userId ?? 'unknown' };
};
