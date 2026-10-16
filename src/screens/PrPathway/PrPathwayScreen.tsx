import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, Screen } from '../../components/ui';
import { COLORS } from '../../constants';
import {
  computePrPathway,
  isValidDob,
  type PrPathwayResult,
  type PrPathwayStatus
} from '../../services/prPathway';
import type { MainTabParamList } from '../../types';

type Props = BottomTabScreenProps<MainTabParamList, 'PrPathway'>;

const STATUS_STYLE: Record<PrPathwayStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ample: { color: COLORS.mint600, bg: COLORS.mint100, icon: 'checkmark-circle' },
  tight: { color: COLORS.indigo600, bg: COLORS.indigo100, icon: 'time' },
  critical: { color: COLORS.amber600, bg: COLORS.amber100, icon: 'alert-circle' },
  past: { color: COLORS.rose600, bg: COLORS.rose100, icon: 'close-circle' }
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function PrPathwayScreen({ navigation }: Props) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [on482, setOn482] = useState(false);
  const [monthsWorked, setMonthsWorked] = useState('');
  const [result, setResult] = useState<PrPathwayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dobValid = useMemo(
    () => isValidDob(Number(day), Number(month), Number(year)),
    [day, month, year]
  );

  const calculate = () => {
    setError(null);
    if (!dobValid) {
      setError('Enter a valid date of birth (day, month, and 4-digit year).');
      setResult(null);
      return;
    }
    const computed = computePrPathway({
      birthDay: Number(day),
      birthMonth: Number(month),
      birthYear: Number(year),
      on482Path: on482,
      monthsWorkedForSponsor: on482 ? Number(monthsWorked) || 0 : 0
    });
    setResult(computed);
  };

  return (
    <Screen hasTabBar={false}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={COLORS.indigo600} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.kicker}>Free tool</Text>
        <Text style={styles.title}>PR Pathway Planner</Text>
        <Text style={styles.subtitle}>
          Most skilled and employer-sponsored permanent visas require you to be under 45 at
          the time of invitation or nomination. See how much runway you have — and, if you are
          on a 482, when you would meet the 186 (TRT) work requirement.
        </Text>
      </View>

      <Card delay={80}>
        <Text style={styles.sectionTitle}>Your date of birth</Text>
        <View style={styles.dobRow}>
          <DobField label="Day" value={day} onChange={setDay} max={2} placeholder="DD" />
          <DobField label="Month" value={month} onChange={setMonth} max={2} placeholder="MM" />
          <DobField label="Year" value={year} onChange={setYear} max={4} placeholder="YYYY" flex={1.4} />
        </View>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setOn482(value => !value)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={on482 ? 'checkbox' : 'square-outline'}
            size={22}
            color={on482 ? COLORS.indigo600 : COLORS.slate400}
          />
          <Text style={styles.toggleText}>
            I am on a 482 / TSS visa working toward employer-sponsored PR (186)
          </Text>
        </TouchableOpacity>

        {on482 && (
          <View style={styles.monthsWrap}>
            <Text style={styles.helper}>
              Full-time months already worked for your sponsoring employer on the 482/TSS:
            </Text>
            <TextInput
              style={styles.monthsInput}
              value={monthsWorked}
              onChangeText={t => setMonthsWorked(t.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder="e.g. 14"
              placeholderTextColor={COLORS.slate400}
            />
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PrimaryButton title="Calculate my timeline" onPress={calculate} style={styles.calcBtn} />
      </Card>

      {result && <ResultBlock result={result} navigation={navigation} />}

      <Text style={styles.disclaimer}>
        General guidance only — not legal advice. Age is assessed at invitation or nomination,
        and exemptions exist for some pathways. Always verify on immi.homeaffairs.gov.au or with
        a MARA-registered migration agent.
      </Text>
    </Screen>
  );
}

function DobField({
  label,
  value,
  onChange,
  max,
  placeholder,
  flex = 1
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder: string;
  flex?: number;
}) {
  return (
    <View style={[styles.dobField, { flex }]}>
      <Text style={styles.dobLabel}>{label}</Text>
      <TextInput
        style={styles.dobInput}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, '').slice(0, max))}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={COLORS.slate400}
        maxLength={max}
      />
    </View>
  );
}

