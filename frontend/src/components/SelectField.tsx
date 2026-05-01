import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { THEME } from '../config/appConfig';

export const SelectField: React.FC<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  error?: string;
  disabled?: boolean;
}> = ({ label, value, onValueChange, items, error, disabled }) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.box, error ? styles.errorBorder : null, disabled ? styles.disabled : null]}>
      <Picker selectedValue={value} onValueChange={(itemValue) => onValueChange(String(itemValue))} style={styles.picker} dropdownIconColor={THEME.teal} enabled={!disabled}>
        <Picker.Item label="Select one" value="" />
        {items.map((item) => (
          <Picker.Item key={item.value} label={item.label} value={item.value} />
        ))}
      </Picker>
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { marginBottom: 6, color: THEME.text, fontWeight: '700' },
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  picker: { minHeight: 52 },
  errorBorder: { borderColor: THEME.danger, backgroundColor: '#FFF5F5' },
  disabled: { opacity: 0.6 },
  errorText: { marginTop: 6, color: THEME.danger, fontSize: 12 },
});
