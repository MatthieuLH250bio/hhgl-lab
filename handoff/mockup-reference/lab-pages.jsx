// Reusable shell — topbar + collapsible sidebar with active route.
// All views (Home, Cahier, Database, Protocoles, SampleDetail) plug into this.

const { useState: useStateShell } = React;

// chevron icons
const CHEV_DOWN = <><path d="m6 9 6 6 6-6"/></>;
const CHEV_RIGHT = <><path d="m9 6 6 6-6 6"/></>;

const ROUTES = {
  workspace: [
    { id: 'home',     label: 'Accueil',         icon: ICONS.notebook, count: null,    pinned: true },
    { id: 'cahier',   label: 'Cahier de labo',  icon: ICONS.notebook, count: '128' },
    { id: 'db',       label: 'Base de données', icon: ICONS.flask,    count: '2,418' },
    { id: 'biblio',   label: 'Bibliographie',   icon: ICONS.notebook, count: '164' },
    { id: 'proto',    label: 'Protocoles',      icon: ICONS.folder,   count: '42' },
  ],
  tools: [
    { id: 'plasmid',  label: 'Plasmid Studio',  icon: ICONS.dna },
    { id: 'micro',    label: 'Microscopie',     icon: ICONS.micro },
    { id: 'calc',     label: 'Outils de calcul',icon: ICONS.calc },
    { id: 'align',    label: 'Alignement',      icon: ICONS.align },
    { id: 'stats',    label: 'Stats',           icon: ICONS.chart },
  ],
};

function AppShell({ active = 'home', dark, titleFont, children, route = 'workspace' }) {
  const [toolsOpen, setToolsOpen] = useStateShell(active === 'home' || route === 'tools');
  const [wsOpen, setWsOpen] = useStateShell(true);
  const fontStack = '"Inter Tight", system-ui, -apple-system, sans-serif';

  return (
    <div style={{
      width:'100%', height:'100%',
      display:'grid',
      gridTemplateColumns:'220px 1fr',
      gridTemplateRows:'44px 1fr',
      gridTemplateAreas:'"topbar topbar" "sidebar main"',
      fontFamily: fontStack,
      color:'var(--fg)', background:'var(--bg)',
      overflow:'hidden',
    }}>
      {/* topbar */}
      <div style={{
        gridArea:'topbar', display:'flex', alignItems:'center', gap:12, padding:'0 14px',
        background:'var(--surface)', borderBottom:'1px solid var(--border)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:8, paddingRight:14, borderRight:'1px solid var(--border)', height:'100%'}}>
          <div style={{
            width:22, height:22, borderRadius:5,
            background:'var(--primary)', color:'var(--surface)',
            display:'grid', placeItems:'center', fontSize:12, fontWeight:700,
          }}>H</div>
          <div style={{fontSize:13, fontWeight:600, fontFamily: titleFont || fontStack, letterSpacing:'.02em'}}>HHGL</div>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:8, height:28, padding:'0 10px',
          background:'var(--surface-2)', borderRadius:'var(--radius)',
          color:'var(--fg-subtle)', fontSize:12, flex:'0 0 320px',
        }}>
          <Icon d={ICONS.search} size={13} />
          <span>Recherche globale…</span>
          <span style={{marginLeft:'auto', fontSize:10, padding:'1px 5px', border:'1px solid var(--border)', borderRadius:3}} className="mono">⌘K</span>
        </div>
        <div style={{flex:1}} />
        <div style={{display:'flex', alignItems:'center', gap:6, color:'var(--fg-muted)'}}>
          <button style={topBtn}><Icon d={ICONS.plus} size={13}/> Nouveau</button>
          <div style={{width:1, height:20, background:'var(--border)', margin:'0 4px'}} />
          <Icon d={dark ? ICONS.sun : ICONS.moon} size={15} />
          <Icon d={ICONS.settings} size={15} />
          <div style={{
            width:24, height:24, borderRadius:'50%',
            background:'var(--primary-soft)', color:'var(--primary)',
            display:'grid', placeItems:'center', fontSize:11, fontWeight:600, marginLeft:4,
          }}>LM</div>
        </div>
      </div>

      {/* sidebar */}
      <div style={{
        gridArea:'sidebar', padding:'12px 8px',
        background:'var(--surface)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', gap:14, overflow:'hidden',
      }}>
        {/* WORKSPACE collapsible */}
        <div>
          <CollapsibleHeader open={wsOpen} onClick={() => setWsOpen(o => !o)} label="Workspace" />
          {wsOpen && ROUTES.workspace.map(r => (
            <SidebarItem key={r.id} icon={r.icon} label={r.label} count={r.count}
                         active={active === r.id} />
          ))}
        </div>

        {/* TOOLS collapsible */}
        <div>
          <CollapsibleHeader open={toolsOpen} onClick={() => setToolsOpen(o => !o)} label="Tools"
                             count={ROUTES.tools.length} />
          {toolsOpen && ROUTES.tools.map(r => (
            <SidebarItem key={r.id} icon={r.icon} label={r.label}
                         active={active === r.id} />
          ))}
        </div>

        <div style={{marginTop:'auto', padding:'10px 8px', borderTop:'1px solid var(--border)',
                     fontSize:11, color:'var(--fg-subtle)', display:'flex', alignItems:'center', gap:8}}>
          <span style={{
            width:6, height:6, borderRadius:'50%', background:'var(--success)',
            boxShadow:'0 0 0 3px color-mix(in oklab, var(--success) 25%, transparent)',
          }}/>
          Local server · synced
        </div>
      </div>

      {/* main */}
      <div style={{ gridArea:'main', overflow:'auto' }}>
        {children}
      </div>
    </div>
  );
}

