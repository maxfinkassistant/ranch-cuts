/* State for the partner CRM: loads every doc from the store once, keeps
   them in memory, and writes each change straight through (optimistic:
   the screen updates first, a failed save shows a banner and is kept
   on screen so nothing typed is lost). */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assemble, openStore, overlayOf, newId, slugId, ACTIVITY_KINDS, STAGE_RANK,
  type Doc, type DocKind, type Rec, type RancherRec, type ButcherRec, type Pair, type Activity,
  type ActivityKind, type Stage, type Rancher, type Butcher,
} from "../../lib/crm";

export const OWNERS = ["Max", "Josh", "McLane"];
const ME_KEY = "rc.crm.me";

export function useMe(): [string, (m: string) => void] {
  const [me, setMeState] = useState(() => {
    try { return localStorage.getItem(ME_KEY) || "Max"; } catch { return "Max"; }
  });
  const setMe = (m: string) => {
    setMeState(m);
    try { localStorage.setItem(ME_KEY, m); } catch { /* ignore */ }
  };
  return [me, setMe];
}

export interface LogInput {
  kind: ActivityKind;
  summary: string;
  stage?: Stage;
  nextStep?: string;
  nextDate?: string;
}

export function useCrm(key: string, me: string) {
  const store = useMemo(() => openStore(key), [key]);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await store.all());
    } catch (e) {
      setError(`Couldn't load the CRM: ${(e as Error).message}`);
      setDocs((d) => d ?? []);
    }
  }, [store]);
  useEffect(() => { load(); }, [load]);

  const data = useMemo(() => assemble(docs ?? []), [docs]);

  const write = useCallback(async (doc: Doc) => {
    setDocs((d) => [...(d ?? []).filter((x) => !(x.kind === doc.kind && x.id === doc.id)), doc]);
    setSaving((n) => n + 1);
    try {
      await store.put(doc);
    } catch (e) {
      setError(`Not saved (${(e as Error).message}). Your change is still on screen; try again or refresh.`);
    } finally {
      setSaving((n) => n - 1);
    }
  }, [store]);

  const remove = useCallback(async (kind: DocKind, id: string) => {
    setDocs((d) => (d ?? []).filter((x) => !(x.kind === kind && x.id === id)));
    try { await store.del(kind, id); } catch (e) { setError(`Not deleted: ${(e as Error).message}`); }
  }, [store]);

  const doc = (kind: DocKind, id: string, data: Record<string, unknown>): Doc =>
    ({ kind, id, data, updatedAt: new Date().toISOString(), by: me });

  /** Save edits to a rancher or butcher (only the team's fields are stored for researched records). */
  const saveRec = useCallback((rec: Rec, patch: Partial<Rec>) => {
    const next = { ...rec, ...patch } as Rec;
    return write(doc(rec.kind, rec.id, overlayOf(next)));
  }, [write, me]);

  const addRancher = useCallback((r: Partial<Rancher>) => {
    const id = slugId("R", r.name || "ranch", r.state || "xx");
    const rec: Rancher = {
      id, name: "", town: "", state: "", zip: "", lat: null, lon: null, metro: "", website: "", phone: "", email: "",
      contactName: "", finishType: "Unknown", finishConfidence: "Likely", finishEvidence: "", evidenceUrl: "",
      raisedFromBirth: "Unknown", sellsShares: "", postedPrice: "", currentProcessor: "", usesPartnerButcher: false,
      ownsButcher: false, nearestButcherId: "", currentButcherId: "", roadMiToButcher: null, roadMiToMetro: null,
      herd: "", breed: "", researchNotes: "", fitScore: 0, fitTier: "B", ...r, added: true,
    };
    write(doc("rancher", id, { ...rec, stage: "new", owner: me }));
    return id;
  }, [write, me]);

  const addButcher = useCallback((b: Partial<Butcher>) => {
    const id = slugId("B", b.name || "butcher", b.state || "xx");
    const rec: Butcher = {
      id, name: "", dba: "", city: "", state: "", zip: "", lat: null, lon: null, metro: "", inLaunchMetro: true,
      roadMiToMetro: null, phone: "", website: "", inspection: "", size: "", fitScore: 0, listPriority: "Added in CRM",
      disqualified: false, disqualifier: "", doesCustomBeef: "Unknown", takesOutsideCattle: "Unknown",
      postedKill: null, postedPerLb: null, postedSplit: null, researchNotes: "", priceSourceUrl: "", capableWithin60: 0,
      ...b, added: true,
    };
    write(doc("butcher", id, { ...rec, stage: "new", owner: me }));
    return id;
  }, [write, me]);

  const savePair = useCallback((p: Pair, patch: Partial<Pair> = {}) => {
    const next = { ...p, ...patch };
    return write(doc("pair", next.id, next as unknown as Record<string, unknown>));
  }, [write, me]);

  const addPair = useCallback((r: RancherRec, b: ButcherRec, origin = "Proposed in the CRM") => {
    const p: Pair = { id: newId("P"), rancherId: r.id, butcherId: b.id, metro: r.metro || b.metro, origin, stage: "proposed", owner: me };
    savePair(p);
    return p.id;
  }, [savePair, me]);

  const deleteActivity = useCallback((a: Activity) => remove("activity", a.id), [remove]);

  /** Log a call/visit/note. Bumps last contact and attempts, nudges the stage forward
      (never backward) unless one is picked, and sets the follow-up. */
  const log = useCallback((ref: Rec | Pair, input: LogInput) => {
    const refKind = "kind" in ref ? ref.kind : "pair";
    const a: Activity = {
      id: newId("A"), refKind, refId: ref.id, kind: input.kind, summary: input.summary.trim(), by: me,
      at: new Date().toISOString(),
    };
    write(doc("activity", a.id, a as unknown as Record<string, unknown>));
    const k = ACTIVITY_KINDS.find((x) => x.id === input.kind)!;
    const follow = { nextStep: input.nextStep ?? "", nextDate: input.nextDate ?? "" };
    if (refKind === "pair") {
      savePair(ref as Pair, follow);
      return;
    }
    const rec = ref as Rec;
    let stage = input.stage ?? rec.stage;
    if (!input.stage) {
      const auto: Stage | null = k.contact && input.kind !== "email" && input.kind !== "text" ? "connected" : k.attempt ? "attempted" : null;
      if (auto && STAGE_RANK[auto] > STAGE_RANK[rec.stage] && STAGE_RANK[rec.stage] >= 0) stage = auto;
    }
    saveRec(rec, {
      ...follow,
      stage,
      lastContact: k.attempt || k.contact ? a.at : rec.lastContact,
      attempts: (rec.attempts ?? 0) + (k.attempt ? 1 : 0),
      owner: rec.owner || me,
    });
  }, [write, saveRec, savePair, me]);

  return {
    loading: docs === null, error, setError, saving: saving > 0, reload: load, ...data,
    saveRec, addRancher, addButcher, savePair, addPair, log, deleteActivity,
  };
}

export type Crm = ReturnType<typeof useCrm>;
