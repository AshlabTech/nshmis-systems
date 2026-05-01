import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { THEME } from '../config/appConfig';

export const TextInputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  error?: string;
  disabled?: boolean;
}> = ({ label, value, onChangeText, placeholder, multiline, keyboardType = 'default', error, disabled }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.muted}
        editable={!disabled}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && !error && styles.focused,
          !!error && styles.errorBorder,
          disabled && styles.disabled,
        ]}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: THEME.text, letterSpacing: 0.2 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    minHeight: 52,
    paddingHorizontal: 14,
    color: THEME.text,
    fontSize: 15,
  },
  focused: { borderColor: THEME.teal, backgroundColor: '#FAFFFD' },
  multiline: { minHeight: 96, paddingTop: 14, paddingBottom: 14 },
  errorBorder: { borderColor: THEME.danger, backgroundColor: '#FFF5F5' },
  disabled: { backgroundColor: '#F3F6F6', opacity: 0.65 },
  errorText: { marginTop: 5, color: THEME.danger, fontSize: 12, fontWeight: '500' },
});
