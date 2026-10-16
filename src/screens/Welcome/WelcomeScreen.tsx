import React, { useCallback, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, ScoreRing, Screen } from '../../components/ui';
import { COLORS, FONTS, GRADIENTS, isSupabaseConfigured } from '../../constants';
import type {
  AIAnalysisResult,
  AssessmentResult,
  MigrationNewsItem,
  MainTabParamList
} from '../../types';
import { loadAIResults, loadResults } from '../../services/storage';
import { loadRecentNews } from '../../services/migrationNews';

type JourneyStage = 0 | 1 | 2;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [latest, setLatest] = useState<AssessmentResult | null>(null);
  const [latestAI, setLatestAI] = useState<AIAnalysisResult | null>(null);
  const [news, setNews] = useState<MigrationNewsItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([loadResults(), loadAIResults()]).then(([guided, ai]) => {
        if (!cancelled) {
          setLatest(guided[0] ?? null);
          setLatestAI(ai[0] ?? null);
        }
      });
      if (isSupabaseConfigured()) {
        loadRecentNews({ limit: 2 }).then(items => {
          if (!cancelled) setNews(items);
        });
      }
      return () => { cancelled = true; };
    }, [])
  );

  const stage: JourneyStage = latestAI ? 2 : latest ? 1 : 0;
  const topRec = latest?.recommendations[0];
  const topScore = topRec?.score ?? 0;

  return (
    <Screen>
      {/* Brand header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="airplane" size={15} color={COLORS.cream50} />
          </View>
          <View>
            <Text style={styles.brandName}>Migration Assist</Text>
            <Text style={styles.brandSub}>Australian visa guidance</Text>
          </View>
        </View>
        <View style={styles.auBadge}>
          <Text style={styles.auBadgeText}>AU</Text>
        </View>
      </View>

      {/* Journey hero — adapts to stage */}
      {stage === 0 ? (
        <LinearGradient colors={[...GRADIENTS.hero]} style={styles.hero}>
          <Text style={styles.heroKicker}>Your migration journey</Text>
          <Text style={styles.heroTitle}>Find your{'\n'}visa pathway.</Text>
          <Text style={styles.heroSub}>
            Most applicants see their options in under 3 minutes. Answer a few plain-English
            questions and get ranked visa options, eligibility signals, and a document checklist.
          </Text>
          <View style={styles.heroStepsWrap}>
            <JourneySteps stage={0} dark={false} />
          </View>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => navigation.navigate('Assessment')}
            activeOpacity={0.9}
          >
            <Text style={styles.heroBtnText}>Start My Journey</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.cream50} />
          </TouchableOpacity>
          <Text style={styles.heroMeta}>Free · Private · MARA-aligned guidance</Text>
        </LinearGradient>
      ) : (
        <Card
          tone="dark"
          style={styles.journeyCardInner}
          outerStyle={styles.journeyCardOuter}
        >
          <View style={styles.journeyRow}>
            <ScoreRing score={topScore} size={110} />
            <View style={styles.journeyText}>
              <Text style={styles.journeyLabel}>Your journey</Text>
              <Text style={styles.journeyTitle}>
                {topRec ? `Subclass ${topRec.visa.code}` : 'Assessment done'}
              </Text>
              <Text style={styles.journeyVisaName} numberOfLines={2}>
                {topRec?.visa.name ?? 'Review your results'}
              </Text>
              <View style={styles.journeyBadge}>
                <View style={styles.journeyDot} />
                <Text style={styles.journeyBadgeText}>
                  {stage === 2 ? 'AI analysis complete' : 'Guided assessment done'}
                </Text>
              </View>
            </View>
          </View>
          <JourneySteps stage={stage} dark />
          <View style={styles.journeyActions}>
            <PrimaryButton
              title="View results"
              onPress={() => {
                if (latest) navigation.navigate('Results', { resultId: latest.id });
                else if (latestAI) navigation.navigate('AIResults', { resultId: latestAI.id });
              }}
              style={styles.halfBtn}
            />
            {stage < 2 && (
              <PrimaryButton
                title="Try AI analysis"
                variant="secondary"
                onPress={() => (navigation as any).navigate('Assistant')}
                style={styles.halfBtn}
              />
            )}
          </View>
        </Card>
      )}

      {/* Trust strip */}
      <View style={styles.trustRow}>
        <TrustChip icon="shield-checkmark-outline" label="MARA-aligned" />
        <TrustChip icon="lock-closed-outline" label="Encrypted" />
        <TrustChip icon="phone-portrait-outline" label="Mobile + web" />
      </View>

      {/* Free tool: PR Pathway Planner */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('PrPathway')}>
        <Card style={styles.toolRow}>
          <View style={styles.toolIcon}>
            <Ionicons name="time-outline" size={20} color={COLORS.cream50} />
          </View>
          <View style={styles.toolTextWrap}>
            <Text style={styles.toolTitle}>PR Pathway Planner</Text>
            <Text style={styles.toolSub}>
              Free tool · see your runway to the age-45 skilled PR cut-off
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.ink500} />
        </Card>
      </TouchableOpacity>

      {/* Live feature cards */}
      <Text style={styles.sectionKicker}>What you get</Text>
      <Text style={styles.sectionLabel}>Three signals,{'\n'}one clear plan.</Text>

      <View style={styles.grid}>
        <FeatureCard
          delay={100}
          accent={COLORS.mint600}
          accentSoft="#D9EBE0"
          icon="checkmark-circle"
          title="Eligibility Signals"
          metric={
            latest
              ? `${latest.recommendations.filter(r => r.status === 'likely_eligible').length} likely · ${latest.recommendations.filter(r => r.status === 'possible').length} possible`
              : latestAI
              ? `${latestAI.payload.recommendations.length} AI matches`
              : 'Check 40+ visa subclasses'
          }
          body="See whether each option looks likely, possible, or needs review."
        />

        <FeatureCard
          delay={180}
          accent={COLORS.teal800}
          accentSoft="#D9E7E1"
          icon="document-text"
          title="Document Checklist"
          metric={
            latest
              ? `${latest.documentChecklist.length} documents identified`
              : latestAI
              ? `${latestAI.payload.documents_identified.length} documents read`
              : 'Auto-generated for you'
          }
          body="Know exactly what evidence to prepare before speaking to an adviser."
        />

        <FeatureCard
          delay={260}
          accent={COLORS.amber600}
          accentSoft="#F5E2B8"
          icon="warning"
          title="Risk Gaps"
          metric={
            latest
              ? `${latest.recommendations.filter(r => r.gaps.length > 0).length} pathways with gaps`
              : latestAI
              ? `${latestAI.payload.risk_factors.length} risks flagged`
              : 'Spot what could slow you down'
          }
          body="Find missing sponsorship, skills assessment, English, or relationship evidence."
        />
      </View>

      {/* Encouragement */}
      <View style={styles.encourageCard}>
        <Ionicons name="sparkles" size={18} color={COLORS.ink900} />
        <Text style={styles.encourageText}>
          {stage === 0
            ? "You're closer than you think. Most pathways become clear in one session."
            : stage === 1
            ? "Great start. Most applicants at your stage prepare 2–3 documents next."
            : "Your pathway is taking shape. The AI analysis adds the deepest insight."}
        </Text>
      </View>

      {/* News */}
      {news.length > 0 && (
        <Card>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <Ionicons name="newspaper-outline" size={17} color={COLORS.cream50} />
            </View>
            <Text style={styles.cardTitle}>Migration news</Text>
          </View>
          {news.map(item => (
            <NewsRow key={item.id} item={item} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const STEPS = [
  { label: 'Assessment', icon: 'compass-outline' as const },
  { label: 'Review', icon: 'bar-chart-outline' as const },
  { label: 'AI deep-dive', icon: 'sparkles-outline' as const }
];

function JourneySteps({ stage, dark = true }: { stage: JourneyStage; dark?: boolean }) {
  const inactiveCircleBg = dark ? 'rgba(251,244,232,0.10)' : 'rgba(17,20,15,0.06)';
  const inactiveCircleBorder = dark ? 'rgba(251,244,232,0.22)' : 'rgba(17,20,15,0.14)';
  const inactiveIconColor = dark ? 'rgba(251,244,232,0.45)' : COLORS.ink300;
  const inactiveLabelColor = dark ? 'rgba(251,244,232,0.55)' : COLORS.ink500;
  const activeLabelColor = dark ? COLORS.cream50 : COLORS.ink900;
  const inactiveLineBg = dark ? 'rgba(251,244,232,0.18)' : 'rgba(17,20,15,0.12)';

  return (
    <View style={styles.stepsRow}>
      {STEPS.map((step, idx) => {
        const done = idx < stage;
        const active = idx === stage;
        return (
          <React.Fragment key={step.label}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: inactiveCircleBg, borderColor: inactiveCircleBorder },
                  done && styles.stepDone,
                  active && (dark ? styles.stepActiveDark : styles.stepActiveLight)
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color={COLORS.cream50} />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={12}
                    color={active ? (dark ? COLORS.ink900 : COLORS.cream50) : inactiveIconColor}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: inactiveLabelColor },
                  (done || active) && { color: activeLabelColor }
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: inactiveLineBg },
                  idx < stage && styles.stepLineDone
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function TrustChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.trustChip}>
      <Ionicons name={icon} size={12} color={COLORS.ink900} />
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

function FeatureCard({
  delay,
  accent,
  accentSoft,
  icon,
  title,
  metric,
  body
}: {
  delay: number;
  accent: string;
  accentSoft: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  metric: string;
  body: string;
}) {
  return (
    <Card delay={delay} style={styles.featureCard}>
      <View style={styles.featureHead}>
        <View style={[styles.featureIcon, { backgroundColor: accent }]}>
          <Ionicons name={icon} size={20} color={COLORS.cream50} />
        </View>
        <View style={[styles.featureMetricChip, { backgroundColor: accentSoft }]}>
          <Text style={[styles.featureMetricText, { color: accent }]}>{metric}</Text>
        </View>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </Card>
  );
}

function NewsRow({ item }: { item: MigrationNewsItem }) {
  const isExternal = item.url.startsWith('https://');
  const onOpen = () => { if (isExternal) Linking.openURL(item.url); };
  const dateLabel = new Date(item.publishedAt ?? item.scrapedAt).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short'
  });
  return (
    <TouchableOpacity activeOpacity={isExternal ? 0.8 : 1} onPress={onOpen} style={styles.newsRow}>
      <View style={styles.newsTextWrap}>
        <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.newsMeta}>{item.source} · {dateLabel}</Text>
      </View>
      {isExternal && <Ionicons name="open-outline" size={15} color={COLORS.ink500} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // — Header —
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ink900
  },
  brandName: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 20
  },
  brandSub: {
    color: COLORS.ink500,
    fontSize: 12,
    marginTop: 1
  },
  auBadge: {
    backgroundColor: 'rgba(17,20,15,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  auBadgeText: {
    color: COLORS.ink900,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6
  },

  // — Hero (stage 0) —
  hero: {
    borderRadius: 28,
    padding: 24,
    gap: 14,
    overflow: 'hidden'
  },
  heroKicker: {
    color: COLORS.ink700,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5
  },
  heroSub: {
    color: COLORS.ink700,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 520
  },
  heroStepsWrap: {
    marginTop: 4,
    marginBottom: 4
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.ink900,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
    shadowColor: COLORS.ink900,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  heroBtnText: {
    color: COLORS.cream50,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2
  },
  heroMeta: {
    color: COLORS.ink500,
    fontSize: 11
  },

  // — Journey steps —
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
    width: 70
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  stepDone: {
    backgroundColor: COLORS.mint600,
    borderColor: COLORS.mint600
  },
  stepActiveLight: {
    backgroundColor: COLORS.ink900,
    borderColor: COLORS.ink900
  },
  stepActiveDark: {
    backgroundColor: COLORS.cream50,
    borderColor: COLORS.cream50
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 18,
    marginHorizontal: 4
  },
  stepLineDone: {
    backgroundColor: COLORS.mint600
  },

  // — Journey card (stage 1+) —
  journeyCardOuter: {
    // dark theme — handled by Card tone="dark"
  },
  journeyCardInner: {
    gap: 16,
    padding: 22
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18
  },
  journeyText: {
    flex: 1,
    gap: 3
  },
  journeyLabel: {
    color: 'rgba(251,244,232,0.6)',
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.4
  },
  journeyTitle: {
    color: COLORS.cream50,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 24,
    marginTop: 2,
    letterSpacing: -0.3
  },
  journeyVisaName: {
    color: 'rgba(251,244,232,0.78)',
    fontSize: 13,
    lineHeight: 18
  },
  journeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8
  },
  journeyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.mint600
  },
  journeyBadgeText: {
    color: COLORS.mint600,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2
  },
  journeyActions: {
    flexDirection: 'row',
    gap: 10
  },
  halfBtn: {
    flex: 1
  },

  // — Trust strip —
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17,20,15,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999
  },
  trustLabel: {
    color: COLORS.ink900,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.2
  },

  // — PR Pathway Planner row —
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal800
  },
  toolTextWrap: {
    flex: 1
  },
  toolTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2
  },
  toolSub: {
    color: COLORS.ink500,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16
  },

  // — Section heading —
  sectionKicker: {
    color: COLORS.ink700,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 12
  },
  sectionLabel: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    marginTop: -4,
    marginBottom: 4
  },

  // — Feature cards —
  grid: {
    gap: 14
  },
  featureCard: {
    gap: 12
  },
  featureHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureMetricChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  featureMetricText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2
  },
  featureTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3
  },
  featureBody: {
    color: COLORS.ink500,
    lineHeight: 20,
    fontSize: 13
  },

  // — Encouragement —
  encourageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.cream100,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,20,15,0.08)',
    marginTop: 6
  },
  encourageText: {
    flex: 1,
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 21
  },

  // — Generic card header —
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ink900
  },
  cardTitle: {
    color: COLORS.ink900,
    fontFamily: FONTS.serif,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.2
  },

  // — News —
  newsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,20,15,0.06)'
  },
  newsTextWrap: { flex: 1 },
  newsTitle: { color: COLORS.ink900, fontWeight: '600', fontSize: 13, lineHeight: 19 },
  newsMeta: { color: COLORS.ink500, fontSize: 11, marginTop: 3 }
});
