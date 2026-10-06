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
import { Sidebar } from './components/Sidebar';
import { TenderHeader } from './components/TenderHeader';
import { Welcome, RequirementsError } from './components/Welcome';
import { FilePanel } from './components/FilePanel';
import { Checklist, type Tab } from './components/Checklist';
import { Preview } from './components/Preview';
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
  const counts = useMemo(() => {
    const c = { ok: 0, attention: 0, missing: 0, optional: 0, total: 0 };
    for (const r of requirements) {
      const code = statuses[r.id]?.code;
      if (code === 'ok') c.ok++;
      else if (code === 'expired' || code === 'expiry_needed') c.attention++;
      else if (code === 'missing') c.missing++;
      else if (code === 'not_provided') c.optional++;
    }
    c.total = c.ok + c.attention + c.missing;
    return c;
  }, [requirements, statuses]);

  // ---------- layout state ----------
  const [tab, setTab] = useState<Tab>('checklist');
  const [previewId, setPreviewId] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1700px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1700px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const previewFile = state.files.find((f) => f.id === previewId) ?? (wide ? state.files.find((f) => !f.problem && !f.inspecting) : undefined);

  const openPreview = useCallback((id: string) => {
    setPreviewId(id);
    setDrawerOpen(true);
  }, []);

  const removeFile = useCallback((id: string) => {
    dispatch({ type: 'removeFile', id });
    setPreviewId((cur) => (cur === id ? undefined : cur));
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const stepsDone = [Boolean(state.data), state.files.length > 0, state.files.length > 0 && blockers.length === 0, Boolean(lastPackage)];
  const stepsEnabled = [true, Boolean(state.data), Boolean(state.data), Boolean(state.data)];
  const goToStep = useCallback(
    (i: number) => {
      if (i === 0) {
        if (!stateRef.current.data) jsonInput.current?.click();
        else document.querySelector('.tender-card')?.scrollIntoView({ behavior: 'smooth' });
      } else if (i === 1) {
        document.getElementById('files-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.getElementById('file-input')?.click();
      } else if (i === 2) {
        setTab('checklist');
        document.getElementById('tab-checklist')?.focus();
      } else {
        setTab('summary');
        document.getElementById('generate-bar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.querySelector<HTMLElement>('.genbar__go')?.focus();
      }
    },
    [],
  );

  // ---------- actions ----------
  const focusRequirement = useCallback((reqId: string) => {
    setTab('checklist');
    window.setTimeout(() => focusRow(reqId), 30);
  }, []);

  const focusRow = useCallback((reqId: string) => {
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
          <a className="skip-link" href="#tab-checklist">
            {t.skipToChecklist}
          </a>
        )}
        <Sidebar done={stepsDone} enabled={stepsEnabled} onStep={goToStep} onLangChange={setLang} />
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
          <main className="main" id="main">
            {issues && <RequirementsError issues={issues} />}
            <TenderHeader tender={tender!} counts={counts} onChangeTender={() => jsonInput.current?.click()} />
            <div className="workspace">
              <FilePanel
                files={state.files}
                groups={groups}
                usedBy={usedBy}
                suggestionCount={Object.keys(suggestions).length}
                showSampleFiles={isSample}
                selectedId={previewFile?.id}
                onSelect={openPreview}
                onAddFiles={(f) => void addFiles(f)}
                onRemove={removeFile}
                onAcceptAllSuggestions={acceptAllSuggestions}
                onLoadSampleFiles={() => void loadSampleFiles()}
              />
              <Checklist
                state={state}
                requirements={requirements}
                statuses={statuses}
                groups={groups}
                suggestions={suggestions}
                blockers={blockers}
                includeIndex={includeIndex}
                flashId={flashId}
                tab={tab}
                onTab={setTab}
                onBlockerClick={focusRequirement}
                onPreview={openPreview}
                dispatch={dispatch}
              />
              {wide ? (
                <Preview file={previewFile} usedBy={previewFile && usedBy.get(previewFile.id)} onRemove={removeFile} />
              ) : (
                drawerOpen &&
                previewFile && (
                  <div className="drawer" role="dialog" aria-modal="true" aria-label={t.previewTitle} onKeyDown={(e) => e.key === 'Escape' && setDrawerOpen(false)}>
                    <div className="drawer__scrim" onClick={() => setDrawerOpen(false)} />
                    <div className="drawer__panel">
                      <Preview file={previewFile} usedBy={usedBy.get(previewFile.id)} onRemove={removeFile} onClose={() => setDrawerOpen(false)} />
                    </div>
                  </div>
                )
              )}
            </div>
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
              onShowAllIssues={() => setTab('issues')}
              onGenerate={() => void generate()}
              onExportCsv={exportCsv}
            />
          </main>
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
