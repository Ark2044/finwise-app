import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  vpa: string;
  upiPin: string;
  confirmUpiPin: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  vpa?: string;
  upiPin?: string;
  confirmUpiPin?: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    vpa: '',
    upiPin: '',
    confirmUpiPin: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase and number';
    }

        // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // VPA validation
    if (!formData.vpa.trim()) {
      newErrors.vpa = 'VPA is required';
    } else if (!/^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}$/.test(formData.vpa)) {
      newErrors.vpa = 'Invalid VPA format (e.g. name@upi)';
    }

    // UPI PIN validation
    if (!formData.upiPin) {
      newErrors.upiPin = 'UPI PIN is required';
    } else if (!/^\d{4,6}$/.test(formData.upiPin)) {
      newErrors.upiPin = 'PIN must be 4-6 digits';
    }

    // Confirm UPI PIN validation
    if (!formData.confirmUpiPin) {
      newErrors.confirmUpiPin = 'Please confirm your PIN';
    } else if (formData.upiPin !== formData.confirmUpiPin) {
      newErrors.confirmUpiPin = 'PINs do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await register({
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      password: formData.password,
      vpa: formData.vpa.toLowerCase().trim(),
      upiPin: formData.upiPin,
    });

    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Account Created!', 
        'Your account has been successfully created.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={primaryColor} />
            <Text style={[styles.backText, { color: primaryColor }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Join FinWise for secure payments</ThemedText>
          </View>

          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.name && { borderColor: errorColor }
              ]}>
                <IconSymbol name="person.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="John Doe"
                  placeholderTextColor={placeholderColor}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  autoCapitalize="words"
                />
              </View>
              {errors.name && <Text style={[styles.errorText, { color: errorColor }]}>{errors.name}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.email && { borderColor: errorColor }
              ]}>
                <IconSymbol name="envelope.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="john@example.com"
                  placeholderTextColor={placeholderColor}
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: errorColor }]}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.password && { borderColor: errorColor }
              ]}>
                <IconSymbol name="lock.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Min 8 chars, upper, lower, number"
                  placeholderTextColor={placeholderColor}
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <IconSymbol
                    name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    size={20}
                    color={iconColor}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: errorColor }]}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.confirmPassword && { borderColor: errorColor }
              ]}>
                <IconSymbol name="lock.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={placeholderColor}
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField('confirmPassword', text)}
                  secureTextEntry={!showPassword}
                />
              </View>
              {errors.confirmPassword && <Text style={[styles.errorText, { color: errorColor }]}>{errors.confirmPassword}</Text>}
            </View>

            {/* VPA Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>UPI ID (VPA)</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.vpa && { borderColor: errorColor }
              ]}>
                <IconSymbol name="at" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="username@finwise"
                  placeholderTextColor={placeholderColor}
                  value={formData.vpa}
                  onChangeText={(text) => updateField('vpa', text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.vpa && <Text style={[styles.errorText, { color: errorColor }]}>{errors.vpa}</Text>}
            </View>

            {/* UPI PIN Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Set UPI PIN</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.upiPin && { borderColor: errorColor }
              ]}>
                <IconSymbol name="lock.shield.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="4-6 digit PIN"
                  placeholderTextColor={placeholderColor}
                  value={formData.upiPin}
                  onChangeText={(text) => updateField('upiPin', text)}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeButton}>
                  <IconSymbol
                    name={showPin ? 'eye.slash.fill' : 'eye.fill'}
                    size={20}
                    color={iconColor}
                  />
                </TouchableOpacity>
              </View>
              {errors.upiPin && <Text style={[styles.errorText, { color: errorColor }]}>{errors.upiPin}</Text>}
            </View>

            {/* Confirm UPI PIN Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Confirm UPI PIN</ThemedText>
              <View style={[
                styles.inputContainer, 
                { backgroundColor: inputBackgroundColor, borderColor: borderColor },
                errors.confirmUpiPin && { borderColor: errorColor }
              ]}>
                <IconSymbol name="lock.shield.fill" size={20} color={iconColor} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Re-enter PIN"
                  placeholderTextColor={placeholderColor}
                  value={formData.confirmUpiPin}
                  onChangeText={(text) => updateField('confirmUpiPin', text)}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
              </View>
              {errors.confirmUpiPin && <Text style={[styles.errorText, { color: errorColor }]}>{errors.confirmUpiPin}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: primaryColor }, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, { backgroundColor: inputBackgroundColor }]}>
            <IconSymbol name="info.circle.fill" size={20} color={primaryColor} />
            <Text style={[styles.infoText, { color: textColor }]}>
              Your UPI ID (VPA) and PIN are used for secure transactions. Keep them safe.
            </Text>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={[styles.loginLink, { color: primaryColor }]}>Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: placeholderColor }]}>
              By creating an account, you agree to our{' '}
              <Text style={[styles.termsLink, { color: primaryColor }]}>Terms of Service</Text> and{' '}
              <Text style={[styles.termsLink, { color: primaryColor }]}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputError: {
    // handled inline
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 122, 255, 0.3)',
      },
      default: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  termsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    // handled inline
  },
});
