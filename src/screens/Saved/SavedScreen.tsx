import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, Screen } from '../../components/ui';
import { COLORS } from '../../constants';
import {
  deleteAIResult,
  deleteResult,
  loadAIResults,
  loadResults
} from '../../services/storage';
import type {
  AIAnalysisResult,
  AssessmentResult,
  MainTabParamList
} from '../../types';

interface UnifiedItem {
  id: string;
  kind: 'guided' | 'ai';
  title: string;
  createdAt: string;
  subtitle: string;
}

export default function SavedScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [items, setItems] = useState<UnifiedItem[]>([]);

  const refresh = useCallback(async () => {
    const [guided, ai] = await Promise.all([loadResults(), loadAIResults()]);
    const combined: UnifiedItem[] = [
      ...guided.map(toGuidedItem),
      ...ai.map(toAIItem)
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setItems(combined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const remove = (item: UnifiedItem) => {
    Alert.alert(
      'Delete assessment?',
      'This saved result will be removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.kind === 'guided') {
              await deleteResult(item.id);
            } else {
              await deleteAIResult(item.id);
            }
            await refresh();
          }
        }
      ]
    );
  };

  const open = (item: UnifiedItem) => {
    if (item.kind === 'guided') {
      navigation.navigate('Results', { resultId: item.id });
    } else {
      navigation.navigate('AIResults', { resultId: item.id });
    }
  };

  return (
    <Screen>
      <View>
        <Text style={styles.kicker}>Saved</Text>
        <Text style={styles.title}>Your assessments</Text>
        <Text style={styles.subtitle}>
          Saved locally on this device. Both guided and AI assessments appear here.
        </Text>
      </View>

      {items.length === 0 ? (
        <Card>
          <Ionicons name="folder-open-outline" size={36} color={COLORS.slate500} />
          <Text style={styles.emptyTitle}>No saved assessments yet</Text>
          <Text style={styles.subtitle}>
            Run a guided assessment or use the AI Assistant to see results here.
          </Text>
          <PrimaryButton
            title="Start guided assessment"
            onPress={() => navigation.navigate('Assessment')}
            style={styles.gap}
          />
        </Card>
      ) : (
        items.map((item, idx) => (
          <TouchableOpacity
            key={`${item.kind}-${item.id}`}
            activeOpacity={0.84}
            onPress={() => open(item)}
          >
            <Card style={styles.resultCard} delay={idx * 70}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: item.kind === 'ai' ? COLORS.mint100 : COLORS.indigo100 }
                  ]}
                >
                  <Ionicons
                    name={item.kind === 'ai' ? 'sparkles' : 'compass'}
                    size={22}
                    color={item.kind === 'ai' ? COLORS.mint600 : COLORS.indigo600}
                  />
                </View>
                <View style={styles.resultText}>
                  <View style={styles.kindRow}>
                    <Text
                      style={[
                        styles.kindBadge,
                        item.kind === 'ai'
                          ? styles.kindBadgeAi
                          : styles.kindBadgeGuided
                      ]}
                    >
                      {item.kind === 'ai' ? 'AI' : 'Guided'}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {new Date(item.createdAt).toLocaleDateString('en-AU')}
                    </Text>
                  </View>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  {!!item.subtitle && (
                    <Text style={styles.resultSub}>{item.subtitle}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => remove(item)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.rose600} />
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

function toGuidedItem(result: AssessmentResult): UnifiedItem {
  const top = result.recommendations[0];
  return {
    id: result.id,
    kind: 'guided',
    title: result.title,
    createdAt: result.createdAt,
    subtitle: top ? `Top match: ${top.visa.code} - ${top.visa.name}` : ''
  };
}

function toAIItem(result: AIAnalysisResult): UnifiedItem {
  const top = result.payload.recommendations[0];
  return {
    id: result.id,
    kind: 'ai',
    title: result.title,
    createdAt: result.createdAt,
    subtitle: top ? `Top match: ${top.subclass} - ${top.name}` : ''
  };
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
  emptyTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 19,
    marginTop: 12
  },
  gap: {
    marginTop: 16
  },
  resultCard: {
    marginBottom: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultText: {
    flex: 1
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  kindBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden'
  },
  kindBadgeAi: {
    backgroundColor: COLORS.mint100,
    color: COLORS.mint600
  },
  kindBadgeGuided: {
    backgroundColor: COLORS.indigo100,
    color: COLORS.indigo600
  },
  resultTitle: {
    color: COLORS.slate900,
    fontWeight: '900',
    fontSize: 16
  },
  resultMeta: {
    color: COLORS.slate500,
    fontSize: 12
  },
  resultSub: {
    color: COLORS.slate700,
    marginTop: 4,
    fontWeight: '700',
    fontSize: 13
  },
  deleteButton: {
    padding: 8
  }
});
