import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scale = SCREEN_WIDTH / 390;

export const normalize = (size: number): number => {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const wp = (percentage: number): number =>
  (SCREEN_WIDTH * percentage) / 100;

export const hp = (percentage: number): number =>
  (SCREEN_HEIGHT * percentage) / 100;

export const isSmallScreen = SCREEN_WIDTH < 375;
export const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeScreen = SCREEN_WIDTH >= 414;
