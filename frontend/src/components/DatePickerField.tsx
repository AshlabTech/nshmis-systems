import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { THEME } from '../config/appConfig';

const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

export const DatePickerField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}> = ({ label, value, onChange, error, disabled, minimumDate, maximumDate }) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const open = () => {
    if (disabled) return;
    setTempDate(parseDate(value));
    setShow(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  const handleIosChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setTempDate(selectedDate);
  };

  const confirmIos = () => {
    setShow(false);
    onChange(formatDate(tempDate));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {!!value && !disabled && (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          !!value && styles.triggerSelected,
          !!error && styles.errorBorder,
          !!disabled && styles.triggerDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={[styles.triggerValue, !value && styles.placeholderText]}>
          {value || 'Select date'}
        </Text>
        <Calendar size={20} color={disabled ? THEME.muted : THEME.teal} />
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.iosOverlay}>
            <Pressable style={styles.iosBackdrop} onPress={() => setShow(false)} />
            <View style={styles.iosSheet}>
              <View style={styles.iosToolbar}>
                <Pressable onPress={() => setShow(false)} hitSlop={12}>
                  <Text style={styles.iosCancelBtn}>Cancel</Text>
                </Pressable>
                <Text style={styles.iosSheetTitle}>{label}</Text>
                <Pressable onPress={confirmIos} hitSlop={12}>
                  <Text style={styles.iosDoneBtn}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleIosChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  label: { fontSize: 13, fontWeight: '700', color: THEME.text },
  clearText: { color: THEME.teal, fontSize: 12, fontWeight: '700' },
  trigger: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.border,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerSelected: { borderColor: '#A8D4D4', backgroundColor: '#FBFFFF' },
  triggerDisabled: { backgroundColor: '#F1F5F5', opacity: 0.75 },
  pressed: { transform: [{ scale: 0.995 }], opacity: 0.9 },
  errorBorder: { borderColor: THEME.danger, backgroundColor: '#FFF5F5' },
  triggerValue: { flex: 1, color: THEME.text, fontSize: 15, fontWeight: '600' },
  placeholderText: { color: THEME.muted, fontWeight: '500' },
  errorText: { marginTop: 6, color: THEME.danger, fontSize: 12, fontWeight: '600' },
  iosOverlay: { flex: 1, justifyContent: 'flex-end' },
  iosBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18, 50, 50, 0.42)' },
  iosSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  iosToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: THEME.border,
  },
  iosSheetTitle: { fontSize: 16, fontWeight: '700', color: THEME.text },
  iosCancelBtn: { color: THEME.muted, fontSize: 16, fontWeight: '600' },
  iosDoneBtn: { color: THEME.teal, fontSize: 16, fontWeight: '800' },
  iosPicker: { height: 216 },
});
