import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { THEME } from '../config/appConfig';

export const Stepper: React.FC<{ steps: string[]; currentStep: number; onStepPress?: (index: number) => void }> = ({ steps, currentStep, onStepPress }) => (
  <View style={styles.container}>
    <View style={styles.trackRow}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const active = stepNum === currentStep;
        const complete = stepNum < currentStep;
        const isLast = index === steps.length - 1;
        return (
          <React.Fragment key={label}>
            <Pressable onPress={() => onStepPress?.(stepNum)} style={styles.dotWrap} hitSlop={8}>
              <View style={[styles.circle, complete && styles.circleComplete, active && styles.circleActive]}>
                {complete ? (
                  <Text style={styles.checkIcon}>✓</Text>
                ) : (
                  <Text style={[styles.circleText, active && styles.circleTextActive]}>{stepNum}</Text>
                )}
              </View>
            </Pressable>
            {!isLast && <View style={[styles.connector, complete && styles.connectorDone]} />}
          </React.Fragment>
        );
      })}
    </View>
    <Text style={styles.stepLabel}>{steps[currentStep - 1]}</Text>
    <Text style={styles.stepCount}>Step {currentStep} of {steps.length}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 16, alignItems: 'center' },
  trackRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 8 },
  dotWrap: { alignItems: 'center' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleComplete: { backgroundColor: THEME.success, borderColor: THEME.success },
  circleActive: { backgroundColor: THEME.teal, borderColor: THEME.teal },
  circleText: { fontWeight: '700', color: THEME.muted, fontSize: 13 },
  circleTextActive: { color: '#fff' },
  checkIcon: { color: '#fff', fontWeight: '900', fontSize: 14 },
  connector: { flex: 1, height: 2, backgroundColor: THEME.border, marginHorizontal: 3 },
  connectorDone: { backgroundColor: THEME.success },
  stepLabel: { fontSize: 14, fontWeight: '700', color: THEME.teal, marginTop: 2 },
  stepCount: { fontSize: 12, color: THEME.muted, marginTop: 2 },
});
