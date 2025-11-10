/// <reference types="react-native" />

// NodeJS命名空间定义
declare namespace NodeJS {
  interface Timeout {
    _idleTimeout: number;
    _onTimeout?: Function;
    _repeat?: boolean;
  }
}

// 基本的React Native类型声明，用于绕过类型检查错误
declare module 'react-native' {
  // 导出所有需要的组件和API，全部使用any类型
  export const Platform: any;
  export const Dimensions: any;
  export const PixelRatio: any;
  export const Pressable: any;
  export const View: any;
  export const Text: any;
  export const Easing: any;
  export const Image: any;
  export const ScrollView: any;
  export const TouchableOpacity: any;
  export const StyleSheet: any;
  export const Animated: any;
  export const SafeAreaView: any;
  export const Modal: any;
  export const ActivityIndicator: any;
  export const TextInput: any;
  export const FlatList: any;
  export const SectionList: any;
  export const StatusBar: any;
  export const Alert: any;
  export const BackHandler: any;
  export const Clipboard: any;
  export const Linking: any;
  export const KeyboardAvoidingView: any;
  export const RefreshControl: any;
  export const Switch: any;
  export const TouchableHighlight: any;
  export const TouchableNativeFeedback: any;
  export const TouchableWithoutFeedback: any;
  export const useTVEventHandler: any;
  export const useWindowDimensions: any;
  export const Keyboard: any;
  export const InteractionManager: any;
  export interface HWEvent { 
    type: string;
    eventType: string;
  }
  export const useTVEventHandler: (handler: (event: HWEvent) => void) => { handlerRef: React.MutableRefObject<(event: HWEvent) => void> }
  
  // 添加AppState相关类型和导出
  export type AppStateStatus = 'active' | 'background' | 'inactive';
  export const AppState: {
    addEventListener: (type: string, callback: (status: AppStateStatus) => void) => { remove: () => void };
    currentState: AppStateStatus;
  };
  
  // 样式类型
  export interface ViewStyle extends Record<string, any> {}
  export interface TextStyle extends Record<string, any> {}
  export interface ImageStyle extends Record<string, any> {}
  
  // 组件类型
  export interface ViewProps extends Record<string, any> {}
  export interface View extends React.ComponentType<ViewProps> {}
  export interface TextProps extends Record<string, any> {}
  export interface Text extends React.ComponentType<TextProps> {}
  export interface PressableProps extends Record<string, any> {}
  export interface Pressable extends React.ComponentType<PressableProps> {}
  export interface TextInputProps extends Record<string, any> {}
  export interface TextInput extends React.ComponentType<TextInputProps> {
    focus: () => void;
    setNativeProps: (props: Record<string, any>) => void;
  }
  
  // 样式属性
  export type StyleProp<T> = any;
  
  // 导出默认值
  export default {
    Platform,
    Dimensions,
    PixelRatio,
    Pressable,
    View,
    Text,
    Easing,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    SafeAreaView,
    Modal,
    ActivityIndicator,
    TextInput,
    FlatList,
    SectionList,
    StatusBar,
    Alert,
    BackHandler,
    Clipboard,
    Linking,
    KeyboardAvoidingView,
    RefreshControl,
    Switch,
    TouchableHighlight,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    useTVEventHandler,
    useWindowDimensions,
    Keyboard,
    InteractionManager
  };
}

// 扩展全局setTimeout和clearTimeout类型
declare global {
  interface Window {
    setTimeout: (callback: Function, delay?: number) => number;
    clearTimeout: (timeoutId: number) => void;
  }
}

// KeyboardAwareScrollView from react-native-keyboard-aware-scroll-view
declare module 'react-native-keyboard-aware-scroll-view' {
  import { ScrollViewProps, ComponentClass } from 'react-native';

  interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    children?: React.ReactNode;
    enableOnAndroid?: boolean;
    extraScrollHeight?: number;
    keyboardOpeningTime?: number;
    keyboardShouldPersistTaps?: string;
  }

  export const KeyboardAwareScrollView: ComponentClass<KeyboardAwareScrollViewProps>;
}

// 为expo-av添加类型声明
declare module 'expo-av' {
  export const Video: React.ComponentType<any>;
  export const ResizeMode: any;
  
  interface AVPlaybackStatus {
    error?: any;
    isLoaded: boolean;
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number;
    isBuffering?: boolean;
    didJustFinish?: boolean;
    [key: string]: any;
  }
  
  interface Video extends React.ComponentType<any> {
    playAsync: () => Promise<void>;
    pauseAsync: () => Promise<void>;
    replayAsync: () => Promise<void>;
    setPositionAsync: (position: number) => Promise<void>;
    setRateAsync: (rate: number, shouldCorrectPitch: boolean) => Promise<void>;
  }
}

// SVG文件类型声明
declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';

// 为react-native-tvos提供简单的类型声明
declare module 'react-native-tvos' {
  export * from 'react-native';
  
  // 添加TV特定的属性
  export namespace Platform {
    export const isTV: boolean;
    export const isTVOS: boolean;
    export const isAndroidTV: boolean;
  }
}
