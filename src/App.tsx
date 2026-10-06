import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { dictionaries, digits, storedLang, type Dict, type Lang } from './i18n';
import { I18nContext } from './i18nContext';
import { canMatch, initialState, reducer } from './store';
import { computeAllStatuses } from './lib/status';
import { groupDuplicates } from './lib/duplicates';
import { parseRequirements, type RequirementsIssue } from './lib/requirements';
import { MAX_FILES, MAX_TOTAL_BYTES, inspectPdf, looksLikePdf } from './lib/pdfInfo';
import { sha256Hex } from './lib/hash';
import { suggestMatches } from './lib/automatch';
import { PackageBuildError, buildPackage, packageFileName } from './lib/buildPackage';
import { toCsv } from './lib/csv';
import { renderBanglaLabels } from './lib/banglaLabels';
import { localToday } from './lib/dates';
import type { FileProblem, Requirement, UploadedFile } from './lib/types';
import { TopBar } from './components/TopBar';
import { Welcome, RequirementsError } from './components/Welcome';
import { FilePanel } from './components/FilePanel';
import { Checklist } from './components/Checklist';
import { GenerateBar, type Blocker } from './components/GenerateBar';
import { Toasts, type Toast, type ToastKind } from './components/Toasts';
import { IconUpload } from './components/Icons';

