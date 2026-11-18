import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  userAgentModel: string;
}

function computeDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 1200,
      screenHeight: 800,
      orientation: 'landscape',
      userAgentModel: 'Desktop Browser',
    };
  }

  const width = window.innerWidth || document.documentElement.clientWidth || 360;
  const height = window.innerHeight || document.documentElement.clientHeight || 640;
  const ua = navigator.userAgent || '';

  // Detección por User-Agent y Media Query
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let deviceType: DeviceType = 'desktop';
  if (width < 768 || (isMobileUA && width < 1024)) {
    deviceType = 'mobile';
  } else if (width < 1024 || isTabletUA) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  let userAgentModel = 'Computadora / Escritorio';
  if (/iPhone/i.test(ua)) userAgentModel = 'Apple iPhone';
  else if (/iPad/i.test(ua)) userAgentModel = 'Apple iPad';
  else if (/Android/i.test(ua)) userAgentModel = 'Dispositivo Android';
  else if (deviceType === 'tablet') userAgentModel = 'Tablet';
  else if (deviceType === 'mobile') userAgentModel = 'Celular Móvil';

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    screenWidth: width,
    screenHeight: height,
    orientation: width > height ? 'landscape' : 'portrait',
    userAgentModel,
  };
}

export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(computeDeviceInfo);

  useEffect(() => {
    const applyClasses = (info: DeviceInfo) => {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        const body = document.body;
        ['device-mobile', 'device-tablet', 'device-desktop'].forEach((cls) => {
          root.classList.remove(cls);
          body.classList.remove(cls);
        });
        root.classList.add(`device-${info.deviceType}`);
        body.classList.add(`device-${info.deviceType}`);
      }
    };

    const handleResize = () => {
      const nextInfo = computeDeviceInfo();
      setDeviceInfo(nextInfo);
      applyClasses(nextInfo);
    };

    applyClasses(deviceInfo);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
