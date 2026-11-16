import { useWindowDimensions } from 'react-native';
import { layout } from './tokens';

/** Tela larga (≥ 1024px) usa sidebar; abaixo disso, abas embaixo e alvos de toque maiores. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= layout.wide;
  return {
    width,
    height,
    wide,
    mobile: !wide,
    pad: wide ? layout.pagePadDesktop : layout.pagePadMobile,
    control: wide ? layout.controlDesktop : layout.touch,
  };
}
