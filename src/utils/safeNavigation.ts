import { NavigationProp } from '@react-navigation/native';

export const safeNavigationCall = (
  navigationAction: () => void,
  fallback?: () => void
) => {
  try {
    navigationAction();
  } catch (error) {
    console.log('Navigation error caught:', error);
    if (fallback) {
      fallback();
    }
  }
};

export const safeNavigate = (
  navigation: NavigationProp<any> | undefined,
  screenName: string,
  params?: any
) => {
  if (!navigation) {
    console.log('Navigation not available');
    return;
  }
  
  try {
    navigation.navigate(screenName as never, params as never);
  } catch (error) {
    console.log('Navigation error:', error);
  }
};

export const safeGoBack = (navigation: NavigationProp<any> | undefined) => {
  if (!navigation) {
    console.log('Navigation not available');
    return;
  }
  
  try {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  } catch (error) {
    console.log('Go back error:', error);
  }
};