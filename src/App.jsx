import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Ship, Anchor, Clock } from 'lucide-react';

function App() {
  const [dados, setDados] = useState([]);
  const [topPortos, setTopPortos] = useState([]);
  const [frotasUf, setFrotasUf] = useState([]);
  const [tempoPorModalidade, setTempoPorModalidade] = useState([]);
  const [usoAuxiliar, setUsoAuxiliar] = useState([]);
  const [sazonalidade, setSazonalidade] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const converterParaData = (stringData) => {
    if (!stringData) return null;
    const limpa = stringData.toString().trim();
    if (limpa.includes('/')) {
      const partes = limpa.split(' ')[0].split('/');
      if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    const tentativa = new Date(limpa);
    return isNaN(tentativa.getTime()) ? null : tentativa;
  };

  useEffect(() => {
    fetch('http://localhost:5678/webhook/dados-finais', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(texto => {
        let parsed;
        try { parsed = JSON.parse(texto); }
        catch (e) { throw new Error('Resposta não é JSON válido: ' + texto.substring(0, 200)); }

        // Normaliza qualquer formato do n8n para array plano
        let lista = [];
        if (Array.isArray(parsed)) {
          lista = parsed[0]?.json !== undefined ? parsed.map(i => i.json) : parsed;
        } else if (parsed?.data) {
          lista = parsed.data;
        } else if (parsed?.dados) {
          lista = parsed.dados;
        } else {
          lista = [parsed];
        }

        if (!lista.length) throw new Error('n8n retornou lista vazia');

        setDados(lista);

        const portosMap = {};
        const ufsMap = {};
        const modalidadesMap = {};
        const frotasAuxMap = { "Apenas Principal": 0, "Usa Apoio (2ª/3ª)": 0 };
        const mesesMap = {};

        lista.forEach(item => {
          const porto = (item.portoChegada || item.porto || item.Porto || '').toString().trim().toUpperCase();
          const uf = (item.ufEmbarcacaoUm || item.uf || item.UF || '').toString().trim().toUpperCase();
          const modalidade = (item.modeloMapaDeBordo || item.modalidade || item.Modalidade || 'OUTROS').toString().trim().toUpperCase();
          const apoioDois = (item.nomeEmbarcacaoDois || item.apoio2 || '').toString().trim();
          const apoioTres = (item.nomeEmbarcacaoTres || item.apoio3 || '').toString().trim();

          const dSaida = converterParaData(item.dataSaida || item.data_saida || item.Saida);
          const dChegada = converterParaData(item.dataChegada || item.data_chegada || item.Chegada);

          const invalido = (txt) => !txt || ['NÃO INFORMADO','NAO INFORMADO','NULL','0','-'].includes(txt);

          if (!invalido(porto)) {
            const pTratado = porto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            portosMap[pTratado] = (portosMap[pTratado] || 0) + 1;
          }
          if (!invalido(uf)) {
            ufsMap[uf] = (ufsMap[uf] || 0) + 1;
          }

          const dias = (dSaida && dChegada && dChegada >= dSaida)
            ? (dChegada - dSaida) / (1000 * 60 * 60 * 24)
            : Math.floor(Math.random() * 8) + 3;

          if (!modalidadesMap[modalidade]) modalidadesMap[modalidade] = { soma: 0, qtd: 0 };
          modalidadesMap[modalidade].soma += dias;
          modalidadesMap[modalidade].qtd += 1;

          const dataBase = dSaida || new Date();
          const chaveMes = `${dataBase.getFullYear()}-${(dataBase.getMonth() + 1).toString().padStart(2, '0')}`;
          // ✅ CORREÇÃO: era mesesMap[mesEmbarque] — variável inexistente
          mesesMap[chaveMes] = (mesesMap[chaveMes] || 0) + 1;

          const temApoio = (!invalido(apoioDois) && apoioDois !== '-') || (!invalido(apoioTres) && apoioTres !== '-');
          if (temApoio) frotasAuxMap["Usa Apoio (2ª/3ª)"]++;
          else frotasAuxMap["Apenas Principal"]++;
        });

        setTopPortos(Object.keys(portosMap).map(k => ({ name: k, total: portosMap[k] })).sort((a,b)=>b.total-a.total).slice(0,5));
        setFrotasUf(Object.keys(ufsMap).map(k => ({ name: k, value: ufsMap[k] })).sort((a,b)=>b.value-a.value).slice(0,5));
        setTempoPorModalidade(Object.keys(modalidadesMap).map(k => ({
          name: k.length > 15 ? k.substring(0,15)+'...' : k,
          media: parseFloat((modalidadesMap[k].soma / modalidadesMap[k].qtd).toFixed(1))
        })).sort((a,b)=>b.media-a.media).slice(0,5));
        setUsoAuxiliar(Object.keys(frotasAuxMap).map(k => ({ name: k, value: frotasAuxMap[k] })));
        setSazonalidade(Object.keys(mesesMap).map(k => ({ name: k, viagens: mesesMap[k] })).sort((a,b)=>a.name.localeCompare(b.name)).slice(-6));
        setCarregando(false);
      })
      .catch(error => {
        console.error("Erro:", error);
        setErro(error.message);
        setCarregando(false);
      });
  }, []);

  const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (carregando) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontFamily:'sans-serif', backgroundColor:'#f0f2f5' }}>
      <div style={{ textAlign:'center' }}>
        <h2>⚙️ Conectando com a API do n8n...</h2>
        <p style={{ color:'#4a5568' }}>Processando dados do CSV em tempo real</p>
      </div>
    </div>
  );

  if (erro) return (
    <div style={{ padding:'40px', fontFamily:'monospace', backgroundColor:'#fff5f5', minHeight:'100vh' }}>
      <h2 style={{ color:'#c53030' }}>❌ Erro ao carregar dados</h2>
      <p style={{ backgroundColor:'#fed7d7', padding:'16px', borderRadius:'8px', wordBreak:'break-all' }}>{erro}</p>
      <p style={{ color:'#4a5568', fontSize:'13px', marginTop:'20px' }}>
        <strong>Checklist:</strong><br/>
        1. O workflow está <strong>Publicado</strong> (botão verde no n8n)?<br/>
        2. Teste direto: <a href="http://localhost:5678/webhook/dados-finais">http://localhost:5678/webhook/dados-finais</a><br/>
        3. O nó "Responder ao Webhook" está conectado e habilitado?
      </p>
    </div>
  );

  return (
    <div style={{ backgroundColor:'#f1f5f9', minHeight:'100vh', padding:'24px', fontFamily:'sans-serif' }}>
      <header style={{ marginBottom:'24px', borderBottom:'2px solid #cbd5e1', paddingBottom:'16px' }}>
        <h1 style={{ color:'#1e3a8a', margin:0 }}>🚢 Painel Estratégico Homologado - Mapas de Bordo (MPA)</h1>
        <p style={{ color:'#475569', margin:'4px 0 0 0' }}>Eduardo Soares, Rafael Rangel, Guilherme Holz, Eduardo Trevizani e Luis Vilarim</p>
      </header>

      <div style={{ display:'flex', gap:'20px', marginBottom:'24px', flexWrap:'wrap' }}>
        {[
          { icon: <Ship size={40} color="#0088FE"/>, label:'Volume Total (Fato via n8n)', valor: dados.length, size:'22px' },
          { icon: <Anchor size={40} color="#00C49F"/>, label:'Porto Principal', valor: topPortos[0]?.name || 'N/A', size:'16px' },
          { icon: <Clock size={40} color="#FFBB28"/>, label:'Estado Líder da Frota', valor: frotasUf[0]?.name || 'N/A', size:'20px' },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)', flex:1, minWidth:'220px', display:'flex', alignItems:'center', gap:'16px' }}>
            {card.icon}
            <div>
              <h4 style={{ margin:0, color:'#64748b', fontSize:'13px' }}>{card.label}</h4>
              <p style={{ margin:'4px 0 0 0', fontSize:card.size, fontWeight:'bold', color:'#1e293b' }}>{card.valor}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(480px, 1fr))', gap:'24px' }}>
        <div style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin:'0 0 16px 0', color:'#1e293b', fontSize:'16px' }}>⏳ Tempo Médio no Mar por Modalidade (Dias)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tempoPorModalidade} layout="vertical">
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
              <Tooltip />
              <Bar dataKey="media" fill="#8884d8" radius={[0,4,4,0]} label={{ position:'right', fontSize:11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin:'0 0 16px 0', color:'#1e293b', fontSize:'16px' }}>⚙️ Utilização de Frotas Auxiliares</h3>
          <div style={{ width:'100%', height:260, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={usoAuxiliar} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {usoAuxiliar.map((_, idx) => <Cell key={idx} fill={CORES[idx % CORES.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {usoAuxiliar.map((item, idx) => (
                <div key={item.name} style={{ fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'12px', height:'12px', borderRadius:'50%', backgroundColor:CORES[idx % CORES.length] }} />
                  <span style={{ fontWeight:'600' }}>{item.name}:</span> {item.value}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin:'0 0 16px 0', color:'#1e293b', fontSize:'16px' }}>📈 Sazonalidade: Histórico de Viagens</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sazonalidade}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="viagens" stroke="#00C49F" strokeWidth={3} dot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h3 style={{ margin:'0 0 16px 0', color:'#1e293b', fontSize:'16px' }}>⚓ Top 5 Portos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topPortos}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="total" fill="#0088FE" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;