const SAMPLE_BASE = './sample/';

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function App() {
  const [lang, setLang] = useState<Lang>(storedLang);
  const t = dictionaries[lang];
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [issues, setIssues] = useState<RequirementsIssue[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flashId, setFlashId] = useState<string>();
  const [includeIndex, setIncludeIndex] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [lastPackage, setLastPackage] = useState<{ url: string; name: string } | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const jsonInput = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  const toast = useCallback((kind: ToastKind, message: (t: Dict) => string) => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-4), { id, kind, message }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), kind === 'error' ? 9000 : 5500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tpb.lang', lang);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const tender = state.data?.tender;
  useEffect(() => {
    document.title = tender ? `${tender.tender_id} · ${t.appName}` : t.appName;
  }, [tender, t]);

  // ---------- requirements ----------
  const loadRequirementsText = useCallback(
    (text: string, sample: boolean) => {
      const result = parseRequirements(text);
      if (!result.ok) {
        setIssues(result.issues);
        return;
      }
      setIssues(null);
      setIsSample(sample);
      dispatch({ type: 'loadRequirements', data: result.data });
      const n = result.data.requirements.length;
      toast('success', (d) => d.requirementsLoaded(n));
    },
    [toast],
  );

  const openJsonFile = useCallback(
    async (file: File) => loadRequirementsText(await file.text(), false),
    [loadRequirementsText],
  );

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch(`${SAMPLE_BASE}requirements.json`);
      loadRequirementsText(await res.text(), true);
    } catch {
      setIssues([{ code: 'invalid_json' }]);
    }
  }, [loadRequirementsText]);

  // ---------- files ----------
  const addFiles = useCallback(
    async (incoming: File[]) => {
      const json = incoming.filter((f) => /\.json$/i.test(f.name));
      if (json.length) {
        await openJsonFile(json[0]);
        incoming = incoming.filter((f) => !json.includes(f));
      }
      if (!incoming.length) return;
      if (!stateRef.current.data) return;

      let count = stateRef.current.files.length;
      let total = stateRef.current.files.reduce((s, f) => s + f.size, 0);
      let tooMany = 0;
      const notPdf: string[] = [];
      const accepted: UploadedFile[] = [];
      for (const file of incoming) {
        if (count >= MAX_FILES) {
          tooMany++;
          continue;
        }
        if (file.size === 0) {
          toast('error', (d) => d.rejectedEmpty(file.name));
          continue;
        }
        const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
        if (!looksLikePdf(file.name, file.type, head)) {
          notPdf.push(file.name);
          continue;
        }
        if (total + file.size > MAX_TOTAL_BYTES) {
          toast('error', (d) => d.rejectedTooLarge(file.name));
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          bytes: await file.arrayBuffer(),
          inspecting: true,
        });
        count++;
        total += file.size;
      }
      if (notPdf.length) toast('error', (d) => d.rejectedNotPdf(notPdf));
      if (tooMany) toast('error', (d) => d.rejectedTooMany(tooMany));
      if (!accepted.length) return;
      dispatch({ type: 'addFiles', files: accepted });

      const problems: { name: string; problem: FileProblem }[] = [];
      for (const f of accepted) {
        const [hash, info] = await Promise.all([sha256Hex(f.bytes), inspectPdf(f.bytes)]);
        dispatch({ type: 'updateFile', id: f.id, patch: { hash, inspecting: false, ...info } });
        if (info.problem) problems.push({ name: f.name, problem: info.problem });
      }
      if (problems.length) toast('error', (d) => d.fileProblemToast(problems));
    },
    [openJsonFile, toast],
  );

  const loadSampleFiles = useCallback(async () => {
    try {
      const manifest: string[] = await (await fetch(`${SAMPLE_BASE}manifest.json`)).json();
      const files = await Promise.all(
        manifest.map(async (name) => {
          const blob = await (await fetch(`${SAMPLE_BASE}documents/${encodeURIComponent(name)}`)).blob();
          const type = name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type;
          return new File([blob], name, { type });
        }),
      );
      await addFiles(files);
    } catch {
      toast('error', (d) => d.generateFailedGeneric);
    }
  }, [addFiles, toast]);

  // ---------- derived ----------
  const requirements = useMemo(() => state.data?.requirements ?? [], [state.data]);
  const deadline = tender?.submission_deadline ?? '';
  const statuses = useMemo(
    () => computeAllStatuses(requirements, state.matches, state.expiries, deadline),
    [requirements, state.matches, state.expiries, deadline],
  );
  const groups = useMemo(() => groupDuplicates(state.files), [state.files]);

  const usedBy = useMemo(() => {
    const map = new Map<string, Requirement>();
    for (const req of requirements) {
      const fid = state.matches[req.id];
      if (fid) map.set(fid, req);
    }
    return map;
  }, [requirements, state.matches]);

  const suggestions = useMemo(() => {
    const open = requirements.filter((r) => !state.matches[r.id]);
    const available = state.files.filter((f) => !f.inspecting && !f.problem && !usedBy.has(f.id));
    const raw = suggestMatches(available, open);
    const out: Record<string, string> = {};
    for (const [reqId, fileId] of Object.entries(raw)) if (canMatch(state, reqId, fileId)) out[reqId] = fileId;
    return out;
  }, [requirements, state, usedBy]);

  const title = useCallback((r: Requirement) => (lang === 'bn' ? r.title_bn : r.title_en), [lang]);

  const blockers: Blocker[] = useMemo(
    () =>
      requirements.flatMap((r) => {
        const s = statuses[r.id];
        if (!s?.blocking) return [];
        const text =
          s.code === 'missing'
            ? t.blockerMissing(r.order, title(r))
            : s.code === 'expiry_needed'
              ? t.blockerExpiry(r.order, title(r))
              : t.blockerExpired(r.order, title(r), digits(s.expiry ?? '', lang));
        return [{ reqId: r.id, code: s.code, text }];
      }),
    [requirements, statuses, t, title, lang],
  );

  const counted = requirements.filter((r) => statuses[r.id]?.code !== 'not_provided');
  const readyCount = counted.filter((r) => statuses[r.id]?.code === 'ok').length;

  // ---------- actions ----------
  const focusRequirement = useCallback((reqId: string) => {
    const el = document.getElementById(`req-${reqId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(undefined);
    requestAnimationFrame(() => setFlashId(reqId));
    window.setTimeout(() => setFlashId((cur) => (cur === reqId ? undefined : cur)), 1800);
    window.setTimeout(() => {
      const target = el.querySelector<HTMLElement>('input[type="date"]') ?? el.querySelector<HTMLElement>('select');
      target?.focus({ preventScroll: true });
    }, 350);
  }, []);

  const acceptAllSuggestions = useCallback(() => {
    for (const [reqId, fileId] of Object.entries(suggestions)) dispatch({ type: 'match', reqId, fileId });
  }, [suggestions]);

  const generate = useCallback(async () => {
    const s = stateRef.current;
    if (!s.data || blockers.length || progress) return;
    const matched = s.data.requirements.flatMap((req) => {
      const file = s.files.find((f) => f.id === s.matches[req.id]);
      return file ? [{ req, file }] : [];
    });
    const items = matched.map(({ req, file }) => ({ req, fileName: file.name, bytes: file.bytes }));
    setProgress({ done: 0, total: matched.reduce((n, m) => n + (m.file.pageCount ?? 0), 0) });
    try {
      const bengaliLabels = includeIndex
        ? await renderBanglaLabels(matched.map((m) => m.req)).catch(() => undefined)
        : undefined;
      const result = await buildPackage({
        tender: s.data.tender,
        items,
        generatedOn: localToday(),
        includeIndex,
        bengaliLabels,
        onProgress: async (done, total) => {
          if (done % 4 === 0 || done === total) {
            setProgress({ done, total });
            await new Promise((r) => setTimeout(r, 0));
          }
        },
      });
      const name = packageFileName(s.data.tender.tender_id);
      const url = URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: 'application/pdf' }));
      setLastPackage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url, name };
      });
      download(url, name);
      toast('success', (d) => d.generatedToast(name, result.totalPages));
    } catch (err) {
      console.error(err);
      if (err instanceof PackageBuildError) {
        const names = err.failedFiles.join(', ');
        toast('error', (d) => d.generateFailed(names));
      } else {
        toast('error', (d) => d.generateFailedGeneric);
      }
    } finally {
      setProgress(null);
    }
  }, [blockers.length, progress, includeIndex, toast]);

  const exportCsv = useCallback(() => {
    const s = stateRef.current;
    if (!s.data) return;
    const rows = s.data.requirements.map((r) => {
      const file = s.files.find((f) => f.id === s.matches[r.id]);
      return [r.order, title(r), r.mandatory ? t.yes : t.no, file?.name ?? '', file?.pageCount ?? '', s.expiries[r.id] ?? '', t.status[statuses[r.id].code]];
    });
    const blob = new Blob([toCsv(t.csvHeader, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    download(url, `${s.data.tender.tender_id}_Checklist.csv`);
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [statuses, t, title]);

  // ---------- page-level drag and drop ----------
  const dragDepth = useRef(0);
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current++;
      setPageDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setPageDrag(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setPageDrag(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) void addFiles(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [addFiles]);

  return (
    <I18nContext.Provider value={{ lang, t }}>
      <div className={`app ${state.data ? 'app--loaded' : ''}`} lang={lang}>
        {state.data && (
          <a className="skip-link" href="#checklist-title">
            {t.skipToChecklist}
          </a>
        )}
        <TopBar tender={tender} onLangChange={setLang} onChangeTender={() => jsonInput.current?.click()} />
        <input
          ref={jsonInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void openJsonFile(file);
          }}
        />

        {!state.data ? (
          <Welcome issues={issues} onOpen={() => jsonInput.current?.click()} onSample={loadSample} />
        ) : (
          <>
            {issues && (
              <div className="layout-alert">
                <RequirementsError issues={issues} />
              </div>
            )}
            <main className="layout" id="main">
              <FilePanel
                files={state.files}
                groups={groups}
                usedBy={usedBy}
                suggestionCount={Object.keys(suggestions).length}
                showSampleFiles={isSample}
                onAddFiles={(f) => void addFiles(f)}
                onRemove={(id) => dispatch({ type: 'removeFile', id })}
                onAcceptAllSuggestions={acceptAllSuggestions}
                onLoadSampleFiles={() => void loadSampleFiles()}
              />
              <Checklist
                state={state}
                requirements={requirements}
                statuses={statuses}
                groups={groups}
                suggestions={suggestions}
                flashId={flashId}
                readyText={t.checklistSummary(readyCount, counted.length)}
                dispatch={dispatch}
              />
            </main>
            <GenerateBar
              ready={readyCount}
              total={counted.length}
              blockers={blockers}
              progress={progress}
              includeIndex={includeIndex}
              lastPackage={lastPackage}
              canExport={requirements.length > 0}
              onIncludeIndex={setIncludeIndex}
              onBlockerClick={focusRequirement}
              onGenerate={() => void generate()}
              onExportCsv={exportCsv}
            />
          </>
        )}

        {pageDrag && (
          <div className="drop-overlay" aria-hidden="true">
            <div className="drop-overlay__card">
              <IconUpload size={32} />
              <p>{state.data ? t.dropActive : t.dropJsonHint}</p>
            </div>
          </div>
        )}
        <Toasts toasts={toasts} onDismiss={(id) => setToasts((l) => l.filter((x) => x.id !== id))} />
      </div>
    </I18nContext.Provider>
  );
}
