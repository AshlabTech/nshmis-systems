import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { THEME } from '../config/appConfig';

type SelectItem = { label: string; value: string };

export const SearchableSelectField: React.FC<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  disabledText?: string;
  emptyText?: string;
}> = ({
  label,
  value,
  onValueChange,
  items,
  placeholder = 'Select an option',
  error,
  disabled,
  disabledText = 'Unavailable',
  emptyText = 'No options found',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = useMemo(() => items.find((item) => item.value === value)?.label ?? '', [items, value]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [items, query]);

  const openSheet = () => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
  };

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {!!selectedLabel && !disabled && (
          <Pressable onPress={() => onValueChange('')} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={openSheet}
        style={({ pressed }) => [
          styles.trigger,
          !!selectedLabel && styles.triggerSelected,
          !!error && styles.errorBorder,
          !!disabled && styles.triggerDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={[styles.triggerValue, !selectedLabel && styles.placeholderText]} numberOfLines={1}>
          {disabled ? disabledText : selectedLabel || placeholder}
        </Text>
        <ChevronDown size={20} color={disabled ? THEME.muted : THEME.teal} />
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Text style={styles.sheetSubtitle}>{items.length} option{items.length === 1 ? '' : 's'} available</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setOpen(false)} hitSlop={12}>
                <X size={18} color={THEME.text} />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Search size={18} color={THEME.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
                autoFocus={items.length > 8}
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <X size={16} color={THEME.muted} />
                </Pressable>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => selectValue(item.value)}
                    style={({ pressed }) => [styles.option, active && styles.activeOption, pressed && styles.optionPressed]}
                  >
                    <Text style={[styles.optionText, active && styles.activeOptionText]}>{item.label}</Text>
                    {active && (
                      <View style={styles.checkWrap}>
                        <Check size={15} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>{emptyText}</Text>
                  <Text style={styles.emptyCopy}>Try a different search term or refresh metadata after login.</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18, 50, 50, 0.42)' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D6E1E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },
  sheetSubtitle: { color: THEME.muted, fontSize: 12, marginTop: 2 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.background,
  },
  searchWrap: {
    height: 48,
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: THEME.text, fontSize: 15, paddingVertical: 0 },
  listContent: { paddingBottom: 28 },
  option: {
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4EEEE',
  },
  activeOption: { backgroundColor: THEME.tealLight },
  optionPressed: { backgroundColor: '#F2FAFA' },
  optionText: { flex: 1, color: THEME.text, fontSize: 15, fontWeight: '600' },
  activeOptionText: { color: THEME.tealDark, fontWeight: '800' },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.teal,
  },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 36 },
  emptyTitle: { color: THEME.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: THEME.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
});
