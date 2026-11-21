import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors } from '@/theme/tokens';

import {
  decorSpot,
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
            <Circle cx={50} cy={48} r={22} fill={colors.sun} />
            <Circle
              cx={50}
              cy={48}
              r={30}
              fill="none"
              stroke={colors.sun}
              strokeWidth={3}
              strokeDasharray="3 9"
            />
            {anchors.map((point, index) =>
              index % 3 === 0 ? (
                <Ellipse
                  key={`hill-${index}`}
                  cx={index % 2 === 0 ? 24 : width - 10}
                  cy={point.y + 30}
                  rx={86}
                  ry={42}
                  fill={colors.hill}
                />
              ) : null,
            )}
            <Path
              d={track}
              stroke={colors.road}
              strokeWidth={26}
              fill="none"
              strokeLinecap="round"
            />
            {walked ? (
              <Path
                d={walked}
                stroke={colors.roadDone}
                strokeWidth={26}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}
            <Path
              d={track}
              stroke={colors.surface}
              strokeWidth={3}
              strokeDasharray="2 12"
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
        {decorSpots(nodes).map((spot, motif) => {
          const from = anchors[spot];
          const to = anchors[spot + 1];
          if (!from || !to) return null;
          const { left, top } = decorSpot(from, to, width);
          return <PathDecor key={`decor-${spot}`} motif={motif} left={left} top={top} />;
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
            width={width}
            line={line}
            reduceMotion={reduceMotion}
            jumpToken={jumpToken}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One street piece at each module start and then every third step. */
function decorSpots(nodes: readonly PathNode[]): number[] {
  const seen = new Set<string>();
  const spots: number[] = [];
  nodes.forEach((node, index) => {
    const firstOfModule = !seen.has(node.moduleId);
    seen.add(node.moduleId);
    if (firstOfModule || index % 3 === 1) spots.push(index);
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
