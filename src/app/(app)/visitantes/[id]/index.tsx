import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';
import { Choice } from '@/components/Field';
import { NoAccess, NotFound } from '@/components/NoAccess';
import { Detail, Page, Section } from '@/components/Page';
import { Pending, Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { contactResultLabel, contactTypeLabel, Person, Stage, stageLabel, STAGES } from '@/data/types';
import { AppData, teamIds, useAppData } from '@/data/useAppData';
import { consentMessage, consentText } from '@/domain/consent';
import { attempts } from '@/domain/followup';
import { canManageVisitors, canRegisterContact, canSeePrayerRequest, canSeeVisitor } from '@/domain/permissions';
import { dueLabel, fmtDayMonth, fmtDayShort, lastSunday, todayDay, addDays } from '@/lib/dates';
import { isMobilePhone, whatsappLink } from '@/lib/format';
import { publicUrl } from '@/lib/links';
import { colors } from '@/theme/tokens';

export default function Visitante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewer = useViewer();
  const q = useAppData();
  if (!q.data) {
    return (
      <Page back="/visitantes" title="Visitante">
        <DataState error={q.error} reload={q.reload} what="o visitante" />
      </Page>
    );
  }
  const p = q.data.byId.get(id);
  if (!p || !p.followUp) return <NotFound back="/visitantes" what="Visitante" />;
  if (!canSeeVisitor(viewer, p)) return <NoAccess back="/visitantes" what="este visitante" />;
  return <VisitanteView p={p} d={q.data} />;
}

