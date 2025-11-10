import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IconName = 'heart' | 'search' | 'settings' | 'menu' | 'close' | 'chevron-right';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#FFFFFF', 
  style 
}) => {
  // 将我们的图标名称映射到Ionicons的图标名称
  const iconMap: Record<IconName, string> = {
    'heart': 'heart',
    'search': 'search',
    'settings': 'settings',
    'menu': 'menu',
    'close': 'close',
    'chevron-right': 'chevron-forward'
  };

  return (
    <Ionicons 
      name={iconMap[name] as any} 
      size={size} 
      color={color} 
      style={style} 
    />
  );
};

export default Icon;