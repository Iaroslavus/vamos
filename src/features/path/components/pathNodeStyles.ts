import { StyleSheet } from 'react-native';

import { colors, depth, radius, space } from '@/theme/tokens';

export const NODE_SIZE = 64;

export const pathNodeStyles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: NODE_SIZE + depth.node + space.lg,
    marginVertical: space.md,
  },
  alignLeft: {
    justifyContent: 'flex-start',
    paddingLeft: '12%',
  },
  alignRight: {
    justifyContent: 'flex-end',
    paddingRight: '12%',
    flexDirection: 'row-reverse',
  },
  nodeWrap: {
    width: NODE_SIZE + 18,
    height: NODE_SIZE + 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ring: {
    position: 'absolute',
    width: NODE_SIZE + 16,
    height: NODE_SIZE + 16,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  ringStatic: {
    opacity: 0.45,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE + depth.node,
  },
  sole: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: NODE_SIZE,
    borderRadius: radius.pill,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: NODE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: depth.node }],
  },
  label: {
    flexShrink: 1,
    maxWidth: 140,
    marginHorizontal: space.md,
  },
  labelRight: {
    textAlign: 'left',
  },
  labelLeft: {
    textAlign: 'right',
  },
});
