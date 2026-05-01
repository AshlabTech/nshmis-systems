import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'niger_hmis_auth_token';

export const tokenStore = {
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
