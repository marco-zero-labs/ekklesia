import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { Tabs } from '@/components/List';
import { Page } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useViewer } from '@/data/DataProvider';
import { Activity } from '@/data/types';
import { AppData, useAppData } from '@/data/useAppData';
import { activitiesBetween, scheduleStatus } from '@/domain/activities';
import { canEditAgenda } from '@/domain/permissions';
import { addDays, fmtDayShort, fmtTime, fmtWeekRange, parseDay, startOfWeek, todayDay, weekdayShort } from '@/lib/dates';
import { colors, radius } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

/** Pendência de escala de uma atividade: "Louvor: bateria sem escala". */
function pendingOf(d: AppData, a: Activity): string | null {
  for (const s of d.schedules.filter((x) => x.activityId === a.id)) {
    const st = scheduleStatus(s);
    if (st.empty > 0) {
      const m = d.ministries.find((x) => x.id === s.ministryId);
      const roles = s.slots.filter((x) => !x.personId || x.status === 'recusou').map((x) => x.role.toLowerCase());
      return `${m?.name}: ${roles.join(', ')} sem escala`;
    }
  }
  return null;
}

export default function Agenda() {
  const viewer = useViewer();
  const { wide } = useLayout();
  const q = useAppData();
  const today = todayDay();
  const [monday, setMonday] = useState(startOfWeek(today));
  const [view, setView] = useState<'semana' | 'lista'>('semana');
  const action = canEditAgenda(viewer) ? <Button kind="primary" main label="Nova atividade" onPress={() => router.push(`/agenda/nova?data=${monday > today ? monday : today}`)} /> : undefined;
  if (!q.data) {
    return (
      <Page title="Agenda" subtitle={fmtWeekRange(monday)} action={action} maxWidth={wide ? 1100 : undefined}>
        <DataState error={q.error} reload={q.reload} what="a agenda" />
      </Page>
    );
  }
  const d = q.data;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const acts = activitiesBetween(d.services, d.events, monday, addDays(monday, 6));
  const incomplete = acts.filter((a) => pendingOf(d, a)).length;

  return (
    <Page
      title="Agenda"
      subtitle={`${fmtWeekRange(monday)} · ${acts.length} ${acts.length === 1 ? 'atividade' : 'atividades'}${incomplete ? ` · ${incomplete} ${incomplete === 1 ? 'escala incompleta' : 'escalas incompletas'}` : ''}`}
      action={action}
      maxWidth={view === 'semana' && wide ? 1100 : undefined}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button label="←" accessibilityLabel="Semana anterior" onPress={() => setMonday(addDays(monday, -7))} />
        <Button label="Hoje" disabled={monday === startOfWeek(today)} onPress={() => setMonday(startOfWeek(today))} />
        <Button label="→" accessibilityLabel="Próxima semana" onPress={() => setMonday(addDays(monday, 7))} />
      </View>
      <Tabs<'semana' | 'lista'>
        label="Visualização"
        value={view}
        onChange={setView}
        tabs={[
          { value: 'semana', label: 'Semana' },
          { value: 'lista', label: 'Lista' },
        ]}
      />
      {view === 'semana' && wide ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {days.map((day) => (
            <View key={day} style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <View style={{ paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: day === today ? colors.petrol600 : colors.line }}>
                <Txt v="label" color={day === today ? colors.petrol600 : colors.inkHead}>
                  {weekdayShort(day)} {parseDay(day).getDate()}
                  {day === today ? ' · hoje' : ''}
                </Txt>
              </View>
              {acts
                .filter((a) => a.date === day)
                .map((a) => (
                  <Block key={a.id} a={a} pending={pendingOf(d, a)} />
                ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {days.map((day) => {
            const list = acts.filter((a) => a.date === day);
            return (
              <View key={day} style={{ gap: 6 }}>
                <Txt v="label" color={day === today ? colors.petrol600 : colors.inkHead}>
                  {fmtDayShort(day)}
                  {day === today ? ' · hoje' : ''}
                </Txt>
                {list.length === 0 ? (
                  <Txt v="small" muted>
                    Nada marcado.
                  </Txt>
                ) : (
                  list.map((a) => <Block key={a.id} a={a} pending={pendingOf(d, a)} row />)
                )}
              </View>
            );
          })}
        </View>
      )}
    </Page>
  );
}

/** Bloco de atividade (raio 4px, borda de 1px). */
function Block({ a, pending, row }: { a: Activity; pending: string | null; row?: boolean }) {
  const extra = a.info ?? a.location;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${a.title}, ${fmtDayShort(a.date)} às ${fmtTime(a.time)}, ${extra}${pending ? `. ${pending}` : ''}`}
      onPress={() => router.push(`/agenda/${encodeURIComponent(a.id)}`)}
      style={(s) => ({
        borderWidth: 1,
        borderColor: colors.line,
        borderLeftWidth: 3,
        borderLeftColor: pending ? colors.amberIcon : colors.petrol600,
        borderRadius: radius.sm,
        padding: 8,
        minHeight: 44,
        gap: 2,
        flexDirection: row ? 'row' : 'column',
        alignItems: row ? 'flex-start' : undefined,
        columnGap: 12,
        backgroundColor: (s as { hovered?: boolean }).hovered || s.pressed ? colors.hover : colors.surface,
      })}
    >
      <Txt v="small" tabular muted style={row ? { width: 48 } : undefined}>
        {fmtTime(a.time)}
      </Txt>
      <View style={{ flex: row ? 1 : undefined, gap: 2 }}>
        <Txt v="small" w={500} color={colors.ink}>
          {a.title}
        </Txt>
        <Txt v="small" muted>
          {extra}
        </Txt>
        {pending ? <Pending v="small">{pending}</Pending> : null}
      </View>
    </Pressable>
  );
}
