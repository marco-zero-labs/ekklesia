import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, TextLink } from '@/components/Button';
import { useFeedback } from '@/components/Feedback';
import { Choice } from '@/components/Field';
import { Notice } from '@/components/List';
import { SetupActions, SetupPage } from '@/components/SetupPage';
import { Txt } from '@/components/Txt';
import { useRepo, useViewer } from '@/data/DataProvider';
import { convertRows, FIELD_LABEL, guessMapping, ImportField, SAMPLE_CSV, TEMPLATE_CSV } from '@/domain/importer';
import { parseCsv } from '@/lib/csv';
import { readPickedText, saveTextFile } from '@/lib/download';
import { fmtInt } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { useLayout } from '@/theme/useLayout';

type Sheet = { fileName: string; header: string[]; rows: string[][] };

/** Etapa 4: importar pessoas (CSV), com a conferência das colunas antes de gravar. */
export default function Importar() {
  const viewer = useViewer();
  const repo = useRepo();
  const { toast } = useFeedback();
  const { wide } = useLayout();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = (fileName: string, text: string) => {
    const data = parseCsv(text);
    if (data.length < 2) {
      setError('A planilha precisa ter uma linha de cabeçalho e pelo menos uma pessoa.');
      return;
    }
    setError(null);
    setSheet({ fileName, header: data[0], rows: data.slice(1) });
    setMapping(guessMapping(data[0]));
  };
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const asset = r.assets[0];
    if (/\.xlsx?$/i.test(asset.name)) {
      setError('Arquivos .xlsx ainda não são lidos. No Excel, use Arquivo › Salvar como › CSV e escolha o arquivo de novo.');
      return;
    }
    try {
      load(asset.name, await readPickedText(asset as { uri: string; file?: Blob }));
    } catch (e) {
      setError(`Não foi possível ler o arquivo: ${(e as Error).message}`);
    }
  };

  const preview = useMemo(() => (sheet ? convertRows(sheet.rows, mapping) : null), [sheet, mapping]);
  const hasName = mapping.includes('name');

  const finish = async (importRows: boolean) => {
    setSaving(true);
    let undo: (() => Promise<void>) | undefined;
    let count = 0;
    if (importRows && preview) {
      const r = await repo.importPeople(preview.rows, viewer.userId);
      undo = r.undo;
      count = r.count;
    }
    await repo.updateChurch({ setupDone: true, setupStep: 4 }, viewer.userId);
    router.replace('/pessoas');
    toast(importRows ? `${fmtInt(count)} pessoas importadas` : 'Configuração concluída', undo);
  };

  return (
    <SetupPage
      step={4}
      title="Importar pessoas"
      subtitle="Confira como cada coluna foi lida antes de importar. Nada é salvo até você confirmar."
      footer={
        <SetupActions>
          <Button kind="text" label="Voltar" onPress={() => router.back()} />
          <Button label="Começar do zero, sem importar" onPress={() => finish(false)} />
          {sheet ? <Button kind="primary" main label={`Importar ${fmtInt(preview?.rows.length ?? 0)} pessoas`} disabled={!hasName || !preview?.rows.length} loading={saving} onPress={() => finish(true)} /> : null}
        </SetupActions>
      }
    >
      {!sheet ? (
        <View style={{ gap: 12 }}>
          <Txt>Exporte a planilha de membros como CSV (no Excel: Arquivo › Salvar como › CSV) e escolha o arquivo.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Button kind="primary" label="Escolher arquivo CSV" onPress={pick} />
            <Button label="Usar planilha de exemplo" onPress={() => load('membros_exemplo.csv', SAMPLE_CSV)} />
          </View>
          <TextLink small label="Baixar planilha-modelo (.csv)" onPress={() => saveTextFile('planilha-modelo-limen.csv', TEMPLATE_CSV, 'text/csv')} />
          {error ? <Txt color={colors.error}>{error}</Txt> : null}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16 }}>
            <Txt w={500}>{sheet.fileName}</Txt>
            <Txt v="small" muted tabular>
              {fmtInt(sheet.rows.length)} linhas · {sheet.header.length} colunas
            </Txt>
            <TextLink small label="Trocar arquivo" onPress={() => setSheet(null)} />
          </View>
          <View>
            {wide ? (
              <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <Txt v="label" color={colors.inkHead} style={{ flex: 1 }}>
                  Coluna na planilha
                </Txt>
                <Txt v="label" color={colors.inkHead} style={{ flex: 1 }}>
                  Campo no Limen
                </Txt>
                <Txt v="label" color={colors.inkHead} style={{ flex: 1.3 }}>
                  Exemplo da 1ª linha
                </Txt>
              </View>
            ) : null}
            {sheet.header.map((h, i) => (
              <View key={`${h}${i}`} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line2, gap: 8 }}>
                <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 0 : 2 }}>
                  <Txt w={500} style={{ flex: wide ? 1 : undefined }}>
                    {h || `Coluna ${i + 1}`}
                  </Txt>
                  <View style={{ flex: wide ? 1 : undefined, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Txt muted={mapping[i] === 'skip'}>{FIELD_LABEL[mapping[i]]}</Txt>
                    <TextLink small label="Trocar" accessibilityLabel={`Trocar o campo da coluna ${h}`} onPress={() => setEditing(editing === i ? null : i)} />
                  </View>
                  <Txt v="small" muted tabular style={{ flex: wide ? 1.3 : undefined }}>
                    {sheet.rows[0]?.[i] || '—'}
                  </Txt>
                </View>
                {editing === i ? (
                  <Choice<ImportField>
                    label={`Campo para “${h}”`}
                    value={mapping[i]}
                    onChange={(f) => {
                      setMapping((m) => m.map((x, k) => (k === i ? f : x === f && f !== 'skip' ? 'skip' : x)));
                      setEditing(null);
                    }}
                    options={(Object.keys(FIELD_LABEL) as ImportField[]).map((f) => ({ value: f, label: FIELD_LABEL[f] }))}
                  />
                ) : null}
              </View>
            ))}
          </View>
          <Notice tone={preview && (preview.badDates || preview.noPhone || !hasName) ? 'pending' : 'neutral'}>
            {!hasName ? <Txt color={colors.amberText} w={500}>Escolha qual coluna é o Nome para importar.</Txt> : null}
            {preview?.badDates ? <Txt>{preview.badDates} {preview.badDates === 1 ? 'data em formato desconhecido' : 'datas em formato desconhecido'}: ficam em branco; revise depois em Pessoas</Txt> : null}
            {preview?.noPhone ? <Txt>{preview.noPhone} {preview.noPhone === 1 ? 'pessoa sem telefone' : 'pessoas sem telefone'}: serão importadas mesmo assim</Txt> : null}
            {preview?.noName ? <Txt>{preview.noName} {preview.noName === 1 ? 'linha sem nome será ignorada' : 'linhas sem nome serão ignoradas'}</Txt> : null}
            <Txt>Todos entram com consentimento LGPD pendente</Txt>
          </Notice>
        </>
      )}
    </SetupPage>
  );
}
