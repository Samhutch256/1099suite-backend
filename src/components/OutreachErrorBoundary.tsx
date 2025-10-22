import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class OutreachErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Outreach Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-gray-900 justify-center items-center px-6">
          <View className="bg-red-600/20 border border-red-600 rounded-lg p-6 max-w-sm">
            <View className="items-center mb-4">
              <Ionicons name="warning" size={48} color="#ef4444" />
              <Text className="text-white text-xl font-bold mt-2">
                Outreach Error
              </Text>
            </View>
            
            <Text className="text-gray-300 text-center mb-4">
              Something went wrong with the outreach tracking. Please try again.
            </Text>
            
            {this.state.error && (
              <Text className="text-red-400 text-sm text-center mb-4">
                {this.state.error.message}
              </Text>
            )}
            
            <Pressable
              onPress={this.handleReset}
              className="bg-orange-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}