import { useWindowDimensions, Platform } from 'react-native';

export function useScale(): number {
  const {width} = useWindowDimensions();
  // 使用类型断言确保Platform.isTV在TypeScript中可用
  return (Platform as any).isTV ? width / 1000 : 1;
}
