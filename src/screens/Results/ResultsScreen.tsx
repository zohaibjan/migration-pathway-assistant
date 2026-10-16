import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, Screen, ScoreRing } from '../../components/ui';
import { COLORS } from '../../constants';
import { getResult } from '../../services/storage';
import type { AssessmentAnswers, AssessmentResult, EligibilityStatus, MainTabParamList, VisaRecommendation } from '../../types';

function estimatePoints(a: AssessmentAnswers): { total: number; breakdown: Array<{ label: string; pts: number }> } {
  const breakdown: Array<{ label: string; pts: number }> = [];
  let total = 0;

  const add = (label: string, pts: number) => { breakdown.push({ label, pts }); total += pts; };

  if (a.ageRange === '25_32') add('Age 25–32', 30);
  else if (a.ageRange === '18_24' || a.ageRange === '33_39') add('Age 18–24 / 33–39', 25);
  else if (a.ageRange === '40_44') add('Age 40–44', 15);
  else add('Age 45+', 0);

  if (a.englishLevel === 'superior') add('Superior English (IELTS 8+)', 20);
  else if (a.englishLevel === 'proficient') add('Proficient English (IELTS 7+)', 10);
  else if (a.englishLevel === 'competent') add('Competent English (IELTS 6+)', 0);
  else add('English (not yet tested)', 0);

  if (a.qualification === 'masters_phd') add('PhD / Masters', 20);
  else if (a.qualification === 'bachelor') add('Bachelor degree', 15);
  else if (a.qualification === 'diploma') add('Diploma', 10);

  if (a.yearsExperience === '8_plus') add('Overseas experience 8+ yrs', 15);
  else if (a.yearsExperience === '5_8') add('Overseas experience 5–8 yrs', 10);
  else if (a.yearsExperience === '3_5') add('Overseas experience 3–5 yrs', 5);

  return { total, breakdown };
}

type Props = BottomTabScreenProps<MainTabParamList, 'Results'>;

const statusCopy: Record<EligibilityStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  likely_eligible: { label: 'Likely eligible', color: COLORS.mint600, bg: COLORS.mint100, icon: 'checkmark-circle' },
  possible: { label: 'Possible pathway', color: COLORS.indigo600, bg: COLORS.indigo100, icon: 'compass' },
  needs_review: { label: 'Needs review', color: COLORS.amber600, bg: COLORS.amber100, icon: 'alert-circle' },
  not_likely: { label: 'Not likely yet', color: COLORS.rose600, bg: COLORS.rose100, icon: 'close-circle' }
};

