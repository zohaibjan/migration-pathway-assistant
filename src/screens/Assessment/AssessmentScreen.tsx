import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Card, OptionPill, PrimaryButton, Screen } from '../../components/ui';
import { COLORS } from '../../constants';
import { defaultAnswers, runAssessment } from '../../services/assessmentEngine';
import { saveResult } from '../../services/storage';
import type { AssessmentAnswers, MainTabParamList } from '../../types';

const goalOptions: Array<[AssessmentAnswers['goal'], string]> = [
  ['work', 'Work'],
  ['study', 'Study'],
  ['partner', 'Partner'],
  ['visit', 'Visit'],
  ['settle', 'Settle permanently'],
  ['unsure', 'Not sure']
];

const ageOptions: Array<[AssessmentAnswers['ageRange'], string]> = [
  ['18_24', '18-24'],
  ['25_32', '25-32'],
  ['33_39', '33-39'],
  ['40_44', '40-44'],
  ['45_plus', '45+']
];

const englishOptions: Array<[AssessmentAnswers['englishLevel'], string]> = [
  ['unknown', 'Not tested'],
  ['functional', 'Functional'],
  ['competent', 'Competent'],
  ['proficient', 'Proficient'],
  ['superior', 'Superior']
];

const experienceOptions: Array<[AssessmentAnswers['yearsExperience'], string]> = [
  ['none', 'None'],
  ['under_3', '< 3 years'],
  ['3_5', '3-5 years'],
  ['5_8', '5-8 years'],
  ['8_plus', '8+ years']
];

const qualificationOptions: Array<[AssessmentAnswers['qualification'], string]> = [
  ['none', 'None'],
  ['certificate', 'Certificate'],
  ['diploma', 'Diploma'],
  ['bachelor', 'Bachelor'],
  ['masters_phd', 'Masters/PhD']
];

export default function AssessmentScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [answers, setAnswers] = useState<AssessmentAnswers>(defaultAnswers);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setSaving(true);
    const result = runAssessment(answers);
    await saveResult(result);
    setSaving(false);
    navigation.navigate('Results', { resultId: result.id });
  };

  return (
    <Screen>
      <View>
        <Text style={styles.kicker}>Guided assessment</Text>
        <Text style={styles.title}>Tell us about your situation</Text>
        <Text style={styles.subtitle}>
          Keep it simple. You can leave unknown items blank and the app will show what evidence is missing.
        </Text>
      </View>

      <Card delay={80}>
        <Question title="Main goal">
          <PillGroup options={goalOptions} value={answers.goal} onChange={value => set('goal', value)} />
        </Question>

        <Question title="Age range">
          <PillGroup options={ageOptions} value={answers.ageRange} onChange={value => set('ageRange', value)} />
        </Question>

        <Question title="Where are you now?">
          <PillGroup
            options={[
              ['inside_au', 'In Australia'],
              ['outside_au', 'Outside Australia']
            ]}
            value={answers.location}
            onChange={value => set('location', value)}
          />
        </Question>

        <Question title="Nationality">
          <TextInput
            value={answers.nationality}
            onChangeText={value => set('nationality', value)}
            placeholder="e.g. Pakistan, India, Philippines"
            style={styles.input}
            placeholderTextColor={COLORS.slate500}
          />
        </Question>

        <Question title="Current visa or status">
          <TextInput
            value={answers.currentVisa}
            onChangeText={value => set('currentVisa', value)}
            placeholder="e.g. Student visa, visitor visa, offshore"
            style={styles.input}
            placeholderTextColor={COLORS.slate500}
          />
        </Question>

        <Question title="Occupation or job title">
          <TextInput
            value={answers.occupation}
            onChangeText={value => set('occupation', value)}
            placeholder="e.g. Software Engineer, Chef, Nurse"
            style={styles.input}
            placeholderTextColor={COLORS.slate500}
          />
        </Question>

        <Question title="English level">
          <PillGroup options={englishOptions} value={answers.englishLevel} onChange={value => set('englishLevel', value)} />
        </Question>

        <Question title="Relevant work experience">
          <PillGroup options={experienceOptions} value={answers.yearsExperience} onChange={value => set('yearsExperience', value)} />
        </Question>

        <Question title="Highest qualification">
          <PillGroup options={qualificationOptions} value={answers.qualification} onChange={value => set('qualification', value)} />
        </Question>
      </Card>

      <Card delay={180}>
        <Text style={styles.sectionTitle}>Key evidence and pathway signals</Text>
        <Toggle label="I have a positive skills assessment" value={answers.hasSkillsAssessment} onChange={value => set('hasSkillsAssessment', value)} />
        <Toggle label="An Australian employer may sponsor me" value={answers.hasEmployerSponsor} onChange={value => set('hasEmployerSponsor', value)} />
        <Toggle label="I have or may get state nomination" value={answers.hasStateNomination} onChange={value => set('hasStateNomination', value)} />
        <Toggle label="I am willing to live/work in regional Australia" value={answers.regionalWilling} onChange={value => set('regionalWilling', value)} />
        <Toggle label="I have an eligible Australian partner" value={answers.hasAustralianPartner} onChange={value => set('hasAustralianPartner', value)} />
        <Toggle label="I want to study in Australia" value={answers.wantsToStudy} onChange={value => set('wantsToStudy', value)} />
        <Toggle label="I can show funds or financial support" value={answers.fundsAvailable} onChange={value => set('fundsAvailable', value)} />
        <Toggle label="I have health or character concerns" value={answers.healthCharacterConcern} onChange={value => set('healthCharacterConcern', value)} />
      </Card>

      <PrimaryButton title="Show my visa options" onPress={submit} loading={saving} />
    </Screen>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PillGroup<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<[T, string]>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.pills}>
      {options.map(([key, label]) => (
        <OptionPill key={key} label={label} selected={value === key} onPress={() => onChange(key)} />
      ))}
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.slate300, true: COLORS.indigo100 }} thumbColor={value ? COLORS.indigo600 : COLORS.white} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  question: {
    marginBottom: 18
  },
  questionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 10
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: COLORS.slate900,
    backgroundColor: COLORS.white
  },
  sectionTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 12
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)'
  },
  toggleLabel: {
    flex: 1,
    color: COLORS.slate700,
    fontWeight: '700',
    lineHeight: 20
  }
});
