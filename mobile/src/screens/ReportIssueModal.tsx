import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../services/api';

interface ReportIssueModalProps {
  visible: boolean;
  pickupId: string | null;
  onClose: () => void;
  onReported: () => void;
}

const ISSUE_OPTIONS = [
  { id: 'temperature_breach', label: '🌡️ Temperature Violation (<60°C or >5°C)' },
  { id: 'delay', label: '⏱️ Traffic / Route Delay' },
  { id: 'donor_closed', label: '🚪 Donor Facility Closed / Unresponsive' },
  { id: 'recipient_refused', label: '🛑 Recipient NGO Refused / Unavailable' },
  { id: 'quantity_mismatch', label: '⚖️ Quantity / Portion Mismatch' },
  { id: 'vehicle_breakdown', label: '🚲 Vehicle / Carrier Problem' },
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  visible,
  pickupId,
  onClose,
  onReported,
}) => {
  const [selectedType, setSelectedType] = useState('temperature_breach');
  const [tempC, setTempC] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!pickupId) return null;

  const handleSubmit = async () => {
    if (!notes.trim()) {
      Alert.alert('Details Required', 'Please enter a brief note describing the situation.');
      return;
    }

    setLoading(true);
    try {
      const parsedTemp = tempC ? parseFloat(tempC) : undefined;
      const success = await api.reportIssue(pickupId, selectedType, notes.trim(), parsedTemp);

      if (success) {
        if (selectedType === 'temperature_breach' && parsedTemp && parsedTemp < 60) {
          Alert.alert(
            'Safety Hold Triggered ⚠️',
            'Temperature was recorded below safety compliance (<60°C). Food has been placed on Safety Hold and dispatch coordinators have been alerted.',
            [{ text: 'Acknowledged', onPress: onReported }]
          );
        } else {
          Alert.alert(
            'Incident Logged',
            'Your report has been logged. Dispatch coordinators and stakeholders have been notified.',
            [{ text: 'OK', onPress: onReported }]
          );
        }
        onClose();
      } else {
        Alert.alert('Error', 'Could not record incident report. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error submitting report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.subtitle}>SAFETY & EXCEPTION DISPATCH</Text>
                <Text style={styles.title}>Report Route Incident</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              Select the issue type. Critical food safety breaches trigger an immediate safety hold.
            </Text>

            {/* Issue Selector */}
            <View style={styles.optionsContainer}>
              {ISSUE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionRow, isSelected && styles.optionSelected]}
                    onPress={() => setSelectedType(opt.id)}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Temperature for safety violations */}
            {selectedType === 'temperature_breach' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Recorded Food Temperature (°C)
                </Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={tempC}
                  onChangeText={setTempC}
                  placeholder="e.g. 52.5"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.tempWarning}>
                  ⚠️ Hot holding below 60°C triggers immediate food safety hold.
                </Text>
              </View>
            ) : null}

            {/* Incident Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Incident Description & Details <Text style={styles.star}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="Explain the circumstance (e.g. traffic accident on 4th Ave, container temperature dropped below 60C upon pickup)..."
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Incident Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  helpText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#FAF9F8',
    gap: 12,
  },
  optionSelected: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.danger,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  optionLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelActive: {
    fontWeight: '700',
    color: colors.danger,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  star: {
    color: colors.danger,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  tempWarning: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.danger,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