export default function ResultsScreen({ route, navigation }: Props) {
  const [result, setResult] = useState<AssessmentResult | null | undefined>(undefined);

  useEffect(() => {
    getResult(route.params.resultId).then(setResult);
  }, [route.params.resultId]);

  if (result === undefined) {
    return (
      <Screen scroll={false} hasTabBar={false} contentStyle={styles.center}>
        <ActivityIndicator color={COLORS.indigo600} size="large" />
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen hasTabBar={false}>
        <Card>
          <Text style={styles.title}>Result not found</Text>
          <Text style={styles.body}>This saved assessment may have been deleted.</Text>
          <PrimaryButton title="Start a new assessment" onPress={() => navigation.navigate('Assessment')} />
        </Card>
      </Screen>
    );
  }

  const top = result.recommendations[0];

  return (
    <Screen hasTabBar={false}>
      <View>
        <Text style={styles.kicker}>Your pathway map</Text>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.subtitle}>
          Ranked options based on the details you provided. Treat this as a guide and verify before making decisions.
        </Text>
      </View>

      {top && (
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ScoreRing score={top.score} />
            <View style={styles.heroTextWrap}>
              <Text style={styles.bestLabel}>Best match</Text>
              <Text style={styles.bestTitle}>Subclass {top.visa.code}</Text>
              <Text style={styles.bestSubtitle}>{top.visa.name}</Text>
              <StatusBadge rec={top} />
            </View>
          </View>
          <Text style={styles.body}>{top.visa.summary}</Text>
        </Card>
      )}

      {/* Immigration points estimate for skilled visa pathways */}
      {(['189', '190', '491'].includes(result.recommendations[0]?.visa.code ?? '')) && (() => {
        const { total, breakdown } = estimatePoints(result.answers);
        return (
          <Card style={styles.pointsCard} delay={80}>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsIconBox}>
                <Ionicons name="stats-chart" size={18} color={COLORS.indigo600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsTitle}>Estimated immigration points</Text>
                <Text style={styles.pointsSub}>Based on your answers · verify with a migration agent</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsTotal}>{total}</Text>
                <Text style={styles.pointsPts}>pts</Text>
              </View>
            </View>
            {breakdown.filter(b => b.pts > 0).map(b => (
              <View key={b.label} style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>{b.label}</Text>
                <Text style={styles.pointsValue}>+{b.pts}</Text>
              </View>
            ))}
            <Text style={styles.pointsNote}>
              Typical 189 invitation: 65–85+ pts · 190 = +5 pts from nomination · 491 = +15 pts regional
            </Text>
          </Card>
        );
      })()}

      {result.generalWarnings.map((warning, index) => (
        <View key={index} style={styles.warning}>
          <Ionicons name="information-circle" size={18} color={COLORS.amber600} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Visa options</Text>
      {result.recommendations.slice(0, 5).map((rec, idx) => (
        <RecommendationCard key={rec.visa.code} rec={rec} delay={80 + idx * 70} />
      ))}

      <Text style={styles.sectionTitle}>Prepare these documents</Text>
      <Card delay={520}>
        {result.documentChecklist.map(item => (
          <View key={item} style={styles.checkRow}>
            <Ionicons name="document-text-outline" size={17} color={COLORS.indigo600} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </Card>

      <PrimaryButton title="Start another assessment" onPress={() => navigation.navigate('Assessment')} variant="secondary" />
    </Screen>
  );
}

function StatusBadge({ rec }: { rec: VisaRecommendation }) {
  const status = statusCopy[rec.status];
  return (
    <View style={[styles.badge, { backgroundColor: status.bg }]}>
      <Ionicons name={status.icon} size={15} color={status.color} />
      <Text style={[styles.badgeText, { color: status.color }]}>{status.label} - {rec.score}% fit</Text>
    </View>
  );
}

function RecommendationCard({ rec, delay = 0 }: { rec: VisaRecommendation; delay?: number }) {
  return (
    <Card style={styles.recCard} delay={delay}>
      <View style={styles.recHeader}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{rec.visa.code}</Text>
        </View>
        <View style={styles.recTitleWrap}>
          <Text style={styles.recTitle}>{rec.visa.name}</Text>
          <Text style={styles.recCategory}>{rec.visa.category}</Text>
        </View>
      </View>
      <StatusBadge rec={rec} />
      <Text style={styles.body}>{rec.visa.summary}</Text>

      <InfoList title="Why this may fit" items={rec.reasons} tone="good" />
      <InfoList title="Gaps to fix" items={rec.gaps} tone="warn" />
      <InfoList title="Critical warnings" items={rec.criticalWarnings} tone="danger" />
      <InfoList title="Next steps" items={rec.nextSteps} tone="neutral" />
    </Card>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'warn' | 'danger' | 'neutral' }) {
  if (!items.length) return null;
  const color = tone === 'good' ? COLORS.mint600 : tone === 'danger' ? COLORS.rose600 : tone === 'warn' ? COLORS.amber600 : COLORS.indigo600;
  return (
    <View style={styles.infoList}>
      <Text style={[styles.infoTitle, { color }]}>{title}</Text>
      {items.map(item => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
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
  heroCard: {
    backgroundColor: '#f8fdff'
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8
  },
  heroTextWrap: {
    flex: 1,
    gap: 4
  },
  bestLabel: {
    color: COLORS.indigo500,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  bestTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 22
  },
  bestSubtitle: {
    color: COLORS.slate700,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6
  },
  sectionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 20,
    marginTop: 8
  },
  body: {
    color: COLORS.slate700,
    lineHeight: 21,
    marginTop: 10
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
  recCard: {
    gap: 12
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  codeBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.indigo100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  codeText: {
    color: COLORS.indigo600,
    fontWeight: '900',
    fontSize: 15
  },
  recTitleWrap: {
    flex: 1
  },
  recTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 17
  },
  recCategory: {
    color: COLORS.slate500,
    marginTop: 2
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999
  },
  badgeText: {
    fontWeight: '900',
    fontSize: 12
  },
  infoList: {
    marginTop: 6
  },
  infoTitle: {
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 6
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 5
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7
  },
  bulletText: {
    flex: 1,
    color: COLORS.slate700,
    lineHeight: 20
  },
  checkRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)'
  },
  checkText: {
    flex: 1,
    color: COLORS.slate700,
    fontWeight: '700'
  },
  pointsCard: {
    gap: 8,
    borderColor: COLORS.indigo100,
    borderWidth: 1.5
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4
  },
  pointsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.indigo100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pointsTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 15
  },
  pointsSub: {
    color: COLORS.slate500,
    fontSize: 11,
    marginTop: 1
  },
  pointsBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.indigo600,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  pointsTotal: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 24
  },
  pointsPts: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800'
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)'
  },
  pointsLabel: {
    color: COLORS.slate700,
    fontSize: 13,
    fontWeight: '700'
  },
  pointsValue: {
    color: COLORS.mint600,
    fontSize: 13,
    fontWeight: '900'
  },
  pointsNote: {
    color: COLORS.slate500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  }
});