function ResultBlock({
  result,
  navigation
}: {
  result: PrPathwayResult;
  navigation: Props['navigation'];
}) {
  const s = STATUS_STYLE[result.status];
  const yearsLabel =
    result.daysUntil45 <= 0
      ? 'Past the cut-off'
      : `${Math.floor(result.monthsUntil45 / 12)}y ${result.monthsUntil45 % 12}m left`;

  return (
    <>
      <Card delay={120} style={{ ...styles.statusCard, borderColor: s.color }}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={22} color={s.color} />
          </View>
          <View style={styles.statusHeaderText}>
            <Text style={[styles.statusHeadline, { color: s.color }]}>{result.statusHeadline}</Text>
            <Text style={styles.statusMeta}>
              Age {result.ageYears} · turns 45 on {formatDate(result.turns45On)} · {yearsLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.statusDetail}>{result.statusDetail}</Text>
      </Card>

      {result.trt && (
        <Card delay={160}>
          <View style={styles.row}>
            <Ionicons name="briefcase-outline" size={20} color={COLORS.indigo600} />
            <Text style={styles.cardTitle}>186 (TRT) work requirement</Text>
          </View>
          <Text style={styles.body}>
            {result.trt.monthsRemaining === 0
              ? `You appear to already meet the ${result.trt.monthsRequired / 12}-year full-time work requirement with your sponsor.`
              : `You have ${result.trt.monthsWorked} of ${result.trt.monthsRequired} months. About ${result.trt.monthsRemaining} more month${result.trt.monthsRemaining === 1 ? '' : 's'} of full-time work projects to ${formatDate(result.trt.eligibleOn)}.`}
          </Text>
          <View style={[styles.trtBadge, { backgroundColor: result.trt.meetsBeforeCutoff ? COLORS.mint100 : COLORS.rose100 }]}>
            <Ionicons
              name={result.trt.meetsBeforeCutoff ? 'checkmark-circle' : 'warning'}
              size={16}
              color={result.trt.meetsBeforeCutoff ? COLORS.mint600 : COLORS.rose600}
            />
            <Text style={[styles.trtBadgeText, { color: result.trt.meetsBeforeCutoff ? COLORS.mint600 : COLORS.rose600 }]}>
              {result.trt.meetsBeforeCutoff
                ? 'Projected to be met before you turn 45'
                : 'Projected to fall after you turn 45'}
            </Text>
          </View>
        </Card>
      )}

      <Card delay={200}>
        <Text style={styles.cardTitle}>Timeline</Text>
        {result.milestones.map((m, idx) => (
          <View key={`${m.label}-${idx}`} style={styles.milestoneRow}>
            <View style={styles.milestoneDotCol}>
              <View style={styles.milestoneDot} />
              {idx < result.milestones.length - 1 && <View style={styles.milestoneLine} />}
            </View>
            <View style={styles.milestoneBody}>
              <Text style={styles.milestoneLabel}>{m.label}</Text>
              {m.date && <Text style={styles.milestoneDate}>{formatDate(m.date)}</Text>}
              {m.note && <Text style={styles.milestoneNote}>{m.note}</Text>}
            </View>
          </View>
        ))}
      </Card>

      {result.warnings.length > 0 && (
        <Card delay={240} style={styles.warnCard}>
          <Text style={styles.cardTitle}>Worth knowing</Text>
          {result.warnings.map((w, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.amber600} style={styles.bulletIcon} />
              <Text style={styles.bulletText}>{w}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card delay={280}>
        <Text style={styles.cardTitle}>Suggested next steps</Text>
        {result.nextSteps.map((step, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={COLORS.indigo600} style={styles.bulletIcon} />
            <Text style={styles.bulletText}>{step}</Text>
          </View>
        ))}
        <PrimaryButton
          title="Run a full eligibility assessment"
          onPress={() => navigation.navigate('Assessment')}
          style={styles.assessBtn}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start'
  },
  backText: {
    color: COLORS.indigo600,
    fontWeight: '700',
    fontSize: 15
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
  sectionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 12
  },
  dobRow: {
    flexDirection: 'row',
    gap: 10
  },
  dobField: {
    gap: 6
  },
  dobLabel: {
    color: COLORS.slate500,
    fontSize: 12,
    fontWeight: '700'
  },
  dobInput: {
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: COLORS.slate900,
    fontSize: 16,
    backgroundColor: COLORS.white,
    textAlign: 'center'
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16
  },
  toggleText: {
    flex: 1,
    color: COLORS.slate700,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600'
  },
  monthsWrap: {
    marginTop: 12
  },
  helper: {
    color: COLORS.slate500,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8
  },
  monthsInput: {
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: COLORS.slate900,
    fontSize: 16,
    backgroundColor: COLORS.white,
    width: 120
  },
  errorText: {
    color: COLORS.rose600,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12
  },
  calcBtn: {
    marginTop: 16
  },
  statusCard: {
    borderWidth: 1.5,
    gap: 10
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusHeaderText: {
    flex: 1
  },
  statusHeadline: {
    fontWeight: '900',
    fontSize: 17,
    lineHeight: 22
  },
  statusMeta: {
    color: COLORS.slate500,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600'
  },
  statusDetail: {
    color: COLORS.slate700,
    lineHeight: 21
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  cardTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 8
  },
  body: {
    color: COLORS.slate700,
    lineHeight: 21,
    marginBottom: 10
  },
  trtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  trtBadgeText: {
    fontWeight: '800',
    fontSize: 13
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 12
  },
  milestoneDotCol: {
    alignItems: 'center',
    width: 14
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.indigo600,
    marginTop: 4
  },
  milestoneLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.slate200,
    marginVertical: 2
  },
  milestoneBody: {
    flex: 1,
    paddingBottom: 16
  },
  milestoneLabel: {
    color: COLORS.slate900,
    fontWeight: '800',
    fontSize: 15
  },
  milestoneDate: {
    color: COLORS.indigo600,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 1
  },
  milestoneNote: {
    color: COLORS.slate500,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3
  },
  warnCard: {
    backgroundColor: COLORS.amber100,
    borderColor: COLORS.amber100
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  bulletIcon: {
    marginTop: 2
  },
  bulletText: {
    flex: 1,
    color: COLORS.slate700,
    lineHeight: 20,
    fontSize: 14
  },
  assessBtn: {
    marginTop: 8
  },
  disclaimer: {
    color: COLORS.slate400,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center'
  }
});
