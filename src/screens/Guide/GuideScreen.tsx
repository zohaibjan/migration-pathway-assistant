import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui';
import { COLORS, GRADIENTS } from '../../constants';
import {
  loadVisaCatalog,
  SEED_SNAPSHOT
} from '../../services/visaCatalog';
import type {
  VisaCatalogEntry,
  VisaCatalogFreshness,
  VisaCatalogSnapshot
} from '../../types';

export default function GuideScreen() {
  const [snapshot, setSnapshot] = useState<VisaCatalogSnapshot>(SEED_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (force: boolean) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await loadVisaCatalog({ force });
      setSnapshot(next);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh])
  );

  return (
    <LinearGradient colors={[...GRADIENTS.calm]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh(true)}
              tintColor={COLORS.indigo600}
            />
          }
        >
          <View>
            <Text style={styles.kicker}>Guide</Text>
            <Text style={styles.title}>Common visa pathways</Text>
            <Text style={styles.subtitle}>
              Plain-English summaries to help you understand where you may fit before
              getting professional advice.
            </Text>
          </View>

          <FreshnessBanner freshness={snapshot.freshness} />

          {loading && snapshot.entries.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator color={COLORS.indigo600} />
            </View>
          ) : (
            snapshot.entries.map((visa, idx) => <VisaCard key={visa.code} visa={visa} delay={idx * 60} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FreshnessBanner({ freshness }: { freshness: VisaCatalogFreshness }) {
  const meta = freshnessMeta(freshness);
  return (
    <View style={[styles.banner, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Ionicons name={meta.icon} size={16} color={meta.color} />
      <Text style={[styles.bannerText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function freshnessMeta(freshness: VisaCatalogFreshness): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  const ageDays = Math.floor((Date.now() - new Date(freshness.lastFullRefreshAt).getTime()) / (1000 * 60 * 60 * 24));
  const ageLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`;
  if (freshness.source === 'live') {
    return {
      label: `Live data - updated ${ageLabel}`,
      color: COLORS.mint600,
      bg: COLORS.mint100,
      border: COLORS.mint600,
      icon: 'cloud-done-outline'
    };
  }
  if (freshness.source === 'ai-knowledge') {
    return {
      label: `AI-generated - updated ${ageLabel}. Verify on Home Affairs.`,
      color: COLORS.amber600,
      bg: COLORS.amber100,
      border: COLORS.amber600,
      icon: 'sparkles-outline'
    };
  }
  return {
    label: `Bundled seed - last curated ${ageLabel}. Pull down to refresh.`,
    color: COLORS.indigo600,
    bg: COLORS.indigo100,
    border: COLORS.indigo600,
    icon: 'archive-outline'
  };
}

function VisaCard({ visa, delay = 0 }: { visa: VisaCatalogEntry; delay?: number }) {
  const url = visa.officialUrl
    ? visa.officialUrl
    : `https://www.google.com/search?q=${encodeURIComponent(visa.officialSearchHint ?? `Home Affairs ${visa.code}`)}`;
  const sourceBadge = sourceBadgeMeta(visa.source);
  const updated = new Date(visa.lastUpdatedAt);
  const updatedLabel = isNaN(updated.getTime())
    ? null
    : updated.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Card style={styles.card} delay={delay}>
      <View style={styles.header}>
        <View style={styles.codeBox}>
          <Text style={styles.code}>{visa.code}</Text>
        </View>
        <View style={styles.headingText}>
          <Text style={styles.name}>{visa.name}</Text>
          <Text style={styles.category}>{visa.category}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bg }]}>
          <Ionicons name={sourceBadge.icon} size={11} color={sourceBadge.color} />
          <Text style={[styles.sourceBadgeText, { color: sourceBadge.color }]}>{sourceBadge.label}</Text>
        </View>
        {updatedLabel && <Text style={styles.updatedText}>Updated {updatedLabel}</Text>}
      </View>

      <Text style={styles.summary}>{visa.summary}</Text>

      {(visa.baseFeeAud != null || visa.processingTime) && (
        <View style={styles.metaRow}>
          {visa.baseFeeAud != null && (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Base fee </Text>
              AUD {visa.baseFeeAud.toLocaleString()}
            </Text>
          )}
          {visa.processingTime && (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Processing </Text>
              {visa.processingTime}
            </Text>
          )}
        </View>
      )}

      {visa.bestFor.length > 0 && (
        <>
          <Text style={styles.label}>Usually best for</Text>
          {visa.bestFor.map(item => (
            <Text key={item} style={styles.bullet}>
              {'\u2022'} {item}
            </Text>
          ))}
        </>
      )}

      {visa.sourceNotes && (
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.slate500} />
          <Text style={styles.noteText}>{visa.sourceNotes}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { if (url.startsWith('https://')) Linking.openURL(url); }}
        style={styles.link}
      >
        <Ionicons name="open-outline" size={15} color={COLORS.indigo600} />
        <Text style={styles.linkText}>Open official information</Text>
      </TouchableOpacity>
    </Card>
  );
}

function sourceBadgeMeta(source: VisaCatalogEntry['source']): {
  label: string;
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (source === 'live') {
    return {
      label: 'Live',
      color: COLORS.mint600,
      bg: COLORS.mint100,
      icon: 'cloud-done'
    };
  }
  if (source === 'ai-knowledge') {
    return {
      label: 'AI',
      color: COLORS.amber600,
      bg: COLORS.amber100,
      icon: 'sparkles'
    };
  }
  return {
    label: 'Seed',
    color: COLORS.indigo600,
    bg: COLORS.indigo100,
    icon: 'archive'
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingBottom: 110, gap: 14 },
  kicker: {
    color: COLORS.indigo500,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 12
  },
  title: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 30,
    marginTop: 4
  },
  subtitle: {
    color: COLORS.slate600,
    marginTop: 8,
    lineHeight: 21
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1
  },
  bannerText: { fontWeight: '800', fontSize: 13, flex: 1 },
  card: { gap: 10 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  codeBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.indigo100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  code: { color: COLORS.indigo600, fontWeight: '900' },
  headingText: { flex: 1 },
  name: { color: COLORS.slate900, fontWeight: '900', fontSize: 17 },
  category: { color: COLORS.slate500, marginTop: 2 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '900' },
  updatedText: { color: COLORS.slate500, fontSize: 11, fontWeight: '700' },
  summary: { color: COLORS.slate700, lineHeight: 21 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 2
  },
  metaItem: {
    color: COLORS.slate900,
    fontWeight: '700',
    fontSize: 13
  },
  metaLabel: {
    color: COLORS.slate500,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase'
  },
  label: { color: COLORS.slate900, fontWeight: '900', marginTop: 4 },
  bullet: { color: COLORS.slate700, lineHeight: 20 },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.slate100,
    borderRadius: 12,
    padding: 10,
    marginTop: 4
  },
  noteText: { flex: 1, color: COLORS.slate500, fontSize: 12, lineHeight: 17 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6
  },
  linkText: { color: COLORS.indigo600, fontWeight: '900' },
  loading: { alignItems: 'center', paddingVertical: 24 }
});