function CollapsibleHeader({ open, onClick, label, count }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'4px 10px 6px', cursor:'pointer',
      fontSize:10, textTransform:'uppercase', letterSpacing:'.08em',
      color:'var(--fg-subtle)', fontWeight:600,
      userSelect:'none',
    }}>
      <span style={{display:'inline-flex', transition:'transform .15s', transform: open ? 'rotate(0)' : 'rotate(-90deg)'}}>
        <Icon d={CHEV_DOWN} size={11} stroke={2}/>
      </span>
      <span style={{flex:1}}>{label}</span>
      {count != null && <span style={{color:'var(--fg-subtle)'}} className="mono">{count}</span>}
    </div>
  );
}

// ====================================================================
// PAGE: CAHIER DE LABO — calendar + entries list + reading pane
// ====================================================================
function PageCahier({ titleFont }) {
  const fontStack = '"Inter Tight", system-ui, sans-serif';
  const days = ['L','M','M','J','V','S','D'];
  const month = Array.from({length:30}, (_, i) => i+1);
  const today = 22;
  const eventDays = [3, 7, 12, 14, 18, 19, 22, 25];

  const entries = [
    { date:'22 Avr',  title:'Mutagenèse F42A — clonage 3', tags:['Cloning','IL-2'], excerpt:'PCR Q5 sur pET28a-IL2-WT, primers oIL2-fwd-NheI…' , active:true },
    { date:'19 Avr',  title:'Maxiprep clones #4 et #7',     tags:['DNA prep'],      excerpt:'Endo-free protocol, pool de 50mL O/N…' },
    { date:'18 Avr',  title:'HEK293T transfection P3',      tags:['Cell culture'],  excerpt:'PEI 1:3, plates 6cm, 2.5µg/well…' },
    { date:'14 Avr',  title:'Yeast Δhis3 — vérification',   tags:['Yeast','KO'],    excerpt:'PCR sur colonies isolées de la transformation…' },
    { date:'12 Avr',  title:'Western blot anti-IL2',        tags:['WB'],            excerpt:'Membrane PVDF, blocage 5% milk TBST 1h RT…' },
  ];

  return (
    <div style={{padding:'18px 24px', display:'grid', gridTemplateColumns:'300px 220px 1fr', gap:18, height:'100%', boxSizing:'border-box'}}>
      {/* left: TREE VIEW — projets → expériences → entrées */}
      <div style={{display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)'}}>
        <div style={{
          padding:'12px 14px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{fontSize:13, fontWeight:600, fontFamily: titleFont || fontStack}}>Arborescence</div>
          <div style={{display:'flex', gap:4, color:'var(--fg-muted)'}}>
            <button style={iconBtn}><Icon d={ICONS.search} size={12}/></button>
            <button style={iconBtn}><Icon d={ICONS.plus}   size={12}/></button>
          </div>
        </div>
        <div style={{overflow:'auto', padding:'8px 4px', flex:1}}>
          <TreeNode level={0} icon="folder" color="var(--primary)" label="IL-2 mutagenesis" count={28} open>
            <TreeNode level={1} icon="exp" label="F42A — clonage 3" count={6} open>
              <TreeLeaf level={2} id="ENT-2204" label="22/04 · Mutagenèse F42A — clonage 3" active />
              <TreeLeaf level={2} id="ENT-2104" label="21/04 · Transformation DH5α" />
              <TreeLeaf level={2} id="ENT-1904" label="19/04 · Maxiprep clones #4 et #7" />
            </TreeNode>
            <TreeNode level={1} icon="exp" label="Expression BL21" count={4}>
              <TreeLeaf level={2} id="ENT-1804" label="18/04 · Induction IPTG" />
            </TreeNode>
            <TreeNode level={1} icon="exp" label="Western blot anti-IL2" count={3}>
              <TreeLeaf level={2} id="ENT-1204" label="12/04 · WB anti-IL2" />
            </TreeNode>
          </TreeNode>

          <TreeNode level={0} icon="folder" color="var(--accent)" label="Innate signaling" count={14} open>
            <TreeNode level={1} icon="exp" label="HEK293T-TLR4 P3" count={2} open>
              <TreeLeaf level={2} id="ENT-1804b" label="18/04 · HEK293T transfection P3" />
            </TreeNode>
            <TreeNode level={1} icon="exp" label="LPS dose-response" count={3} />
          </TreeNode>

          <TreeNode level={0} icon="folder" color="var(--warning)" label="Yeast Δhis3 KO" count={9}>
            <TreeNode level={1} icon="exp" label="Vérification PCR" count={2}>
              <TreeLeaf level={2} id="ENT-1404" label="14/04 · Yeast Δhis3 — vérification" />
            </TreeNode>
          </TreeNode>

          <TreeNode level={0} icon="folder" color="var(--success)" label="Cas9 screen v3" count={5} />

          <div style={{padding:'8px 12px', marginTop:6, fontSize:12, color:'var(--fg-subtle)', display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
            <Icon d={ICONS.plus} size={11}/> Nouveau projet
          </div>
        </div>
      </div>

      {/* middle: COMPACT entry list */}
      <div style={{display:'flex', flexDirection:'column', overflow:'auto', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)'}}>
        <div style={{
          padding:'10px 12px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:6,
        }}>
          <div style={{fontSize:11, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em'}}>Récentes</div>
          <button style={{...iconBtn, width:22, height:22}}><Icon d={ICONS.plus} size={11}/></button>
        </div>
        {entries.map((e, i) => (
          <div key={i} style={{
            padding:'8px 12px', borderBottom:'1px solid var(--border)', cursor:'pointer',
            background: e.active ? 'var(--primary-soft)' : 'transparent',
          }}>
            <div className="mono" style={{fontSize:10, color:'var(--fg-subtle)', marginBottom:2}}>{e.date}</div>
            <div style={{fontSize:12, fontWeight: e.active ? 600 : 500, color: e.active ? 'var(--primary)' : 'var(--fg)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.3}}>
              {e.title}
            </div>
          </div>
        ))}
      </div>

      {/* right: reading pane */}
      <div style={{display:'flex', flexDirection:'column', overflow:'auto', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)'}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}}>
          <div className="mono" style={{fontSize:10.5, color:'var(--fg-subtle)', marginBottom:4}}>2026-04-22 · 09:42</div>
          <div style={{fontSize:16, fontWeight:600, lineHeight:1.25, fontFamily: titleFont || fontStack, letterSpacing:'-0.01em'}}>
            Mutagenèse F42A — clonage 3
          </div>
          <div style={{display:'flex', gap:6, marginTop:8}}>
            <span style={{padding:'1px 7px', borderRadius:999, fontSize:10.5, background:'color-mix(in oklab, var(--primary) 14%, transparent)', color:'var(--primary)', fontWeight:500}}>Cloning</span>
            <span style={{padding:'1px 7px', borderRadius:999, fontSize:10.5, background:'color-mix(in oklab, var(--accent) 14%, transparent)', color:'var(--accent)', fontWeight:500}}>IL-2</span>
          </div>
        </div>
        <div style={{padding:'14px 18px', fontSize:13, lineHeight:1.65}}>
          <p style={{margin:'0 0 10px'}}>
            Tentative #3 de mutagenèse dirigée. Optimisation du <b>Tm</b> à 62 °C suite à la dimer formation observée à 60 °C.
          </p>
          <p style={{margin:'0 0 10px'}}>
            <b>Réactifs</b> — Q5 2X master mix · primers IDT 100 µM · template pET28a-IL2-WT 50 ng/rxn · DpnI NEB.
          </p>
          <div style={{
            background:'var(--surface-2)', padding:'10px 12px', borderRadius:'var(--radius)',
            border:'1px solid var(--border)', margin:'10px 0',
          }} className="mono">
            <div style={{fontSize:10.5, color:'var(--fg-subtle)', marginBottom:4}}>Cycling</div>
            <div style={{fontSize:11.5, lineHeight:1.7}}>
              98 °C / 30 s<br/>
              <b>25 ×</b> (98 °C 10s · 62 °C 20s · 72 °C 3min)<br/>
              72 °C / 5 min · 4 °C ∞
            </div>
          </div>
          <p style={{margin:'10px 0 14px', color:'var(--fg-muted)'}}>
            → <span style={{color:'var(--success)', fontWeight:600}}>Résultat :</span> 8 / 12 clones séquence-vérifiés. Clone #7 sélectionné.
          </p>

          {/* RESULTS — numeric KPIs */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, margin:'14px 0',
          }}>
            {[
              {k:'Rendement',        v:'186', u:'ng/µL', tone:'var(--success)'},
              {k:'A260/A280',         v:'1.86', u:'',     tone:'var(--success)'},
              {k:'Clones positifs',  v:'8/12', u:'',     tone:'var(--primary)'},
              {k:'Efficacité',       v:'67',  u:'%',    tone:'var(--accent)'},
            ].map(kpi => (
              <div key={kpi.k} style={{
                border:'1px solid var(--border)', borderRadius:'var(--radius)',
                background:'var(--surface-2)', padding:'8px 10px',
              }}>
                <div style={{fontSize:9.5, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2}}>{kpi.k}</div>
                <div className="mono" style={{fontSize:15, fontWeight:600, color: kpi.tone, lineHeight:1.1}}>
                  {kpi.v}<span style={{fontSize:10, color:'var(--fg-subtle)', marginLeft:3, fontWeight:500}}>{kpi.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* RESULTS — image attachments grid */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
            <ResultImage kind="gel"   caption="Gel agarose 1% — PCR clones #1-12" filename="gel_F42A_220426.tif" />
            <ResultImage kind="micro" caption="Microscopie BL21+IL2-mut7 — 24h post-induction" filename="BL21_IL2_24h_5x.czi" />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
            <ResultImage kind="chrom" caption="Électrophérogramme clone #7 (NheI → BamHI)" filename="seq_clone7_F42A.ab1" />
            <ResultImage kind="plate" caption="Box LB+Kan — transformation DH5α" filename="plate_DH5a_220420.jpg" />
          </div>

          <div style={{
            marginTop:14, paddingTop:12, borderTop:'1px dashed var(--border)',
            fontSize:11, color:'var(--fg-subtle)', display:'flex', justifyContent:'space-between'
          }}>
            <span>Léa M.</span>
            <span style={{display:'inline-flex', alignItems:'center', gap:4}}><Icon d={ICONS.link} size={11}/> 3 références</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// PAGE: BIBLIOGRAPHIE — papers tracker
// ====================================================================
function PageBiblio({ titleFont }) {
  const fontStack = '"Inter Tight", system-ui, sans-serif';
  const papers = [
    {
      id:'BIB-0142', status:'Lu',          year:2024,
      title:'Engineered IL-2 muteins with reduced T-reg activity',
      authors:'Klein, A. et al.', journal:'Nat. Biotechnol.',
      tags:['IL-2','Mutein','Engineering'],
      summary:'Identifie 4 mutations (F42A, Y45A, L72G, E62K) qui découplent IL-2Rα et IL-2Rβ. F42A garde l’affinité β/γ mais perd α — utilisable comme orthogonal cytokine.',
      active:true,
    },
    {
      id:'BIB-0141', status:'Partiel',     year:2023,
      title:'Q5 high-fidelity polymerase — mutagenesis benchmark',
      authors:'Liu, P. & Chen, R.',     journal:'Methods Mol. Biol.',
      tags:['Q5','Mutagenesis','PCR'],
      summary:'Lu intro + figures 1–3. Le Tm optimal pour les primers ≥ 30 nt est entre 60–65 °C. À finir : section discussion sur secondary structures.',
    },
    {
      id:'BIB-0140', status:'À lire',      year:2025,
      title:'CRISPR screening at scale in primary T cells',
      authors:'Park, J. et al.',         journal:'Cell',
      tags:['CRISPR','T cell','Screen'],
      summary:'',
    },
    {
      id:'BIB-0139', status:'Lu',         year:2022,
      title:'pET28a backbone — expression optimization in BL21(DE3)',
      authors:'Rosenberg, M.',           journal:'Protein Expr. Purif.',
      tags:['pET28a','BL21','Expression'],
      summary:'IPTG 0.5 mM est l’optimum, pas 1 mM (tox). Induction à OD 0.6–0.8, 18 °C O/N pour les prot éines insolubles.',
    },
    {
      id:'BIB-0138', status:'À lire',     year:2025,
      title:'Single-cell transcriptomics of TLR4 signaling',
      authors:'Yamamoto, K. et al.',     journal:'Immunity',
      tags:['scRNA-seq','TLR4','Innate'],
      summary:'',
    },
  ];

  const statusStyle = (s) => ({
    'Lu':       { bg:'color-mix(in oklab, var(--success) 14%, transparent)', fg:'var(--success)' },
    'Partiel':  { bg:'color-mix(in oklab, var(--warning) 14%, transparent)', fg:'var(--warning)' },
    'À lire':   { bg:'var(--surface-2)',                                     fg:'var(--fg-muted)' },
  })[s];

  return (
    <div style={{display:'grid', gridTemplateColumns:'200px 1fr 380px', height:'100%'}}>
      {/* status rail */}
      <div style={{padding:'18px 12px', borderRight:'1px solid var(--border)', overflow:'auto'}}>
        <div style={{fontSize:10, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em', padding:'0 8px 8px'}}>Statut</div>
        {[
          {label:'Tous',     count:'164', active:true},
          {label:'À lire',  count:'58'},
          {label:'Partiel',  count:'27'},
          {label:'Lu',       count:'79'},
          {label:'Favoris',  count:'14'},
        ].map(c => (
          <div key={c.label} style={{
            display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
            borderRadius:'var(--radius)', cursor:'pointer',
            background: c.active ? 'var(--primary-soft)' : 'transparent',
            color: c.active ? 'var(--primary)' : 'var(--fg-muted)',
            fontSize:13, fontWeight: c.active ? 600 : 500,
          }}>
            <span style={{flex:1}}>{c.label}</span>
            <span className="mono" style={{fontSize:10.5, color: c.active ? 'var(--primary)' : 'var(--fg-subtle)'}}>{c.count}</span>
          </div>
        ))}
        <div style={{fontSize:10, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em', padding:'18px 8px 8px'}}>Tags</div>
        {['IL-2','CRISPR','TLR4','Mutagenesis','scRNA-seq'].map(t => (
          <div key={t} style={{padding:'5px 10px', fontSize:12, color:'var(--fg-muted)', cursor:'pointer'}}>#{t}</div>
        ))}
      </div>

      {/* paper list */}
      <div style={{display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid var(--border)'}}>
        <div style={{padding:'16px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
          <div>
            <div style={{fontSize:18, fontWeight:600, fontFamily: titleFont, letterSpacing:'-0.01em'}}>Bibliographie</div>
            <div className="mono" style={{fontSize:11, color:'var(--fg-subtle)', marginTop:3}}>164 papiers · 79 lus · 27 partiels · 58 à lire</div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button style={topBtn}><Icon d={ICONS.search} size={12}/> DOI / PMID</button>
            <button style={topBtn}>
              <Icon d={<><path d="M14 3v5h5"/><path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 14v-3"/><path d="M7 12.5h4"/></>} size={12}/>
              Importer PDF
            </button>
            <button style={primaryBtn}><Icon d={ICONS.plus} size={12}/> Ajouter</button>
          </div>
        </div>
        <div style={{
          margin:'12px 24px 0', padding:'14px 16px',
          border:'1.5px dashed var(--border-strong)', borderRadius:'var(--radius)',
          background:'color-mix(in oklab, var(--primary) 4%, transparent)',
          display:'flex', alignItems:'center', gap:14,
        }}>
          <div style={{
            width:38, height:38, borderRadius:8,
            background:'var(--primary-soft)', color:'var(--primary)',
            display:'grid', placeItems:'center', flexShrink:0,
          }}>
            <Icon d={<><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 17v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/></>} size={18}/>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:12.5, fontWeight:600, color:'var(--fg)', marginBottom:2}}>
              Glissez un PDF ici pour l'importer
            </div>
            <div style={{fontSize:11, color:'var(--fg-muted)'}}>
              Métadonnées extraites automatiquement (titre, auteurs, DOI, abstract) · stockage local
            </div>
          </div>
          <button style={topBtn}>Parcourir…</button>
        </div>
        <div style={{overflow:'auto'}}>
          {papers.map(p => (
            <div key={p.id} style={{
              padding:'14px 24px', borderBottom:'1px solid var(--border)', cursor:'pointer',
              background: p.active ? 'var(--primary-soft)' : 'transparent',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:5}}>
                <span style={{display:'inline-block', padding:'1px 7px', borderRadius:999, fontSize:10.5, fontWeight:600, ...statusStyle(p.status)}}>{p.status}</span>
                <span className="mono" style={{fontSize:10.5, color:'var(--fg-subtle)'}}>{p.id}</span>
                {p.tags.slice(0,3).map(t => (
                  <span key={t} style={{padding:'1px 7px', borderRadius:999, fontSize:10.5, background:'var(--surface-2)', color:'var(--fg-muted)'}}>{t}</span>
                ))}
              </div>
              <div style={{fontSize:13.5, fontWeight: p.active ? 600 : 500, color: p.active ? 'var(--primary)' : 'var(--fg)', lineHeight:1.35, marginBottom:4}}>
                {p.title}
              </div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>
                {p.authors} · <i>{p.journal}</i> · {p.year}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* summary pane */}
      <div style={{display:'flex', flexDirection:'column', overflow:'auto', background:'var(--surface)'}}>
        <div style={{padding:'18px 22px', borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <span style={{display:'inline-block', padding:'1px 7px', borderRadius:999, fontSize:10.5, fontWeight:600, ...statusStyle('Lu')}}>Lu</span>
            <span className="mono" style={{fontSize:11, color:'var(--fg-subtle)'}}>BIB-0142 · 2024</span>
          </div>
          <div style={{fontSize:16, fontWeight:600, lineHeight:1.3, fontFamily: titleFont, letterSpacing:'-0.01em'}}>
            Engineered IL-2 muteins with reduced T-reg activity
          </div>
          <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:6}}>
            Klein, A. et al. · <i>Nat. Biotechnol.</i> · 2024
          </div>
          <div style={{display:'flex', gap:6, marginTop:12}}>
            <button style={topBtn}><Icon d={ICONS.link} size={11}/> DOI</button>
            <button style={topBtn}>PDF</button>
            <button style={{...topBtn, marginLeft:'auto'}}><Icon d={ICONS.star} size={11}/></button>
          </div>
        </div>

        <div style={{padding:'14px 22px'}}>
          <div style={{fontSize:10, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8}}>Résumé personnel</div>
          <div style={{
            border:'1px solid var(--border)', borderRadius:'var(--radius)',
            padding:'10px 12px', background:'var(--surface-2)',
            fontSize:12.5, lineHeight:1.6, minHeight:120, color:'var(--fg)',
          }}>
            Identifie 4 mutations (<b>F42A</b>, Y45A, L72G, E62K) qui découplent IL-2Rα et IL-2Rβ. <b>F42A</b> garde l’affinité β/γ mais perd α — utilisable comme orthogonal cytokine pour cibler CD8+ sans activer T-reg.
            <br/><br/>
            <span style={{color:'var(--fg-muted)'}}>→ à tester sur notre construct pET28a-IL2 (voir PLA-0118).</span>
          </div>
          <div style={{display:'flex', gap:6, marginTop:8, fontSize:11, color:'var(--fg-subtle)'}}>
            <span>Modifié le 22 Avr</span>
            <span style={{marginLeft:'auto', color:'var(--primary)', cursor:'pointer'}}>Éditer</span>
          </div>

          <div style={{fontSize:10, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em', margin:'18px 0 8px'}}>Lié à</div>
          <LinkedRow type="Plasmid" id="PLA-0118" name="pET28a-IL2-mut7" />
          <LinkedRow type="Project" id="PRJ-IL2"  name="IL-2 mutagenesis" />
        </div>
      </div>
    </div>
  );
}

// ----- result image placeholder -----
function ResultImage({ kind, caption, filename }) {
  const palettes = {
    gel:   { bg:'#0c0c0f', fg:'#94a3b8', accent:'#7dd3fc', label:'GEL' },
    micro: { bg:'#0a0d12', fg:'#a3a3a3', accent:'#34d399', label:'MICRO' },
    chrom: { bg:'var(--surface-2)', fg:'var(--fg-muted)', accent:'var(--primary)', label:'SEQ' },
    plate: { bg:'var(--surface-2)', fg:'var(--fg-muted)', accent:'var(--accent)',  label:'PLATE' },
  }[kind] || { bg:'var(--surface-2)', fg:'var(--fg-muted)', accent:'var(--primary)', label:'IMG' };

  return (
    <div style={{
      border:'1px solid var(--border)', borderRadius:'var(--radius)',
      overflow:'hidden', background:'var(--surface)',
    }}>
      <div style={{
        height:88, background: palettes.bg, position:'relative', overflow:'hidden',
      }}>
        {kind === 'gel' && <GelSVG fg={palettes.fg} accent={palettes.accent} />}
        {kind === 'micro' && <MicroSVG fg={palettes.fg} accent={palettes.accent} />}
        {kind === 'chrom' && <ChromSVG fg={palettes.fg} accent={palettes.accent} />}
        {kind === 'plate' && <PlateSVG fg={palettes.fg} accent={palettes.accent} />}
        <span style={{
          position:'absolute', top:6, left:8,
          fontSize:9, fontWeight:700, letterSpacing:'.1em',
          color: palettes.accent, fontFamily:'"JetBrains Mono", monospace',
        }}>{palettes.label}</span>
      </div>
      <div style={{padding:'7px 10px', borderTop:'1px solid var(--border)'}}>
        <div style={{fontSize:11.5, fontWeight:500, color:'var(--fg)', lineHeight:1.3}}>{caption}</div>
        <div className="mono" style={{fontSize:10, color:'var(--fg-subtle)', marginTop:2}}>{filename}</div>
      </div>
    </div>
  );
}

const GelSVG = ({fg, accent}) => (
  <svg width="100%" height="100%" viewBox="0 0 220 88" preserveAspectRatio="none">
    {Array.from({length:12}).map((_,i)=> (
      <g key={i}>
        <rect x={6 + i*17} y={4} width={14} height={80} fill="#000" opacity=".25"/>
        <rect x={8 + i*17} y={26 + (i%3)*4} width={10} height={3} fill={accent} opacity={i===6 ? 1 : .55}/>
        <rect x={8 + i*17} y={48 + (i%2)*3} width={10} height={2.5} fill={fg} opacity={.6}/>
        <rect x={8 + i*17} y={66} width={10} height={2} fill={fg} opacity={.4}/>
      </g>
    ))}
  </svg>
);
const MicroSVG = ({fg, accent}) => (
  <svg width="100%" height="100%" viewBox="0 0 220 88">
    <defs>
      <radialGradient id="mg" cx="50%" cy="50%"><stop offset="0%" stopColor={accent} stopOpacity=".25"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
    </defs>
    <rect width="220" height="88" fill="url(#mg)"/>
    {Array.from({length:24}).map((_,i)=>{
      const x = 10 + (i*23)%200 + (i%3)*5;
      const y = 10 + ((i*17)%70);
      const r = 3 + (i%4);
      return <circle key={i} cx={x} cy={y} r={r} fill={accent} opacity={.4 + (i%5)/10}/>;
    })}
  </svg>
);
const ChromSVG = ({fg, accent}) => (
  <svg width="100%" height="100%" viewBox="0 0 220 88">
    {[accent, '#ef4444', '#22c55e', '#eab308'].map((c,i)=>(
      <path key={c} d={`M0 ${50 + i*4} ${Array.from({length:30}).map((_,j)=> `L${j*7.5} ${50 + i*4 - Math.sin(j*.6 + i)*15 - (j%5===i ? 18 : 0)}`).join(' ')}`} stroke={c} strokeWidth={1} fill="none" opacity={.85}/>
    ))}
  </svg>
);
const PlateSVG = ({fg, accent}) => (
  <svg width="100%" height="100%" viewBox="0 0 220 88">
    <circle cx="110" cy="44" r="38" fill="none" stroke={fg} strokeWidth={1.5} opacity=".4"/>
    {Array.from({length:32}).map((_,i)=> {
      const a = (i*97)%360 * Math.PI/180;
      const r = 5 + (i%3)*8;
      return <circle key={i} cx={110 + Math.cos(a)*r*2} cy={44 + Math.sin(a)*r*1.2} r={1.5 + (i%3)*.5} fill={accent} opacity={.7}/>;
    })}
  </svg>
);

// ====================================================================
// PAGE: BASE DE DONNÉES — table view
// ====================================================================
function PageDatabase({ titleFont }) {
  const fontStack = '"Inter Tight", system-ui, sans-serif';
  const rows = [
    { id:'PLA-0118', name:'pET28a-IL2-mut7',          type:'Plasmid',   status:'Verified',   project:'IL-2 mutagenesis', loc:'Box 14-C · A3', conc:'142 ng/µL',   user:'A.R.', date:'19 Avr' },
    { id:'STR-0421', name:'BL21(DE3)-IL2-mut7',       type:'Strain',    status:'Active',     project:'IL-2 mutagenesis', loc:'-80 · R3-12',  conc:'—',           user:'L.M.', date:'21 Avr' },
    { id:'CEL-0339', name:'HEK293T-TLR4 (clone 4)',   type:'Cell line', status:'In use',     project:'Innate signaling', loc:'N2 · T1-04',   conc:'5×10⁶/mL',    user:'S.K.', date:'18 Avr' },
    { id:'OLI-2207', name:'oIL2-fwd-NheI',            type:'Oligo',     status:'Stock',      project:'IL-2 mutagenesis', loc:'Box 7 · D1',   conc:'100 µM',      user:'L.M.', date:'17 Avr' },
    { id:'OLI-2208', name:'oIL2-rev-NheI',            type:'Oligo',     status:'Stock',      project:'IL-2 mutagenesis', loc:'Box 7 · D2',   conc:'100 µM',      user:'L.M.', date:'17 Avr' },
    { id:'STR-0418', name:'S. cerevisiae BY4741 Δhis3',type:'Strain',   status:'Quarantine', project:'Yeast Δhis3 KO',   loc:'-80 · R5-02',  conc:'—',           user:'M.B.', date:'14 Avr' },
    { id:'CEL-0337', name:'Jurkat-Cas9 (pool)',       type:'Cell line', status:'Active',     project:'Cas9 screen v3',   loc:'N2 · T2-09',   conc:'2×10⁶/mL',    user:'S.K.', date:'10 Avr' },
    { id:'AB-0042',  name:'anti-IL2 (rabbit, mAb)',   type:'Antibody',  status:'Stock',      project:'IL-2 mutagenesis', loc:'-20 · F1-08',  conc:'1 mg/mL',     user:'A.R.', date:'02 Avr' },
    { id:'PLA-0117', name:'pET28a-IL2-WT',            type:'Plasmid',   status:'Verified',   project:'IL-2 mutagenesis', loc:'Box 14-C · A2',conc:'186 ng/µL',   user:'A.R.', date:'28 Mar' },
  ];
  const statusColor = (s) => ({
    'Active':     { bg:'color-mix(in oklab, var(--success) 14%, transparent)', fg:'var(--success)' },
    'Verified':   { bg:'color-mix(in oklab, var(--primary) 14%, transparent)', fg:'var(--primary)' },
    'In use':     { bg:'color-mix(in oklab, var(--accent) 14%, transparent)',  fg:'var(--accent)' },
    'Stock':      { bg:'var(--surface-2)',                                      fg:'var(--fg-muted)' },
    'Quarantine': { bg:'color-mix(in oklab, var(--warning) 16%, transparent)', fg:'var(--warning)' },
  })[s];

  const cats = [
    { key:'all',     label:'Tous',         count:'2,418', active:true },
    { key:'plasmid', label:'Plasmides',    count:'612' },
    { key:'strain',  label:'Souches',      count:'318' },
    { key:'cell',    label:'Lignées',      count:'76'  },
    { key:'oligo',   label:'Primers',      count:'1,084' },
    { key:'ab',      label:'Anticorps',    count:'164' },
    { key:'virus',   label:'Virus',        count:'42'  },
  ];

  return (
    <div style={{display:'grid', gridTemplateColumns:'200px 1fr', height:'100%'}}>
      {/* category rail */}
      <div style={{padding:'18px 12px', borderRight:'1px solid var(--border)', overflow:'auto'}}>
        <div style={{fontSize:10, fontWeight:600, color:'var(--fg-subtle)', textTransform:'uppercase', letterSpacing:'.08em', padding:'0 8px 8px'}}>Catégories</div>
        {cats.map(c => (
          <div key={c.key} style={{
            display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
            borderRadius:'var(--radius)', cursor:'pointer',
            background: c.active ? 'var(--primary-soft)' : 'transparent',
            color: c.active ? 'var(--primary)' : 'var(--fg-muted)',
            fontSize:13, fontWeight: c.active ? 600 : 500,
          }}>
            <span style={{flex:1}}>{c.label}</span>
            <span className="mono" style={{fontSize:10.5, color: c.active ? 'var(--primary)' : 'var(--fg-subtle)'}}>{c.count}</span>
          </div>
        ))}
      </div>

      {/* table area */}
      <div style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'16px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
          <div>
            <div style={{fontSize:18, fontWeight:600, fontFamily: titleFont, letterSpacing:'-0.01em'}}>Base de données</div>
            <div className="mono" style={{fontSize:11, color:'var(--fg-subtle)', marginTop:3}}>2,418 items · filtres : tous · trié par date</div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <div style={{
              display:'flex', alignItems:'center', gap:6, height:30, padding:'0 10px',
              background:'var(--surface-2)', borderRadius:'var(--radius)',
              fontSize:12, color:'var(--fg-subtle)', minWidth:240,
            }}>
              <Icon d={ICONS.search} size={12}/>
              <span>Filtrer dans la table…</span>
            </div>
            <button style={topBtn}><Icon d={ICONS.filter} size={12}/> Filtres</button>
            <button style={primaryBtn}><Icon d={ICONS.plus} size={12}/> Ajouter</button>
          </div>
        </div>

        <div style={{overflow:'auto', flex:1}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:12.5}}>
            <thead>
              <tr style={{background:'var(--surface-2)', color:'var(--fg-subtle)', fontSize:10.5, textTransform:'uppercase', letterSpacing:'.06em'}}>
                {['ID','Nom','Type','Statut','Projet','Localisation','Conc.','Auteur','Date'].map(h => (
                  <th key={h} style={{textAlign:'left', padding:'9px 14px', fontWeight:600, borderBottom:'1px solid var(--border)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{
                  borderBottom:'1px solid var(--border)',
                  background: i === 0 ? 'var(--primary-soft)' : 'transparent',
                }}>
                  <td style={{padding:'10px 14px'}} className="mono"><span style={{color:'var(--fg-subtle)'}}>{r.id}</span></td>
                  <td style={{padding:'10px 14px', fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--primary)' : 'var(--fg)'}}>{r.name}</td>
                  <td style={{padding:'10px 14px', color:'var(--fg-muted)'}}>{r.type}</td>
                  <td style={{padding:'10px 14px'}}>
                    {statusColor(r.status) && (
                      <span style={{display:'inline-block', padding:'1px 7px', borderRadius:999, fontSize:10.5, fontWeight:600, ...statusColor(r.status), color: statusColor(r.status).fg, background: statusColor(r.status).bg}}>{r.status}</span>
                    )}
                  </td>
                  <td style={{padding:'10px 14px', color:'var(--fg-muted)'}}>{r.project}</td>
                  <td style={{padding:'10px 14px'}} className="mono"><span style={{color:'var(--fg-muted)', fontSize:11.5}}>{r.loc}</span></td>
                  <td style={{padding:'10px 14px'}} className="mono"><span style={{color:'var(--fg)', fontSize:11.5}}>{r.conc}</span></td>
                  <td style={{padding:'10px 14px', color:'var(--fg-muted)'}}>{r.user}</td>
                  <td style={{padding:'10px 14px', color:'var(--fg-subtle)', fontSize:11.5}}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// PAGE: PROTOCOLES — list + markdown reader
// ====================================================================
function PageProtocoles({ titleFont }) {
  const fontStack = '"Inter Tight", system-ui, sans-serif';
  const cats = [
    { name:'DNA / RNA',     count: 14, color:'var(--primary)' },
    { name:'Cell culture',  count: 9,  color:'var(--accent)' },
    { name:'Cloning',       count: 7,  color:'var(--success)' },
    { name:'Microscopy',    count: 5,  color:'#8b6fb5' },
    { name:'Biochemistry',  count: 7,  color:'var(--warning)' },
  ];
  const protocols = [
    { id:'PRO-0091', name:'Maxiprep — Endotoxin-free',     cat:'DNA / RNA',    time:'~4h', author:'A.R.', updated:'12 Avr', active:true },
    { id:'PRO-0088', name:'PEI transfection HEK293T',      cat:'Cell culture', time:'~30 min', author:'S.K.', updated:'08 Avr' },
    { id:'PRO-0085', name:'Q5 site-directed mutagenesis',  cat:'Cloning',      time:'~3h', author:'L.M.', updated:'02 Avr' },
    { id:'PRO-0079', name:'Western blot — anti-IL2',       cat:'Biochemistry', time:'~6h', author:'A.R.', updated:'28 Mar' },
    { id:'PRO-0072', name:'Yeast LiAc transformation',     cat:'Cloning',      time:'~5h', author:'M.B.', updated:'15 Mar' },
  ];

  return (
    <div style={{display:'grid', gridTemplateColumns:'380px 1fr', height:'100%'}}>
      {/* list */}
      <div style={{borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'16px 18px 12px', borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:16, fontWeight:600, fontFamily: titleFont, letterSpacing:'-0.01em'}}>Protocoles</div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-subtle)', marginTop:3}}>42 protocoles</div>
            </div>
            <button style={primaryBtn}><Icon d={ICONS.plus} size={12}/> Nouveau</button>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:5, marginTop:10}}>
            {cats.map(c => (
              <span key={c.name} style={{
                padding:'2px 8px', borderRadius:999, fontSize:11,
                background:`color-mix(in oklab, ${c.color} 12%, transparent)`,
                color: c.color, fontWeight:500,
                display:'inline-flex', gap:5, alignItems:'center',
              }}>
                {c.name}
                <span style={{color:'var(--fg-subtle)'}} className="mono">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{overflow:'auto'}}>
          {protocols.map(p => (
            <div key={p.id} style={{
              padding:'12px 18px', borderBottom:'1px solid var(--border)',
              cursor:'pointer',
              background: p.active ? 'var(--primary-soft)' : 'transparent',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <span className="mono" style={{fontSize:10.5, color:'var(--fg-subtle)'}}>{p.id}</span>
                <span style={{padding:'1px 7px', borderRadius:999, fontSize:10.5, background:'var(--surface-2)', color:'var(--fg-muted)'}}>{p.cat}</span>
              </div>
              <div style={{fontSize:13.5, fontWeight: p.active ? 600 : 500, color: p.active ? 'var(--primary)' : 'var(--fg)', marginBottom:4}}>
                {p.name}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10, fontSize:11, color:'var(--fg-muted)'}}>
                <span style={{display:'inline-flex', alignItems:'center', gap:4}}>⏱ {p.time}</span>
                <span>· {p.author}</span>
                <span style={{marginLeft:'auto', color:'var(--fg-subtle)'}}>{p.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* reader */}
      <div style={{display:'flex', flexDirection:'column', overflow:'auto'}}>
        <div style={{padding:'18px 28px 14px', borderBottom:'1px solid var(--border)', background:'var(--surface)'}}>
          <div className="mono" style={{fontSize:11, color:'var(--fg-subtle)', marginBottom:6}}>PRO-0091 · DNA / RNA · v3</div>
          <div style={{fontSize:22, fontWeight:600, lineHeight:1.2, fontFamily: titleFont, letterSpacing:'-0.01em'}}>
            Maxiprep — Endotoxin-free
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:8, fontSize:12, color:'var(--fg-muted)'}}>
            <span>~4h</span>·<span>par A.R.</span>·<span>mis à jour 12 Avr</span>
            <button style={{...topBtn, marginLeft:'auto'}}><Icon d={ICONS.star} size={12}/> Favori</button>
            <button style={primaryBtn}>Démarrer</button>
          </div>
        </div>
        <div style={{padding:'18px 28px', fontSize:13.5, lineHeight:1.7}}>
          <h3 style={{fontSize:13, fontWeight:600, color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px'}}>Matériel</h3>
          <ul style={{margin:'0 0 16px', paddingLeft:18, color:'var(--fg)'}}>
            <li>Macherey-Nagel NucleoBond Xtra Maxi EF kit</li>
            <li>Culture O/N en LB + Kan (50 µg/mL), 200 mL</li>
            <li>Isopropanol, EtOH 70 %, eau endo-free</li>
          </ul>

          <h3 style={{fontSize:13, fontWeight:600, color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px'}}>Procédure</h3>
          <ol style={{margin:0, paddingLeft:18, color:'var(--fg)'}}>
            <li style={{marginBottom:8}}><b>Lyse</b> — Centrifuger la culture 6,000 × g, 15 min, 4 °C. Resuspendre dans 12 mL RES-EF + RNase A.</li>
            <li style={{marginBottom:8}}><b>Précipitation</b> — Ajouter 12 mL LYS-EF, mélanger doucement, incuber 5 min RT.</li>
            <li style={{marginBottom:8}}><b>Filtration</b> — Charger sur colonne équilibrée avec EQU-EF.</li>
            <li style={{marginBottom:8}}><b>Élution</b> — 15 mL ELU-EF, précipiter avec 10.5 mL isopropanol.</li>
            <li style={{marginBottom:8}}><b>Lavage</b> — EtOH 70 %, sécher à l'air, resuspendre dans 200 µL eau endo-free.</li>
          </ol>

          <div style={{
            marginTop:18, padding:'12px 14px',
            background:'color-mix(in oklab, var(--warning) 8%, transparent)',
            borderLeft:'3px solid var(--warning)',
            borderRadius:'var(--radius)',
            fontSize:12.5, color:'var(--fg)',
          }}>
            <b style={{color:'var(--warning)'}}>⚠ Note —</b> Toujours utiliser de l'eau endo-free pour les transfections cellules primaires. Vérifier l'A260/A280 ≥ 1.8.
          </div>
        </div>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
window.PageCahier = PageCahier;
window.PageDatabase = PageDatabase;
window.PageProtocoles = PageProtocoles;
window.PageBiblio = PageBiblio;

// ----- Tree view atoms -----
function TreeNode({ level = 0, icon = 'folder', color, label, count, open: openProp = false, children }) {
  const [open, setOpen] = useStateShell(openProp);
  const indent = 8 + level * 14;
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'5px 10px 5px ' + indent + 'px',
        cursor:'pointer', fontSize:12.5, fontWeight: level === 0 ? 600 : 500,
        color: level === 0 ? 'var(--fg)' : 'var(--fg-muted)',
        borderRadius:'var(--radius)',
      }}>
        <span style={{
          display:'inline-flex', transition:'transform .15s',
          transform: open ? 'rotate(0)' : 'rotate(-90deg)',
          color:'var(--fg-subtle)',
        }}>
          <Icon d={<><path d="m6 9 6 6 6-6"/></>} size={11} stroke={2}/>
        </span>
        {icon === 'folder' && (
          <span style={{
            width:11, height:11, borderRadius:2,
            background: color || 'var(--fg-subtle)',
            opacity: open ? 1 : 0.65,
          }}/>
        )}
        {icon === 'exp' && (
          <span style={{color:'var(--fg-subtle)', display:'inline-flex'}}>
            <Icon d={<><path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3"/></>} size={12}/>
          </span>
        )}
        <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{label}</span>
        {count != null && <span className="mono" style={{fontSize:10.5, color:'var(--fg-subtle)'}}>{count}</span>}
      </div>
      {open && children}
    </div>
  );
}

function TreeLeaf({ level = 0, id, label, active }) {
  const indent = 8 + level * 14 + 16;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'5px 10px 5px ' + indent + 'px',
      cursor:'pointer', fontSize:12,
      background: active ? 'var(--primary-soft)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--fg-muted)',
      fontWeight: active ? 600 : 500,
      borderRadius:'var(--radius)',
      margin:'0 4px',
    }}>
      <span style={{
        width:5, height:5, borderRadius:'50%',
        background: active ? 'var(--primary)' : 'var(--fg-subtle)',
        opacity: active ? 1 : 0.5,
      }}/>
      <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{label}</span>
    </div>
  );
}

// shared atoms reused
const panelCard = {
  border:'1px solid var(--border)', borderRadius:'var(--radius)',
  background:'var(--surface)', padding:'12px 14px',
};
const panelTitle = {
  fontSize:10.5, fontWeight:600, color:'var(--fg-subtle)',
  textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8,
};
window.panelCard = panelCard;
window.panelTitle = panelTitle;
