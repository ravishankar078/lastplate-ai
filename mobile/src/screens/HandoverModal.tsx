import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { RouteStop } from '../types';
import { api } from '../services/api';

interface HandoverModalProps {
  visible: boolean;
  stop: RouteStop | null;
  onClose: () => void;
  onVerified: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  visible,
  stop,
  onClose,
  onVerified,
}) => {
  const [pin, setPin] = useState('');
  const [tempC, setTempC] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible && stop) {
      setPin(stop.verification_pin || '');
      setTempC(stop.storage_condition.includes('hot') ? '65.5' : stop.storage_condition.includes('chill') ? '4.0' : '');
      setErrorMsg('');
    }
  }, [visible, stop]);

  if (!stop) return null;

  const isPickup = stop.stop_type === 'pickup';
  const isHot = stop.storage_condition.includes('hot');
  const isChilled = stop.storage_condition.includes('chill');

  const handleSubmit = async () => {
    if (!pin || pin.length < 4) {
      setErrorMsg('Please enter the 6-digit confirmation PIN.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const parsedTemp = tempC ? parseFloat(tempC) : undefined;
      const res = await api.verifyHandover(stop.id, stop.pickup_id, pin.trim(), parsedTemp);

      if (res.success) {
        Alert.alert(
          'Handover Authenticated! ✅',
          isPickup
            ? `Food collected from ${stop.organization_name}. Proceeding to delivery.`
            : `Food successfully delivered to ${stop.organization_name}! Thank you for your service.`,
          [{ text: 'Continue', onPress: onVerified }]
        );
        onClose();
      } else {
        setErrorMsg(res.message || 'Verification failed. Please check the code with staff.');
      }
    } catch {
      setErrorMsg('Network error verifying handover.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>
                {isPickup ? 'STEP 1: COLLECTION VERIFICATION' : 'STEP 2: DELIVERY CONFIRMATION'}
              </Text>
              <Text style={styles.title}>{stop.organization_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SOP Instruction Card */}
          <View style={styles.sopCard}>
            <Text style={styles.sopTitle}>🛡️ Handover SOP & Safety Protocol</Text>
            <Text style={styles.sopText}>{stop.food_safety_instructions}</Text>
            <View style={styles.sopDetailsRow}>
              <Text style={styles.sopDetail}>
                Portions: <Text style={styles.sopBold}>{stop.portions}</Text>
              </Text>
              <Text style={styles.sopDetail}>
                Weight: <Text style={styles.sopBold}>{stop.quantity_kg} kg</Text>
              </Text>
            </View>
          </View>

          {/* Temperature Check (Food Safety) */}
          {(isHot || isChilled) && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Measured Food Temperature (°C)
                <Text style={styles.requiredStar}> *</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={tempC}
                onChangeText={setTempC}
                placeholder={isHot ? 'e.g. 64.0 (≥60°C required)' : 'e.g. 4.0 (≤5°C required)'}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.inputHelp}>
                {isHot
                  ? 'Hot holding mandate: Temp must be ≥ 60°C.'
                  : 'Chilled chain mandate: Temp must be ≤ 5°C.'}
              </Text>
            </View>
          )}

          {/* 6-Digit PIN Entry */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              6-Digit Handover PIN Code
              <Text style={styles.requiredStar}> *</Text>
            </Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={6}
              value={pin}
              onChangeText={(val) => {
                setPin(val);
                setErrorMsg('');
              }}
              placeholder="749216"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.inputHelp}>
              Ask {isPickup ? 'donor kitchen staff' : 'NGO intake coordinator'} for their single-use PIN.
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Submit Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
                <Text style={styles.submitBtnText}>
                  {isPickup ? 'Authenticate Collection' : 'Authenticate Delivery'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
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
  sopCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D2E3D8',
  },
  sopTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  sopText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  sopDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#C4DCD0',
  },
  sopDetail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sopBold: {
    fontWeight: '800',
    color: colors.text,
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
  requiredStar: {
    color: colors.danger,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  pinInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 6,
  },
  inputHelp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: colors.dangerSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    backgroundColor: colors.primary,
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
