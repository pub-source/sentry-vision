import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WakeWord {
  id: string;
  phrase: string;
  is_emergency: boolean;
}

interface HouseholdMember {
  id: string;
  display_name: string;
  phone_number: string;
}

export function useHousehold(userId: string | undefined) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [wakeWords, setWakeWords] = useState<WakeWord[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) return;
    setHouseholdId(membership.household_id);

    const [wwRes, memRes] = await Promise.all([
      supabase.from('wake_words').select('*').eq('household_id', membership.household_id),
      supabase.from('household_members').select('*').eq('household_id', membership.household_id),
    ]);

    setWakeWords(wwRes.data || []);
    setMembers(memRes.data || []);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkForWakeWord = useCallback((transcript: string): { matched: boolean; phrase: string; isEmergency: boolean } => {
    const lower = transcript.toLowerCase();
    for (const ww of wakeWords) {
      if (lower.includes(ww.phrase.toLowerCase())) {
        return { matched: true, phrase: ww.phrase, isEmergency: ww.is_emergency };
      }
    }
    return { matched: false, phrase: '', isEmergency: false };
  }, [wakeWords]);

  const logAlert = useCallback(async (alertType: string, message: string, snapshotUrl?: string) => {
    if (!householdId || !userId) return;
    await supabase.from('alert_history').insert({
      household_id: householdId,
      alert_type: alertType,
      message,
      triggered_by: userId,
      snapshot_url: snapshotUrl,
    });
  }, [householdId, userId]);

  return { householdId, wakeWords, members, checkForWakeWord, logAlert, refetch: fetchData };
}