function VisitanteView({ p, d }: { p: Person; d: AppData }) {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const fu = p.followUp!;
  const today = todayDay();
  const [editStage, setEditStage] = useState(false);
  const [editResp, setEditResp] = useState(false);
  const manage = canManageVisitors(viewer);
  const due = fu.nextContact ? dueLabel(fu.nextContact, today) : null;

  // presença: domingos desde a 1ª visita
  const S = lastSunday(today);
  const sundays: string[] = [];
  for (let s = S; s >= fu.firstVisit.slice(0, 10) && sundays.length < 52; s = addDays(s, -7)) sundays.push(s);
  const present = sundays.filter((s) => p.presence.includes(s)).length;

  const consent = consentText(p.consent);
  const history = [
    ...fu.contacts.map((c) => ({ at: c.at, key: c.id, title: c.note ?? (c.result ? `${contactResultLabel(c.result)}.` : ''), meta: `${contactTypeLabel(c.type)} · ${d.name(c.byId)}${c.result && c.note ? ` · ${contactResultLabel(c.result).toLowerCase()}` : ''}` })),
    ...fu.stageHistory.map((h, i) => ({ at: h.at, key: `s${i}`, title: `Etapa: ${stageLabel(h.from)} → ${stageLabel(h.to)}`, meta: d.name(h.byId) })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const changeStage = async (s: Stage) => {
    setEditStage(false);
    if (s === fu.stage) return;
    const undo = await repo.setStage(p.id, s, viewer.userId);
    toast(s === 'membro' ? `${p.name} agora é membro` : `Etapa: ${stageLabel(s)}`, undo);
  };
  const changeResp = async (r: string) => {
    setEditResp(false);
    const undo = await repo.setResponsible(p.id, r === 'nenhum' ? null : r, viewer.userId);
    toast(r === 'nenhum' ? 'Sem responsável' : `Responsável: ${d.name(r)}`, undo);
  };
  const sendConsent = async () => {
    if (!p.phone) return;
    const msg = consentMessage(p.name, d.church.name, publicUrl(`/termo?p=${p.id}`));
    await Linking.openURL(whatsappLink(p.phone, msg));
    const undo = await repo.requestConsent(p.id, viewer.userId);
    toast('Pedido de consentimento enviado', undo);
  };

  return (
    <Page
      back="/visitantes"
      title={p.name}
      subtitle={`1ª visita em ${fmtDayMonth(fu.firstVisit)} · ${fu.firstVisitService}`}
      action={canRegisterContact(viewer, p) && fu.stage !== 'membro' ? <Button kind="primary" main label="Registrar contato" onPress={() => router.push(`/visitantes/${p.id}/contato`)} /> : undefined}
    >
      <View>
        <Detail label="Etapa" right={manage && !editStage ? <TextLink small label="Mudar etapa" onPress={() => setEditStage(true)} /> : undefined}>
          {editStage ? (
            <View style={{ gap: 8 }}>
              <Choice<Stage> label="Nova etapa" layout="list" value={fu.stage} onChange={changeStage} options={STAGES.map((s) => ({ value: s.value, label: s.label, hint: s.value === 'membro' ? 'Encerra o acompanhamento' : undefined }))} />
              <TextLink small label="Cancelar" onPress={() => setEditStage(false)} />
            </View>
          ) : (
            <Txt>{stageLabel(fu.stage)}</Txt>
          )}
        </Detail>
        {fu.stage !== 'membro' ? (
          <Detail label="Próximo contato">
            {due ? (
              due.overdue ? (
                <Pending tabular>
                  {due.text} ({fmtDayMonth(fu.nextContact!)})
                </Pending>
              ) : (
                <Txt tabular>{due.text === fmtDayShort(fu.nextContact!) ? due.text : `${due.text} (${fmtDayMonth(fu.nextContact!)})`}</Txt>
              )
            ) : (
              <Txt muted>Sem data</Txt>
            )}
          </Detail>
        ) : null}
        <Detail label="Responsável" right={manage && !editResp ? <TextLink small label={fu.responsibleId ? 'Trocar' : 'Atribuir'} onPress={() => setEditResp(true)} /> : undefined}>
          {editResp ? (
            <View style={{ gap: 8 }}>
              <Choice<string>
                label="Responsável"
                layout="list"
                value={fu.responsibleId ?? 'nenhum'}
                onChange={changeResp}
                options={[...teamIds(d.people).map((id) => ({ value: id, label: d.name(id) })), { value: 'nenhum', label: 'Sem responsável' }]}
              />
              <TextLink small label="Cancelar" onPress={() => setEditResp(false)} />
            </View>
          ) : fu.responsibleId ? (
            <Txt>{d.name(fu.responsibleId)}</Txt>
          ) : (
            <Txt muted>Sem responsável</Txt>
          )}
        </Detail>
        <Detail label="Telefone">
          {p.phone ? (
            <Txt tabular>
              {p.phone}
              <Txt muted>{isMobilePhone(p.phone) ? ' · celular' : ' · fixo'}</Txt>
            </Txt>
          ) : (
            <Txt muted>Não informado</Txt>
          )}
        </Detail>
        <Detail label="Quem convidou">{p.invitedBy ? <Txt>{p.invitedBy}</Txt> : <Txt muted>{fu.howFound ?? 'Não informado'}</Txt>}</Detail>
        <Detail label="Presença">
          <Txt tabular>
            {present} de {sundays.length} <Txt muted>{sundays.length === 1 ? 'domingo desde a 1ª visita' : 'domingos desde a 1ª visita'}</Txt>
          </Txt>
        </Detail>
        <Detail label="Consentimento LGPD">
          {consent.pending ? <Pending>{consent.text}</Pending> : <Txt>{consent.text}</Txt>}
          {consent.note ? (
            <Txt v="small" muted>
              {consent.note}
            </Txt>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 }}>
            <TextLink small label="Ver termo" onPress={() => router.push('/termo')} />
            {p.consent.status !== 'dado' && p.phone && manage ? <TextLink small label="Enviar pedido de consentimento" onPress={sendConsent} /> : null}
          </View>
        </Detail>
        {p.prayerRequest && canSeePrayerRequest(viewer) ? (
          <Detail label="Pedido de oração">
            <Txt>{p.prayerRequest}</Txt>
            <Txt v="small" muted>
              Dado sensível · visível só para o pastor
            </Txt>
          </Detail>
        ) : null}
      </View>

      <Section title="Histórico de contatos" right={<Txt v="small" muted tabular>{`${attempts(fu.contacts).length} ${attempts(fu.contacts).length === 1 ? 'tentativa' : 'tentativas'}`}</Txt>}>
        {history.map((h) => (
          <View key={h.key} style={{ flexDirection: 'row', gap: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
            <Txt v="label" color={colors.inkHead} tabular style={{ width: 56, paddingTop: 2 }}>
              {fmtDayMonth(h.at.slice(0, 10))}
            </Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt>{h.title}</Txt>
              <Txt v="small" muted>
                {h.meta}
              </Txt>
            </View>
          </View>
        ))}
      </Section>
    </Page>
  );
}
