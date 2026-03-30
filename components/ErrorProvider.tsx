import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTVRemoteHandler } from 'react-native-tvos';

interface ErrorContextType {
  showError: (message: string, details?: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorState {
  visible: boolean;
  message: string;
  details?: string;
  type: 'error' | 'success' | 'warning';
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errorState, setErrorState] = useState<ErrorState>({
    visible: false,
    message: '',
    type: 'error',
  });

  const showError = useCallback((message: string, details?: string) => {
    setErrorState({ visible: true, message, details, type: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setErrorState({ visible: true, message, type: 'success' });
  }, []);

  const showWarning = useCallback((message: string) => {
    setErrorState({ visible: true, message, type: 'warning' });
  }, []);

  const clearError = useCallback(() => {
    setErrorState(prev => ({ ...prev, visible: false }));
  }, []);

  const value = {
    showError,
    showSuccess,
    showWarning,
    clearError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ErrorModal
        visible={errorState.visible}
        message={errorState.message}
        details={errorState.details}
        type={errorState.type}
        onClose={clearError}
      />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}

interface ErrorModalProps {
  visible: boolean;
  message: string;
  details?: string;
  type: 'error' | 'success' | 'warning';
  onClose: () => void;
}

function ErrorModal({ visible, message, details, type, onClose }: ErrorModalProps) {
  useTVEventHandler((event: any) => {
    if (event.eventType === 'select' || event.eventType === 'back') {
      onClose();
    }
  });

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
      default:
        return '✕';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(0, 200, 83, 0.1)';
      case 'warning':
        return 'rgba(255, 160, 0, 0.1)';
      case 'error':
      default:
        return 'rgba(255, 82, 82, 0.1)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#00C853';
      case 'warning':
        return '#FFA000';
      case 'error':
      default:
        return '#FF5252';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() }
        ]}>
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: getBorderColor() }]}>
              {getIcon()}
            </Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          {details && (
            <Text style={styles.details}>{details}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: getBorderColor() }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>确定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 48,
    width: '100%',
    maxWidth: 700,
    borderWidth: 2,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  message: {
    color: '#fff',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  details: {
    color: '#999',
    fontSize: 29,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 40,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 64,
    borderRadius: 12,
    minWidth: 280,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 35,
    fontWeight: 'bold',
  },
});
