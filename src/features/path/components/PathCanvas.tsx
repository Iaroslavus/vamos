import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors } from '@/theme/tokens';

import {
  doneTrack,
  mapHeight,
  moduleAtScroll,
  nodeAnchor,
  scrollOffsetForNode,
  smoothPath,
} from '../layout';
import type { PathNode } from '../map';
import { MapHero } from './MapHero';
import { PathDecor } from './PathDecor';
import { PathNodeButton } from './PathNodeButton';

type PathCanvasProps = {
  nodes: readonly PathNode[];
  titles: ReadonlyMap<string, string>;
  selectedId: string | null;
  line: string;
  jumpToken: number;
  onSelect: (id: string) => void;
  onModuleChange: (moduleId: string) => void;
};

export function PathCanvas({
  nodes,
  titles,
  selectedId,
  line,
  jumpToken,
  onSelect,
  onModuleChange,
}: PathCanvasProps) {
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const didScroll = useRef(false);
  const [viewport, setViewport] = useState(0);
  const height = mapHeight(nodes.length);
  const anchors = useMemo(
    () => nodes.map((_, index) => nodeAnchor(index, nodes.length, width)),
    [nodes, width],
  );
  const track = useMemo(() => smoothPath(anchors), [anchors]);
  const walked = useMemo(
    () =>
      doneTrack(
        anchors,
        nodes.map((node) => node.status),
      ),
    [anchors, nodes],
  );
  const selectedIndex = Math.max(
    0,
    nodes.findIndex((node) => node.id === selectedId),
  );
  const hero = anchors[selectedIndex] ?? anchors[0];

  useEffect(() => {
    if (didScroll.current || width <= 0 || viewport <= 0 || nodes.length === 0) return;
    const current = nodes.find((node) => node.status === 'current') ?? nodes[nodes.length - 1];
    if (!current) return;
    const index = nodes.indexOf(current);
    const point = anchors[index];
    if (!point) return;
    const offset = scrollOffsetForNode(point.y, viewport);
    scrollRef.current?.scrollTo({ y: offset, animated: false });
    const moduleId = moduleAtScroll(
      nodes.map((node, index) => ({
        moduleId: node.moduleId,
        y: anchors[index]?.y ?? 0,
      })),
      offset,
      viewport,
    );
    if (moduleId) onModuleChange(moduleId);
    didScroll.current = true;
  }, [anchors, nodes, onModuleChange, viewport, width]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
      onScroll={(event) => {
        const moduleId = moduleAtScroll(
          nodes.map((node, index) => ({
            moduleId: node.moduleId,
            y: anchors[index]?.y ?? 0,
          })),
          event.nativeEvent.contentOffset.y,
          event.nativeEvent.layoutMeasurement.height,
        );
        if (moduleId) onModuleChange(moduleId);
      }}
    >
      <View style={{ height, width }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={width} height={height}>
            <Path
              d={track}
              stroke={colors.borderStrong}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
            />
            {walked ? (
              <Path
                d={walked}
                stroke={colors.teal}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}
          </Svg>
        </View>
        {decorSpots(nodes).map((spot, motif) => {
          const point = anchors[spot];
          if (!point) return null;
          const left = point.x > width / 2 ? point.x - 112 : point.x + 28;
          return (
            <PathDecor key={nodes[spot]?.moduleId} motif={motif} left={left} top={point.y - 28} />
          );
        })}
        {nodes.map((node, index) => {
          const point = anchors[index];
          if (!point) return null;
          return (
            <PathNodeButton
              key={node.id}
              node={node}
              title={titles.get(node.id) ?? node.id}
              x={point.x}
              y={point.y}
              selected={node.id === selectedId}
              onPress={() => onSelect(node.id)}
            />
          );
        })}
        {hero ? (
          <MapHero
            x={hero.x}
            y={hero.y}
            line={line}
            reduceMotion={reduceMotion}
            jumpToken={jumpToken}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function decorSpots(nodes: readonly PathNode[]): number[] {
  const seen = new Set<string>();
  const spots: number[] = [];
  nodes.forEach((node, index) => {
    if (seen.has(node.moduleId)) return;
    seen.add(node.moduleId);
    spots.push(index);
  });
  return spots;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 8,
  },
});
