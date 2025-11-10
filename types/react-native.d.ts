// 为react-native-tvos提供类型声明
declare module 'react-native-tvos' {
  // 导出所有标准React Native类型
  export * from 'react-native';
  
  // 扩展Platform API以包含TV特定的属性
  namespace Platform {
    export const isTV: boolean;
    export const isTVOS: boolean;
    export const isAndroidTV: boolean;
  }
  
  // 扩展Dimensions API
  export const Dimensions: {
    get(dim: string): { width: number; height: number; scale: number; fontScale: number };
    addEventListener(type: 'change', handler: (event: { window: { width: number; height: number } }) => void): {
      remove: () => void;
    };
  };
  
  // 导出PixelRatio API
  export const PixelRatio: {
    get(): number;
  };
}

// 确保react-native模块正确引用react-native-tvos
declare module 'react-native' {
  export * from 'react-native-tvos';
  
  // 确保Platform接口扩展包含TV特定属性
  namespace Platform {
    export const isTV: boolean;
    export const isTVOS: boolean;
    export const isAndroidTV: boolean;
  }
}
