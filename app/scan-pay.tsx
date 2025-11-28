import QRScanner from '@/components/payment/QRScanner';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';

export default function ScanPayScreen() {
  const [showScanner, setShowScanner] = useState(true);

  const handleScanSuccess = (qrData: any) => {
    setShowScanner(false);
    
    // Navigate to payment confirmation with enhanced QR data
    router.push({
      pathname: '/payment-confirm',
      params: {
        receiverVPA: qrData.pa,
        receiverName: qrData.pn,
        amount: qrData.am || '',
        note: qrData.tn || '',
        mcc: qrData.mcc || '',
        category: qrData.category || '',
        merchantType: qrData.merchantType || '',
      },
    });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
        <QRScanner onScanSuccess={handleScanSuccess} onClose={handleClose} />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
