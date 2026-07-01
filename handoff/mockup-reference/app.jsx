// Focus on Direction 02 (Benchling-like) only.

const { DesignCanvas, DCSection, DCArtboard } = window;
const { LabApp, LabHome } = window;
const { AppShell, PageCahier, PageDatabase, PageProtocoles, PageBiblio } = window;

const D2 = {
  id: 'd2',
  name: '02 — Benchling-like',
  tagline: 'Neutres tièdes, bleu profond + teal. Dense mais chaleureux.',
  fonts:   '"Inter Tight" + JetBrains Mono',
  titleFont: '"Inter Tight", system-ui, sans-serif',
  swatches: ['#f6f5f1', '#fffdf8', '#e3dfd3', '#1f1d18', '#1e497a', '#0d8a7a'],
  swatchesDark: ['#14130f', '#1c1b16', '#2d2c25', '#ebe7da', '#7eb1de', '#4cc4b1'],
};

function Swatches({ colors }) {
  return (
    <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
      {colors.map((c, i) => (
        <div key={i} style={{
          width: 26, height: 26, borderRadius: 6,
          background: c,
          boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .08)',
        }}/>
      ))}
    </div>
  );
}

function DirectionCover({ d }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fffdf8', padding: 32,
      display: 'flex', flexDirection: 'column', gap: 18,
      fontFamily: '"Inter Tight", system-ui, sans-serif',
      color: '#1f1d18',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#6b6657',
        textTransform: 'uppercase', letterSpacing: '.1em',
      }}>Direction</div>
      <div style={{
        fontSize: 32, fontWeight: 600, lineHeight: 1.1,
        fontFamily: d.titleFont, letterSpacing: '-0.02em',
        color: '#1e497a',
      }}>{d.name}</div>
      <div style={{ fontSize: 14, color: '#6b6657', lineHeight: 1.5, maxWidth: 360 }}>
        {d.tagline}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9684',
                      textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Light</div>
        <Swatches colors={d.swatches} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9c9684',
                      textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Dark</div>
        <Swatches colors={d.swatchesDark} />
      </div>
      <div style={{ marginTop: 'auto', fontSize: 12, color: '#6b6657', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: '#1f1d18', marginBottom: 4 }}>Type</div>
        {d.fonts}
      </div>
    </div>
  );
}

// Wrap each page in the shared AppShell with the right active route.
function ScreenHome({ dark }) {
  return <LabHome variant="d2" dark={dark} titleFont={D2.titleFont} />;
}
function ScreenCahier({ dark }) {
  return (
    <div className={`d2 ${dark ? 'dark' : 'light'}`} style={{width:'100%', height:'100%'}}>
      <AppShell active="cahier" dark={dark} titleFont={D2.titleFont}>
        <PageCahier titleFont={D2.titleFont} />
      </AppShell>
    </div>
  );
}
function ScreenDatabase({ dark }) {
  return (
    <div className={`d2 ${dark ? 'dark' : 'light'}`} style={{width:'100%', height:'100%'}}>
      <AppShell active="db" dark={dark} titleFont={D2.titleFont}>
        <PageDatabase titleFont={D2.titleFont} />
      </AppShell>
    </div>
  );
}
function ScreenProtocoles({ dark }) {
  return (
    <div className={`d2 ${dark ? 'dark' : 'light'}`} style={{width:'100%', height:'100%'}}>
      <AppShell active="proto" dark={dark} titleFont={D2.titleFont}>
        <PageProtocoles titleFont={D2.titleFont} />
      </AppShell>
    </div>
  );
}
function ScreenSample({ dark }) {
  return <LabApp variant="d2" dark={dark} titleFont={D2.titleFont} />;
}

function App() {
  return (
    <DesignCanvas
      title="HHGL — Refonte (Direction 02 · Benchling-like)"
      subtitle="Cahier · Base de données · Protocoles · Plasmid Studio · Microscopie + Outils"
      defaultZoom={0.55}
    >
      <DCSection id="overview" title="Direction 02 — Benchling-like">
        <DCArtboard id="cover" label="Cover" width={520} height={780}>
          <DirectionCover d={D2} />
        </DCArtboard>
      </DCSection>

      <DCSection id="home" title="Accueil — Launcher">
        <DCArtboard id="home-light" label="Accueil (light)" width={1280} height={780}>
          <ScreenHome dark={false} />
        </DCArtboard>
        <DCArtboard id="home-dark" label="Accueil (dark)" width={1280} height={780}>
          <ScreenHome dark={true} />
        </DCArtboard>
      </DCSection>

      <DCSection id="cahier" title="Cahier de labo">
        <DCArtboard id="cahier-light" label="Cahier (light)" width={1280} height={780}>
          <ScreenCahier dark={false} />
        </DCArtboard>
        <DCArtboard id="cahier-dark" label="Cahier (dark)" width={1280} height={780}>
          <ScreenCahier dark={true} />
        </DCArtboard>
      </DCSection>

      <DCSection id="db" title="Base de données">
        <DCArtboard id="db-light" label="Base (light)" width={1280} height={780}>
          <ScreenDatabase dark={false} />
        </DCArtboard>
        <DCArtboard id="db-dark" label="Base (dark)" width={1280} height={780}>
          <ScreenDatabase dark={true} />
        </DCArtboard>
      </DCSection>

      <DCSection id="proto" title="Protocoles">
        <DCArtboard id="proto-light" label="Protocoles (light)" width={1280} height={780}>
          <ScreenProtocoles dark={false} />
        </DCArtboard>
        <DCArtboard id="proto-dark" label="Protocoles (dark)" width={1280} height={780}>
          <ScreenProtocoles dark={true} />
        </DCArtboard>
      </DCSection>

      <DCSection id="biblio" title="Bibliographie">
        <DCArtboard id="biblio-light" label="Biblio (light)" width={1280} height={780}>
          <div className="d2 light" style={{width:'100%', height:'100%'}}>
            <AppShell active="biblio" dark={false} titleFont={D2.titleFont}>
              <PageBiblio titleFont={D2.titleFont} />
            </AppShell>
          </div>
        </DCArtboard>
        <DCArtboard id="biblio-dark" label="Biblio (dark)" width={1280} height={780}>
          <div className="d2 dark" style={{width:'100%', height:'100%'}}>
            <AppShell active="biblio" dark={true} titleFont={D2.titleFont}>
              <PageBiblio titleFont={D2.titleFont} />
            </AppShell>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="sample" title="Fiche échantillon (Plasmid Studio)">
        <DCArtboard id="sample-light" label="Fiche (light)" width={1280} height={780}>
          <ScreenSample dark={false} />
        </DCArtboard>
        <DCArtboard id="sample-dark" label="Fiche (dark)" width={1280} height={780}>
          <ScreenSample dark={true} />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
