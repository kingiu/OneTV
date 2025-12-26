import { useRef } from 'react';

// 定义遥控器事件类型
interface RemoteEvent {
  eventType: string;
  eventKeyAction?: number;
}

/**
 * 安全的TV遥控器事件处理hook
 * 在所有设备上都返回一个空对象，避免调用不存在的useTVEventHandler导致运行时错误
 * @param handler - 遥控器事件处理函数
 */
export const useSafeTVEventHandler = (handler: (event: RemoteEvent) => void) => {
  // 模拟的handlerRef，用于保持API兼容性
  const handlerRef = useRef(handler);
  
  // 更新handlerRef.current当handler变化时
  handlerRef.current = handler;
  
  // 返回与useTVEventHandler相同的API结构，确保兼容性
  return { handlerRef };
};
