import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { authenticateBiometric, isBiometricAvailable, validateUPIPin } from '@/utils/security';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PINInputProps {
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  length?: number;
}

export default function PINInput({ onSuccess, onCancel, title = 'Enter UPI PIN', length = 6 }: PINInputProps) {
  const [pin, setPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const cardColor = useThemeColor({}, 'card');

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
    if (available) {
      handleBiometricAuth();
    }
  };

  const handleBiometricAuth = async () => {
    const success = await authenticateBiometric('Authenticate to confirm payment');
    if (success) {
      onSuccess('BIOMETRIC_AUTH');
    }
  };

  const handleSubmit = () => {
    if (pin.length >= 4 && validateUPIPin(pin)) {
      onSuccess(pin);
    } else {
      Alert.alert('Invalid PIN', 'Please enter a valid 4-6 digit UPI PIN');
    }
  };

  const handleNumberPress = (num: string) => {
    if (pin.length < length) {
      const newPin = pin + num;
      setPin(newPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinContainer}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              { borderColor: placeholderColor },
              index < pin.length && { backgroundColor: primaryColor, borderColor: primaryColor },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'submit'];

    return (
      <View style={styles.keypad}>
        {keys.map((key, index) => {
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.key,
                { backgroundColor: inputBackgroundColor },
                key === 'submit' && { backgroundColor: successColor },
                key === 'submit' && pin.length < 4 && { backgroundColor: placeholderColor }
              ]}
              onPress={() => {
                if (key === 'del') {
                  handleDelete();
                } else if (key === 'submit') {
                  handleSubmit();
                } else {
                  handleNumberPress(key);
                }
              }}
              disabled={key === 'submit' && pin.length < 4}
            >
              {key === 'del' ? (
                <IconSymbol name="delete.left" size={24} color={textColor} />
              ) : key === 'submit' ? (
                <IconSymbol name="checkmark" size={28} color="#fff" />
              ) : (
                <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <IconSymbol name="xmark" size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.title}>{title}</ThemedText>
      {renderPinDots()}
      {renderKeypad()}

      <View style={styles.footerActions}>
        {biometricAvailable && (
          <TouchableOpacity style={styles.bioButton} onPress={handleBiometricAuth}>
            <IconSymbol name="faceid" size={24} color={primaryColor} />
            <Text style={[styles.bioText, { color: primaryColor }]}>Use Biometric</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.forgotButton}>
          <Text style={[styles.forgotText, { color: primaryColor }]}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  key: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  footerActions: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  bioText: {
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
  },
});
