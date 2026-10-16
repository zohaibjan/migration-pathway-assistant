import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Card, PrimaryButton, Screen } from '../../components/ui';
import { COLORS } from '../../constants';
import { getAIResult } from '../../services/storage';
import type {
  AIAnalysisResult,
  AIVisaRecommendation,
  MainTabParamList
} from '../../types';

type Props = BottomTabScreenProps<MainTabParamList, 'AIResults'>;

const confidenceCopy: Record<
  AIVisaRecommendation['confidence'],
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  high: { label: 'High match', color: COLORS.mint600, bg: COLORS.mint100, icon: 'checkmark-circle' },
  medium: { label: 'Possible match', color: COLORS.indigo600, bg: COLORS.indigo100, icon: 'compass' },
  low: { label: 'Low match', color: COLORS.amber600, bg: COLORS.amber100, icon: 'alert-circle' }
};

export default function AIResultsScreen({ route, navigation }: Props) {
  const [result, setResult] = useState<AIAnalysisResult | null | undefined>(undefined);

  useEffect(() => {
    getAIResult(route.params.resultId).then(setResult);
  }, [route.params.resultId]);

  if (result === undefined) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ActivityIndicator color={COLORS.indigo600} size="large" />
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>Result not found</Text>
          <Text style={styles.body}>This AI assessment may have been deleted.</Text>
          <PrimaryButton
            title="Open AI Assistant"
            onPress={() => navigation.navigate('Assistant')}
            style={styles.gap}
          />
        </Card>
      </Screen>
    );
  }

  const top = result.payload.recommendations[0];
  const profile = result.payload.applicant_profile;

  return (
    <Screen>
      <View>
        <Text style={styles.kicker}>AI assessment</Text>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.subtitle}>
          AI-generated guidance based on the text and documents you shared. Treat this as
          a starting point and verify before making decisions.
        </Text>
      </View>

      {!!result.payload.overall_summary && (
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Summary</Text>
          <Text style={styles.body}>{result.payload.overall_summary}</Text>
        </Card>
      )}

      {top && (
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Best current match</Text>
          <Text style={styles.heroTitle}>
            Subclass {top.subclass} - {top.name}
          </Text>
          <ConfidenceBadge confidence={top.confidence} />
          <Text style={styles.body}>{top.reasoning}</Text>
        </Card>
      )}

      {hasProfile(profile) && (
        <Card>
          <Text style={styles.sectionTitle}>What we read about you</Text>
          <ProfileRow label="Nationality" value={profile.nationality} />
          <ProfileRow label="Age / DOB" value={profile.age_or_dob} />
          <ProfileRow label="Current location" value={profile.current_location} />
          <ProfileRow label="Current visa" value={profile.current_visa} />
          <ProfileRow label="Occupation" value={profile.occupation} />
          <ProfileRow label="Qualification" value={profile.qualification} />
          <ProfileRow label="English" value={profile.english_ability} />
          <ProfileRow label="Relationship" value={profile.relationship_status} />
        </Card>
      )}

      {result.payload.general_warnings.map((warning, index) => (
        <View key={`${warning}-${index}`} style={styles.warning}>
          <Ionicons name="information-circle" size={18} color={COLORS.amber600} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Visa options</Text>
      {result.payload.recommendations.map((rec, idx) => (
        <RecommendationCard key={`${rec.subclass}-${idx}`} rec={rec} delay={80 + idx * 70} />
      ))}

      {result.payload.risk_factors.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Risks to review</Text>
          {result.payload.risk_factors.map(item => (
            <BulletRow key={item} text={item} color={COLORS.rose600} />
          ))}
        </Card>
      )}

      {result.payload.documents_identified.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Documents we read</Text>
          {result.payload.documents_identified.map(doc => (
            <View key={`${doc.file}-${doc.type}`} style={styles.docRow}>
              <Ionicons
                name="document-text-outline"
                size={17}
                color={COLORS.indigo600}
              />
              <View style={styles.docTextWrap}>
                <Text style={styles.docName}>{doc.file}</Text>
                <Text style={styles.docMeta}>
                  {doc.type}
                  {doc.useful_for.length ? ` - ${doc.useful_for.join(', ')}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <PrimaryButton
        title="Run another AI assessment"
        variant="secondary"
        onPress={() => navigation.navigate('Assistant')}
      />
    </Screen>
  );
}

function hasProfile(profile: AIAnalysisResult['payload']['applicant_profile']): boolean {
  return Object.values(profile ?? {}).some(value => !!value);
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: AIVisaRecommendation['confidence'] }) {
  const meta = confidenceCopy[confidence] ?? confidenceCopy.medium;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function RecommendationCard({ rec, delay = 0 }: { rec: AIVisaRecommendation; delay?: number }) {
  return (
    <Card style={styles.recCard} delay={delay}>
      <View style={styles.recHeader}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{rec.subclass}</Text>
        </View>
        <View style={styles.recTitleWrap}>
          <Text style={styles.recTitle}>{rec.name}</Text>
          <Text style={styles.recCategory}>{rec.category}</Text>
        </View>
      </View>
      <ConfidenceBadge confidence={rec.confidence} />
      {!!rec.reasoning && <Text style={styles.body}>{rec.reasoning}</Text>}
      <BulletList title="Why this may fit" items={rec.strengths} color={COLORS.mint600} />
      <BulletList title="Gaps to fix" items={rec.gaps} color={COLORS.amber600} />
      <BulletList title="Critical missing" items={rec.critical_missing} color={COLORS.rose600} />
      <BulletList title="Next steps" items={rec.next_steps} color={COLORS.indigo600} />
    </Card>
  );
}

function BulletList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <View style={styles.bulletList}>
      <Text style={[styles.bulletHeader, { color }]}>{title}</Text>
      {items.map(item => (
        <BulletRow key={item} text={item} color={color} />
      ))}
    </View>
  );
}

function BulletRow({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    fontSize: 28,
    marginTop: 4
  },
  subtitle: {
    color: COLORS.slate600,
    marginTop: 8,
    lineHeight: 21
  },
  heroCard: {
    backgroundColor: '#f8fdff'
  },
  heroLabel: {
    color: COLORS.indigo500,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 22,
    marginVertical: 8
  },
  sectionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 4,
    marginBottom: 8
  },
  body: {
    color: COLORS.slate700,
    lineHeight: 21,
    marginTop: 6
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.amber100,
    borderRadius: 16,
    padding: 14
  },
  warningText: {
    flex: 1,
    color: COLORS.slate700,
    lineHeight: 20,
    fontWeight: '700'
  },
  profileRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.05)'
  },
  profileLabel: {
    width: 130,
    color: COLORS.slate500,
    fontWeight: '700',
    fontSize: 13
  },
  profileValue: {
    flex: 1,
    color: COLORS.slate900,
    fontWeight: '700',
    fontSize: 13
  },
  recCard: { gap: 10 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.indigo100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  codeText: { color: COLORS.indigo600, fontWeight: '900', fontSize: 15 },
  recTitleWrap: { flex: 1 },
  recTitle: { color: COLORS.slate900, fontWeight: '900', fontSize: 17 },
  recCategory: { color: COLORS.slate500, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999
  },
  badgeText: { fontWeight: '900', fontSize: 12 },
  bulletList: { marginTop: 6 },
  bulletHeader: { fontWeight: '900', fontSize: 13, marginBottom: 6 },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 5
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, color: COLORS.slate700, lineHeight: 20 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8
  },
  docTextWrap: { flex: 1 },
  docName: { color: COLORS.slate900, fontWeight: '700', fontSize: 13 },
  docMeta: { color: COLORS.slate500, fontSize: 12, marginTop: 2 },
  gap: { marginTop: 12 }
});
